/**
 * Production day utilities
 * 
 * The company's production day ends at 7:00 AM instead of midnight.
 * For example:
 * - 2026-02-26 at 06:30 AM belongs to production day 2026-02-25
 * - 2026-02-26 at 07:00 AM belongs to production day 2026-02-26
 */

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
  if (hours < 7) {
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
 * Create a timestamp for a specific hour on the production day.
 * 
 * @param hour - Hour in 24-hour format (0-23)
 * @param productionDayDate - The production day date (defaults to current production day)
 * @returns ISO timestamp string
 */
export function getProductionDayTimestamp(hour: number, productionDayDate: Date = getProductionDay()): string {
  const timestamp = new Date(productionDayDate);
  
  // If hour is 0-6, it's actually the next calendar day
  if (hour < 7) {
    timestamp.setDate(timestamp.getDate() + 1);
  }
  
  timestamp.setHours(hour, 0, 0, 0);
  return timestamp.toISOString();
}
