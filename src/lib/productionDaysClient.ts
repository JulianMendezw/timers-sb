import { getProductionDayKey } from '../utils/productionDay';

type ResolveProductionDayResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

function fnv1a32(input: string, seed = 0): number {
  let hash = 0x811c9dc5 ^ seed;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function deterministicProductionDayUuid(shiftDateISO: string, shiftNumber: number): string {
  const key = `${shiftDateISO}|${shiftNumber}`;
  const h1 = fnv1a32(key, 1).toString(16).padStart(8, '0');
  const h2 = fnv1a32(key, 2).toString(16).padStart(8, '0');
  const h3 = fnv1a32(key, 3).toString(16).padStart(8, '0');
  const h4 = fnv1a32(key, 4).toString(16).padStart(8, '0');
  const chars = `${h1}${h2}${h3}${h4}`.split('');
  chars[12] = '4';
  chars[16] = ['8', '9', 'a', 'b'][parseInt(chars[16], 16) % 4];
  const hex = chars.join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function resolveProductionDayId(sampledAtIso: string): Promise<ResolveProductionDayResult> {
  const sampledAt = new Date(sampledAtIso);
  if (Number.isNaN(sampledAt.getTime())) {
    return { ok: false, error: `Invalid sampled_at timestamp: ${sampledAtIso}` };
  }

  const key = getProductionDayKey(sampledAt);
  const productionDayId = deterministicProductionDayUuid(key.shiftDateISO, key.shiftNumber);
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseApiKey = import.meta.env.VITE_SUPABASE_API_KEY as string | undefined;

  if (!supabaseUrl || !supabaseApiKey) {
    return { ok: false, error: 'missing Supabase config' };
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/production_days`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseApiKey,
        Authorization: `Bearer ${supabaseApiKey}`,
        Prefer: 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: productionDayId,
        lot_code: key.lotCode,
        shift_date: key.shiftDateISO,
        shift_number: key.shiftNumber,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { ok: false, error: errorBody || response.statusText || `HTTP ${response.status}` };
    }

    return { ok: true, id: productionDayId };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
