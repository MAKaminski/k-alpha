# Schwab API Rate Limits Documentation

## Overview
Schwab API has a **120 requests per minute** rate limit across ALL API endpoints. This is a global limit that applies to the entire API, not per endpoint.

## Rate Limit Details
- **Limit**: 120 requests per minute
- **Scope**: Global across all Schwab API endpoints
- **Reset**: Rolling 1-minute window
- **Penalty**: 429 Too Many Requests error when exceeded

## API Endpoints We Use

### 1. Market Data API
- **Base URL**: `https://api.schwabapi.com/marketdata/v1`
- **Endpoints**:
  - `GET /quotes` - Get equity quotes
  - `GET /chains` - Get options chains

### 2. Trading API (Future)
- **Base URL**: `https://api.schwabapi.com/trader/v1`
- **Endpoints**:
  - `GET /accounts` - Get account information
  - `POST /orders` - Place orders
  - `GET /orders` - Get order history

### 3. Account API (Future)
- **Base URL**: `https://api.schwabapi.com/accounts/v1`
- **Endpoints**:
  - `GET /accounts` - Get account details
  - `GET /positions` - Get positions

## Current Request Pattern

### Active Requests
| Service | Endpoint | Frequency | Requests/Min | Notes |
|---------|----------|-----------|--------------|-------|
| Quotes | `/quotes` | Every 2s | 30 | QQQ price data |
| Options | `/chains` | Every 2s (market hours only) | ~15 | 0DTE options data |
| **TOTAL** | | | **~45** | **37.5% of limit** |

### Future Requests (When Implemented)
| Service | Endpoint | Frequency | Requests/Min | Notes |
|---------|----------|-----------|--------------|-------|
| Trading | `/orders` | On-demand | Variable | Order placement |
| Account | `/accounts` | Every 5min | 12 | Account status |
| Positions | `/positions` | Every 5min | 12 | Position updates |
| **ADDITIONAL** | | | **~24** | **20% of limit** |

## Request Counting Rules

### 1. All API Calls Count
Every HTTP request to any Schwab API endpoint counts toward the 120/min limit:
- ✅ `GET /marketdata/v1/quotes`
- ✅ `GET /marketdata/v1/chains`
- ✅ `GET /trader/v1/accounts`
- ✅ `POST /trader/v1/orders`
- ✅ `GET /accounts/v1/accounts`

### 2. Authentication Calls
- Token refresh calls count toward the limit
- OAuth flow calls count toward the limit

### 3. Error Retries
- Failed requests that are retried count as separate requests
- 429 errors should NOT be retried (would cause more 429s)

## Safety Margins

### Current Implementation
- **Target Usage**: 30 requests/min (25% of limit)
- **Safety Margin**: 75% buffer
- **Monitoring**: Warnings at 50% of safe limit (15 requests/min)

### Recommended Limits
- **Maximum Safe**: 90 requests/min (75% of limit)
- **Warning Threshold**: 60 requests/min (50% of limit)
- **Critical Threshold**: 80 requests/min (67% of limit)

## Request Tracking

### Global Counter
All requests must be tracked in a single global counter that:
- Tracks requests across all services
- Resets every minute
- Provides real-time status
- Triggers warnings and blocks

### Service-Specific Tracking
Each service should also track its own requests for debugging:
- Quotes service: Track quote requests
- Options service: Track options requests
- Trading service: Track trading requests
- Account service: Track account requests

## Implementation Guidelines

### 1. Rate Limiter
- Use a single global rate limiter
- All services must use the same limiter
- Implement exponential backoff for 429 errors

### 2. Request Queuing
- Queue requests when approaching limits
- Prioritize critical requests (quotes > options > account)
- Implement request batching where possible

### 3. Monitoring
- Log all API requests with timestamps
- Monitor rate limit usage in real-time
- Alert when approaching limits

### 4. Error Handling
- Never retry 429 errors immediately
- Implement exponential backoff
- Gracefully degrade service when rate limited

## Testing Strategy

### Load Testing
- Test with maximum expected load
- Verify we stay under 120/min
- Test rate limiter behavior

### Monitoring
- Track actual request counts in production
- Monitor for unexpected spikes
- Alert on rate limit violations

## Future Considerations

### Scaling
- Consider multiple API keys if needed
- Implement request prioritization
- Add request caching where appropriate

### Optimization
- Batch requests where possible
- Cache frequently accessed data
- Reduce unnecessary API calls

## Emergency Procedures

### If Rate Limited
1. Stop all API calls immediately
2. Wait for rate limit to reset (1 minute)
3. Reduce request frequency
4. Investigate cause of spike

### Recovery
1. Implement exponential backoff
2. Reduce request frequency by 50%
3. Monitor for stability
4. Gradually increase frequency if stable

## Monitoring Dashboard

### Key Metrics
- Current requests per minute
- Requests by service
- Rate limit warnings
- 429 error count
- Average response time

### Alerts
- Warning at 60 requests/min
- Critical at 80 requests/min
- Emergency at 100 requests/min
- 429 error detection

---

**Remember**: The 120/min limit is GLOBAL across ALL Schwab API endpoints. Every request counts, regardless of which service makes it.
