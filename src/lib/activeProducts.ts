import { supabase } from './supabaseClient';

type ActiveProductRow = {
  item_id: string;
  is_active?: boolean | null;
  is_available?: boolean | null;
  sort_order?: number | null;
  updated_by?: string | null;
  updated_at?: string | null;
};

function getSupabaseRestConfig() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseApiKey = import.meta.env.VITE_SUPABASE_API_KEY as string | undefined;
  if (!supabaseUrl || !supabaseApiKey) {
    throw new Error('Missing Supabase configuration');
  }
  return { supabaseUrl, supabaseApiKey };
}

function isProFeatureOnlyResponse(text: string): boolean {
  return text.toUpperCase().includes('PRO FEATURE ONLY');
}

async function readActiveProductsRows(): Promise<ActiveProductRow[]> {
  const { supabaseUrl, supabaseApiKey } = getSupabaseRestConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1/active_products`, {
    method: 'GET',
    headers: {
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText || `HTTP ${response.status}`);
  }
  if (isProFeatureOnlyResponse(text)) {
    throw new Error('PRO FEATURE ONLY');
  }

  if (!text.trim()) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? (parsed as ActiveProductRow[]) : [];
}

async function upsertActiveProductsRows(rows: ActiveProductRow[]): Promise<void> {
  if (!rows.length) return;
  const { supabaseUrl, supabaseApiKey } = getSupabaseRestConfig();
  const response = await fetch(`${supabaseUrl}/rest/v1/active_products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseApiKey,
      Authorization: `Bearer ${supabaseApiKey}`,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text || response.statusText || `HTTP ${response.status}`);
  }
  if (isProFeatureOnlyResponse(text)) {
    throw new Error('PRO FEATURE ONLY');
  }
}

/**
 * Fetch active product item_ids from `active_products` table, ordered by sort_order.
 */
export async function fetchActiveProductIds(): Promise<string[]> {
  try {
    const rows = await readActiveProductsRows();
    return rows
      .filter((r) => r.item_id && r.is_active === true)
      .sort((a, b) => {
        const aSort = a.sort_order ?? Number.MAX_SAFE_INTEGER;
        const bSort = b.sort_order ?? Number.MAX_SAFE_INTEGER;
        return aSort - bSort;
      })
      .map((r) => r.item_id);
  } catch (err) {
    console.error('fetchActiveProductIds exception', err);
    return [];
  }
}

/**
 * Upsert a single active_products row (sets is_active true/false).
 */
export async function setActiveProduct(item_id: string, is_active: boolean, updated_by?: string | null) {
  try {
    const payload: ActiveProductRow = {
      item_id,
      is_active,
      updated_by: updated_by ?? null,
      updated_at: new Date().toISOString(),
    };

    await upsertActiveProductsRows([payload]);
  } catch (err) {
    console.error('setActiveProduct exception', err);
    throw err;
  }
}

/**
 * Upsert multiple item_ids as active (bulk upsert).
 */
export async function upsertActiveProducts(item_ids: string[], updated_by?: string | null) {
  if (!item_ids || item_ids.length === 0) return;
  for (const id of item_ids) {
    // eslint-disable-next-line no-await-in-loop
    await setActiveProduct(id, true, updated_by);
  }
}

/**
 * Set availability flag for an item_id on active_products table (adds/updates row).
 */
export async function setAvailability(item_id: string, is_available: boolean, updated_by?: string | null) {
  try {
    const payload: ActiveProductRow = {
      item_id,
      is_active: true,
      is_available: is_available,
      updated_by: updated_by ?? null,
      updated_at: new Date().toISOString(),
    };

    await upsertActiveProductsRows([payload]);
  } catch (err) {
    console.error('setAvailability exception', err);
    throw err;
  }
}

/**
 * Fetch availability map for active_products rows.
 */
export async function fetchAvailabilityMap(): Promise<Record<string, boolean>> {
  try {
    const data = await readActiveProductsRows();
    const map: Record<string, boolean> = {};
    (data as ActiveProductRow[] ?? []).forEach((r) => {
      if (r?.item_id) map[r.item_id] = !!r.is_available;
    });
    return map;
  } catch (err) {
    console.error('fetchAvailabilityMap exception', err);
    return {};
  }
}

/**
 * Subscribe to availability changes on active_products table. Calls onChange(map).
 */
export function subscribeAvailability(onChange: (map: Record<string, boolean>) => void) {
  try {
    const channel = supabase
      .channel('public:active_products_availability')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_products' }, (payload: any) => {
        try {
          const recordNew = payload?.new ?? payload?.record ?? payload?.new_record;
          const recordOld = payload?.old ?? payload?.old_record;
          // fetch full map incrementally: prefer updating single entry
          if (recordNew && recordNew.item_id) {
            // call onChange with single-entry map update
            onChange({ [recordNew.item_id]: !!recordNew.is_available });
            return;
          }
          if (recordOld && recordOld.item_id) {
            onChange({ [recordOld.item_id]: !!recordOld.is_available });
            return;
          }
        } catch (err) {
          console.warn('subscribeAvailability payload handling error', err, payload);
        }
      })
      .subscribe();

    return async () => {
      try {
        // @ts-ignore
        if (typeof supabase.removeChannel === 'function') await supabase.removeChannel(channel);
        else if (channel && typeof channel.unsubscribe === 'function') await channel.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing availability channel', err);
      }
    };
  } catch (err) {
    console.warn('subscribeAvailability init error', err);
    return async () => {};
  }
}

/**
 * Subscribe to changes on `active_products` and invoke callback with latest active ids (ordered by sort_order).
 * Returns an unsubscribe function.
 */
export function subscribeActiveProducts(onChange: (activeIds: string[]) => void) {
  try {
    // initialize from server with proper ordering
    (async () => {
      try {
        const initial = await fetchActiveProductIds();
        onChange(initial);
      } catch (e) {
        console.warn('subscribeActiveProducts init fetch failed', e);
      }
    })();

    const channel = supabase
      .channel('public:active_products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'active_products' }, (payload: any) => {
        try {
          // On any change, refetch the full ordered list to maintain sort order
          (async () => {
            try {
              const updated = await fetchActiveProductIds();
              onChange(updated);
            } catch (e) {
              console.warn('subscribeActiveProducts refetch on change failed', e);
            }
          })();
        } catch (err) {
          console.warn('subscribeActiveProducts payload handling error', err, payload);
        }
      })
      .subscribe();

    return async () => {
      try {
        // cleanup subscription
        // @ts-ignore
        if (typeof supabase.removeChannel === 'function') await supabase.removeChannel(channel);
        else if (channel && typeof channel.unsubscribe === 'function') await channel.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing active_products channel', err);
      }
    };
  } catch (err) {
    console.warn('subscribeActiveProducts init error', err);
    return async () => {};
  }
}

/**
 * Set the order of active products by updating the sort_order field.
 * item_ids should be ordered as the user wants them to appear.
 */
export async function setProductOrder(item_ids: string[], updated_by?: string | null) {
  if (!item_ids || item_ids.length === 0) return;
  const now = new Date().toISOString();

  const rows: ActiveProductRow[] = item_ids.map((id, index) => ({
    item_id: id,
    sort_order: index,
    updated_by: updated_by ?? null,
    updated_at: now,
  }));

  try {
    await upsertActiveProductsRows(rows);
  } catch (error) {
    console.error('setProductOrder error', error);
    throw error;
  }
}

export default {
  fetchActiveProductIds,
  setActiveProduct,
  upsertActiveProducts,
  setProductOrder,
};
