/**
 * Market hours utility for US East Coast trading hours
 * Regular hours: 9:30 AM - 4:00 PM ET (Monday-Friday)
 * Excludes major holidays
 */

// Major US market holidays (simplified list)
const MARKET_HOLIDAYS = [
  '2024-01-01', // New Year's Day
  '2024-01-15', // Martin Luther King Jr. Day
  '2024-02-19', // Presidents' Day
  '2024-03-29', // Good Friday
  '2024-05-27', // Memorial Day
  '2024-06-19', // Juneteenth
  '2024-07-04', // Independence Day
  '2024-09-02', // Labor Day
  '2024-11-28', // Thanksgiving Day
  '2024-12-25', // Christmas Day
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving Day
  '2025-12-25', // Christmas Day
];

export function isWithinMarketHours(timestamp: string | Date): boolean {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const et = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  // Check if it's a weekend
  const dayOfWeek = et.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  
  // Check if it's a holiday
  const dateStr = et.toISOString().split('T')[0];
  if (MARKET_HOLIDAYS.includes(dateStr)) {
    return false;
  }
  
  // Check if it's within trading hours (9:30 AM - 4:00 PM ET)
  const hour = et.getHours();
  const minute = et.getMinutes();
  const currentTime = hour * 60 + minute;
  const openTime = 9 * 60 + 30;  // 9:30 AM
  const closeTime = 16 * 60;     // 4:00 PM
  
  return currentTime >= openTime && currentTime < closeTime;
}

export function getSessionDate(timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const et = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return et.toISOString().split('T')[0];
}

export function filterMarketHoursData<T extends { timestamp: string; is_market_hours?: boolean }>(
  data: T[]
): T[] {
  console.log(`Filtering ${data.length} data points for market hours`);
  
  const filtered = data.filter(item => {
    // If is_market_hours is available, use it
    if (item.is_market_hours !== undefined) {
      const result = item.is_market_hours;
      console.log(`Item ${item.timestamp}: is_market_hours=${item.is_market_hours} -> ${result ? 'KEEP' : 'FILTER'}`);
      return result;
    }
    // Otherwise, calculate based on timestamp
    const result = isWithinMarketHours(item.timestamp);
    console.log(`Item ${item.timestamp}: calculated market hours=${result} -> ${result ? 'KEEP' : 'FILTER'}`);
    return result;
  });
  
  console.log(`Market hours filter result: ${filtered.length} out of ${data.length} data points kept`);
  return filtered;
}
