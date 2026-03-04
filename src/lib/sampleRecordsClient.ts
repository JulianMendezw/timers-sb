import { supabase } from './supabaseClient';

export type SampleRecordRow = {
  id?: string | number | null;
  sampled_at?: string | null;
  created_at?: string | null;
  extra_product?: string | null;
  notes?: unknown;
};

export async function insertSampleRecord(payload: Record<string, unknown>): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseApiKey = import.meta.env.VITE_SUPABASE_API_KEY as string | undefined;

  if (!supabaseUrl || !supabaseApiKey) {
    return { ok: false, error: 'missing Supabase config' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/sample_records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        ok: false,
        error: errorBody || response.statusText || `HTTP ${response.status}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

export async function fetchLatestSampleRecord(): Promise<SampleRecordRow | null> {
  try {
    const { data, error } = await supabase
      .from('sample_records')
      .select('id,sampled_at,created_at,extra_product,notes')
      .order('sampled_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('fetchLatestSampleRecord error', error);
      return null;
    }

    return (data as SampleRecordRow | null) ?? null;
  } catch (error) {
    console.warn('fetchLatestSampleRecord exception', error);
    return null;
  }
}

export function subscribeSampleRecords(onChange: (row: SampleRecordRow | null) => void) {
  try {
    void (async () => {
      const latest = await fetchLatestSampleRecord();
      onChange(latest);
    })();

    const channel = supabase
      .channel('public:sample_records_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sample_records' }, (payload: any) => {
        const record = payload?.new ?? payload?.record;
        if (record) {
          onChange(record as SampleRecordRow);
          return;
        }

        void (async () => {
          const latest = await fetchLatestSampleRecord();
          onChange(latest);
        })();
      })
      .subscribe();

    return async () => {
      try {
        // @ts-ignore
        if (typeof supabase.removeChannel === 'function') await supabase.removeChannel(channel);
        else if (channel && typeof channel.unsubscribe === 'function') await channel.unsubscribe();
      } catch (err) {
        console.warn('Error unsubscribing sample_records channel', err);
      }
    };
  } catch (err) {
    console.warn('subscribeSampleRecords init error', err);
    return async () => {};
  }
}
