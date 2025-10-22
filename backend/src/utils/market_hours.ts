/**
 * Market hours utility for US East Coast trading hours
 * Regular hours: 9:30 AM - 4:00 PM ET (Monday-Friday)
 * Excludes major holidays
 */

interface MarketHours {
  isOpen: boolean;
  sessionStart: Date | null;
  nextOpen: Date | null;
  nextClose: Date | null;
}

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

export function isMarketOpen(date: Date = new Date()): MarketHours {
  const now = new Date(date);
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  
  // Check if it's a weekend
  const dayOfWeek = et.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      isOpen: false,
      sessionStart: null,
      nextOpen: getNextMarketOpen(et),
      nextClose: null
    };
  }
  
  // Check if it's a holiday
  const dateStr = et.toISOString().split('T')[0];
  if (MARKET_HOLIDAYS.includes(dateStr)) {
    return {
      isOpen: false,
      sessionStart: null,
      nextOpen: getNextMarketOpen(et),
      nextClose: null
    };
  }
  
  // Check if it's within trading hours (9:30 AM - 4:00 PM ET)
  const hour = et.getHours();
  const minute = et.getMinutes();
  const currentTime = hour * 60 + minute;
  const openTime = 9 * 60 + 30;  // 9:30 AM
  const closeTime = 16 * 60;     // 4:00 PM
  
  if (currentTime >= openTime && currentTime < closeTime) {
    // Market is open - calculate session start
    const sessionStart = new Date(et);
    sessionStart.setHours(9, 30, 0, 0);
    
    return {
      isOpen: true,
      sessionStart: sessionStart,
      nextOpen: null,
      nextClose: getMarketClose(et)
    };
  } else {
    return {
      isOpen: false,
      sessionStart: null,
      nextOpen: getNextMarketOpen(et),
      nextClose: null
    };
  }
}

function getNextMarketOpen(date: Date): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(9, 30, 0, 0);
  
  // Check if next day is a weekend or holiday
  const dayOfWeek = next.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Skip to Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
    next.setDate(next.getDate() + daysUntilMonday);
  }
  
  // Check if it's a holiday
  let dateStr = next.toISOString().split('T')[0];
  while (MARKET_HOLIDAYS.includes(dateStr)) {
    next.setDate(next.getDate() + 1);
    dateStr = next.toISOString().split('T')[0];
  }
  
  return next;
}

function getMarketClose(date: Date): Date {
  const close = new Date(date);
  close.setHours(16, 0, 0, 0);
  return close;
}

export function getSessionDate(date: Date = new Date()): string {
  const et = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return et.toISOString().split('T')[0];
}

export function isWithinMarketHours(date: Date = new Date()): boolean {
  return isMarketOpen(date).isOpen;
}
