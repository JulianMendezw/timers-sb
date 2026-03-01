/**
 * Production day utilities
 * 
 * The company's production day ends at 7:00 AM instead of midnight.
 * For example:
 * - 2026-02-26 at 06:30 AM belongs to production day 2026-02-25
 * - 2026-02-26 at 07:00 AM belongs to production day 2026-02-26
 */

export const PRODUCTION_DAY_END_HOUR = 7;
export const SECOND_SHIFT_START_HOUR = 15;
export const THIRD_SHIFT_START_HOUR = 23;

/**
 * Get the production day date for a given timestamp.
 * If the time is before 7:00 AM, it belongs to the previous calendar day.
 * 
 * @param date - The date/time to calculate production day for (defaults to now)
 * @returns Date object representing the production day (time set to 00:00:00)
 */
export function getProductionDay(date: Date = new Date()): Date {
  const d = new Date(date);
  const hours = d.getHours();
  
  // If before 7 AM, production day is the previous calendar day
  if (hours < PRODUCTION_DAY_END_HOUR) {
    d.setDate(d.getDate() - 1);
  }
  
  // Set to midnight for consistency
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Generate a lot code in YYMMDD format for a given date.
 * 
 * @param date - The date to generate lot code for (defaults to production day of now)
 * @returns String in YYMMDD format (e.g., "260226" for Feb 26, 2026)
 */
export function getLotCode(date: Date = getProductionDay()): string {
  const year = date.getFullYear().toString().slice(-2); // Last 2 digits of year
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month 01-12
  const day = date.getDate().toString().padStart(2, '0'); // Day 01-31
  
  return `${year}${month}${day}`;
}

/**
 * Get production day ID (ISO date string) for a given date.
 * This is used as the production_day_id in the database.
 * 
 * @param date - The date/time to calculate production day for
 * @returns ISO date string (YYYY-MM-DD)
 */
export function getProductionDayId(date: Date = new Date()): string {
  const prodDay = getProductionDay(date);
  return prodDay.toISOString().slice(0, 10);
}

/**
 * Get shift number for a given timestamp.
 * 
 * Shift rules:
 * - Shift 1: 07:00 - 14:59
 * - Shift 2: 15:00 - 22:59
 * - Shift 3: 23:00 - 06:59 (crosses midnight)
 */
export function getShiftNumber(date: Date = new Date()): number {
  const hours = date.getHours();
  if (hours >= THIRD_SHIFT_START_HOUR || hours < PRODUCTION_DAY_END_HOUR) return 3;
  if (hours >= SECOND_SHIFT_START_HOUR) return 2;
  return 1;
}

export function getShiftLabel(date: Date = new Date()): string {
  return `Shift ${getShiftNumber(date)}`;
}

/**
 * Get production shift date as YYYY-MM-DD.
 * This follows production-day rules (day ends at 07:00).
 */
export function getShiftDateISO(date: Date = new Date()): string {
  return getProductionDayId(date);
}

/**
 * Compute all production day key fields for DB storage.
 */
export function getProductionDayKey(date: Date = new Date()): {
  lotCode: string;
  shiftDateISO: string;
  shiftNumber: number;
} {
  const productionDay = getProductionDay(date);
  return {
    lotCode: getLotCode(productionDay),
    shiftDateISO: productionDay.toISOString().slice(0, 10),
    shiftNumber: getShiftNumber(date),
  };
}

/**
 * Create a timestamp for a specific hour on the production day.
 * 
 * @param hour - Hour in 24-hour format (0-23)
 * @param productionDayDate - The production day date (defaults to current production day)
 * @returns ISO timestamp string
 */
export function getProductionDayTimestamp(hour: number, productionDayDate: Date = getProductionDay()): string {
  const timestamp = new Date(productionDayDate);
  
  // If hour is 0-6, it's actually the next calendar day
  if (hour < PRODUCTION_DAY_END_HOUR) {
    timestamp.setDate(timestamp.getDate() + 1);
  }
  
  timestamp.setHours(hour, 0, 0, 0);
  return timestamp.toISOString();
}
