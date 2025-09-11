export type ScheduleEntry = {
  date: string;
  month?: string;
  monthNum?: number;
  day?: number;
  shift: string;
};

export type PeanutSchedule = {
  version: number;
  year: number;
  generatedAt: string;
  entries: ScheduleEntry[];
  byDate?: Record<string, string>;
};

/** Compute the Monday (local time) for the week that contains `d`. */
export function getWeekMondayISO(d: Date = new Date()): string {
  const dt = new Date(d);
  const day = dt.getDay();            // 0=Sun..6=Sat
  const diffToMonday = (day + 6) % 7; // Mon=0 .. Sun=6
  dt.setDate(dt.getDate() - diffToMonday);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

/** Find the shift for a given Monday ISO date. Prefers byDate, falls back to entries. */
export function findShiftForMonday(weekMondayISO: string, data: PeanutSchedule): string | null {
  if (data.byDate && data.byDate[weekMondayISO]) return data.byDate[weekMondayISO];

  const found = data.entries?.find(e => e.date === weekMondayISO);
  return found?.shift ?? null;
}

/** Load the schedule JSON from /public. */
export async function loadPeanutSchedule(url = '/Peanut_test_schedule_2025.json'): Promise<PeanutSchedule> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load schedule: ${res.status}`);
  return res.json() as Promise<PeanutSchedule>;
}
