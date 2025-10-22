export const CONSTANTS = {
  QUOTE_SYMBOL: 'QQQ',
  FETCH_INTERVAL_MS: 5000, // 5 seconds = 12 calls/min (well below 120/min limit)
  LOG_MAX_SIZE_KB: 100,
  SCHWAB_API_BASE_URL: 'https://api.schwabapi.com/marketdata/v1',
  RATE_LIMIT_CALLS_PER_MINUTE: 120,
  SAFE_CALLS_PER_MINUTE: 30 // Use only 25% of rate limit for safety
} as const;

