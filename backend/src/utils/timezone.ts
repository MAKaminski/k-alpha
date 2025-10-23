/**
 * Timezone utilities for consistent EST/EDT handling
 */

/**
 * Convert a UTC date to EST/EDT
 * @param utcDate - Date object in UTC
 * @returns Date object in EST/EDT
 */
export function utcToEST(utcDate: Date): Date {
  return new Date(utcDate.toLocaleString("en-US", { timeZone: "America/New_York" }));
}

/**
 * Convert a UTC date to EST/EDT and return as ISO string
 * @param utcDate - Date object in UTC
 * @returns ISO string in EST/EDT
 */
export function utcToESTString(utcDate: Date): string {
  const estDate = utcToEST(utcDate);
  return estDate.toISOString();
}

/**
 * Get current time in EST/EDT
 * @returns Date object in EST/EDT
 */
export function nowEST(): Date {
  return utcToEST(new Date());
}

/**
 * Format a date for display in EST/EDT
 * @param date - Date object
 * @returns Formatted string in EST/EDT
 */
export function formatEST(date: Date): string {
  return date.toLocaleString("en-US", { 
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

/**
 * Check if a date is within market hours (EST/EDT)
 * @param date - Date object
 * @returns boolean
 */
export function isWithinMarketHours(date: Date): boolean {
  const estDate = utcToEST(date);
  const dayOfWeek = estDate.getDay();
  
  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  const hours = estDate.getHours();
  const minutes = estDate.getMinutes();
  const currentTime = hours * 60 + minutes;
  
  // Market hours: 9:30 AM - 4:00 PM EST/EDT
  const openTime = 9 * 60 + 30;  // 9:30 AM
  const closeTime = 16 * 60;     // 4:00 PM
  
  return currentTime >= openTime && currentTime < closeTime;
}
