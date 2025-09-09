// src/utils/timeUtils.ts

/** Normaliza 'HH:MM' a 12h con padding (01..12):(00..59) */
export const normalizeHHMM12 = (t: string) => {
  if (!t) return '12:00';
  const [hStr, mStr = '0'] = t.split(':');
  let h = parseInt(hStr, 10);
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  if (!Number.isFinite(h) || h <= 0) h = 12;          // 0/NaN -> 12
  h = ((h - 1) % 12) + 1;                              // 13->1, etc.
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

/** Minutos desde medianoche (0..1439) */
export const nowMinutes = (d = new Date()) => d.getHours() * 60 + d.getMinutes();

/** Convierte 'HH:MM' (12h) + fase AM(true)/PM(false) a minutos del día (0..1439) */
export const toMinutesOfDay = (hhmm: string, isAM: boolean) => {
  const [hStr, mStr = '0'] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const m = Math.max(0, Math.min(59, parseInt(mStr, 10) || 0));
  h = ((h % 12) + 12) % 12;                             // 12 -> 0, 1..11 -> 1..11
  const h24 = isAM ? h : h + 12;                        // AM: 0..11, PM: 12..23
  return h24 * 60 + m;
};

/** Devuelve AM(true)/PM(false) para la PRÓXIMA ocurrencia de 'HH:MM' desde ahora */
export const inferNextPhase = (hhmm: string, d = new Date()) => {
  const base = normalizeHHMM12(hhmm);
  const now = nowMinutes(d);
  const am = toMinutesOfDay(base, true);
  const pm = toMinutesOfDay(base, false);
  const deltaAM = (am - now + 1440) % 1440;
  const deltaPM = (pm - now + 1440) % 1440;
  return deltaAM <= deltaPM; // si empata, preferimos AM
};

/** Minutos hasta la próxima ocurrencia de 'HH:MM' con fase fija */
export const minutesUntilNextWithPhase = (hhmm: string, isAM: boolean, d = new Date()) => {
  const base = normalizeHHMM12(hhmm);
  const now = nowMinutes(d);
  let target = toMinutesOfDay(base, isAM);
  if (target < now) target += 1440;                    // mañana
  return target - now;                                  // [0..1439]
};

/** Suma minutos a una ocurrencia (HH:MM + fase) y devuelve nuevo HH:MM + fase */
export const addMinutesWithPhase = (hhmm: string, isAM: boolean, minutesToAdd: number) => {
  let total = toMinutesOfDay(normalizeHHMM12(hhmm), isAM) + minutesToAdd;
  total = ((total % 1440) + 1440) % 1440;
  const h24 = Math.floor(total / 60);
  const m = total % 60;
  const newIsAM = h24 < 12;
  const h12 = (h24 % 12) || 12;
  const newHHMM = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  return { newHHMM, newIsAM };
};
