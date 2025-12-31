import { useEffect, useState } from 'react';

/**
 * Custom hook to track the current work day.
 * Work day starts at 7:00 AM and ends at 6:59:59 AM the next day.
 * Returns the work day date (adjusted date if current time is before 7am).
 */
export const useWorkDay = () => {
  const [workDate, setWorkDate] = useState<Date>(getWorkDate());

  useEffect(() => {
    // Update work date immediately
    setWorkDate(getWorkDate());

    // Set up interval to check for date changes at 7am
    const interval = setInterval(() => {
      setWorkDate(getWorkDate());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return workDate;
};

/**
 * Get the current work day date.
 * If current time is between 00:00 and 06:59:59, return yesterday's date.
 * Otherwise, return today's date.
 */
export const getWorkDate = (): Date => {
  const now = new Date();
  const hour = now.getHours();

  // If before 7am, use yesterday's date
  if (hour < 7) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }

  // Otherwise use today's date
  return now;
};

/**
 * Format a date in YYMMDD format based on work day.
 */
export const formatWorkDateYYMMDD = (date: Date = getWorkDate()): string => {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Format a date in MM/YYYY format for "best by" (current month/next year).
 * Uses work day logic.
 */
export const formatWorkDateMMYearNext = (date: Date = getWorkDate()): string => {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const nextYear = date.getFullYear() + 1;
  return `${month}/${nextYear}`;
};
