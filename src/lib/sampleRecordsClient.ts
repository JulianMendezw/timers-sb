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
