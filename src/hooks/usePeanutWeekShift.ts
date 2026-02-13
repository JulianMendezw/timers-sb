import { useEffect, useMemo, useState } from 'react';
import { loadPeanutSchedule, getWeekMondayISO, findShiftForMonday, type PeanutSchedule } from '../utils/peanutSchedule';

export type UsePeanutWeekShift = {
  loading: boolean;
  error: string | null;
  weekMondayISO: string;
  shift: string | null;
  data: PeanutSchedule | null;
};

export function usePeanutWeekShift(now: Date = new Date()): UsePeanutWeekShift {
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [data, setData]       = useState<PeanutSchedule | null>(null);

  const weekMondayISO = useMemo(() => getWeekMondayISO(now), [now]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const json = await loadPeanutSchedule('/Peanut_test_schedule_2026.json');
        if (!alive) return;
        setData(json);
        setError(null);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? 'Unknown error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const shift = useMemo(
    () => (data ? findShiftForMonday(weekMondayISO, data) : null),
    [data, weekMondayISO]
  );

  return { loading, error, weekMondayISO, shift, data };
}
