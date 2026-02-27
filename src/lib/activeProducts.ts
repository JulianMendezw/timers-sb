import { supabase } from './supabaseClient';

/**
 * Fetch active product item_ids from `active_products` table, ordered by sort_order.
 */
export async function fetchActiveProductIds(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('active_products').select('item_id,sort_order').eq('is_active', true).order('sort_order', { ascending: true, nullsFirst: false });
    if (error) {
      console.warn('fetchActiveProductIds error', error);
      // Log full error details for debugging
      if (error.code) console.error('Supabase error code:', error.code);
      if (error.message) console.error('Supabase error message:', error.message);
      if (error.details) console.error('Supabase error details:', error.details);
      if (error.hint) console.error('Supabase error hint:', error.hint);
      return [];
    }
    if (!data) {
      console.warn('fetchActiveProductIds: No data returned');
      return [];
    }
    return (data as any[]).map((r) => r.item_id as string).filter(Boolean);
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
    const payload = {
      item_id,
      is_active,
      updated_by: updated_by ?? null,
      updated_at: new Date().toISOString(),
    } as any;

    const { data, error } = await supabase.from('active_products').select('item_id').eq('item_id', item_id).limit(1);
    if (error) {
      console.error('setActiveProduct lookup error', error);
      throw error;
    }

    if (data && data.length > 0) {
      const { error: updateError } = await supabase.from('active_products').update(payload).eq('item_id', item_id);
      if (updateError) {
        console.error('setActiveProduct update error', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase.from('active_products').insert(payload);
      if (insertError) {
        console.error('setActiveProduct insert error', insertError);
        throw insertError;
      }
    }
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
    const payload: any = {
      item_id,
      is_active: true,
      is_available: is_available,
      updated_by: updated_by ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('active_products').select('item_id').eq('item_id', item_id).limit(1);
    if (error) {
      console.error('setAvailability lookup error', error);
      throw error;
    }

    if (data && data.length > 0) {
      const { error: updateError } = await supabase.from('active_products').update(payload).eq('item_id', item_id);
      if (updateError) {
        console.error('setAvailability update error', updateError);
        throw updateError;
      }
    } else {
      const { error: insertError } = await supabase.from('active_products').insert(payload);
      if (insertError) {
        console.error('setAvailability insert error', insertError);
        throw insertError;
      }
    }
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
    const { data, error } = await supabase.from('active_products').select('item_id,is_available');
    if (error) {
      console.warn('fetchAvailabilityMap error', error);
      return {};
    }
    const map: Record<string, boolean> = {};
    (data as any[] ?? []).forEach((r) => {
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

  // Avoid bulk upsert to keep compatibility with non-pro plans.
  const updates = item_ids.map((id, index) => (
    supabase
      .from('active_products')
      .update({ sort_order: index, updated_by: updated_by ?? null, updated_at: now })
      .eq('item_id', id)
  ));

  const results = await Promise.all(updates);
  const firstError = results.find((r) => r.error)?.error;
  if (firstError) {
    console.error('setProductOrder error', firstError);
    throw firstError;
  }
}

export default {
  fetchActiveProductIds,
  setActiveProduct,
  upsertActiveProducts,
  setProductOrder,
};
