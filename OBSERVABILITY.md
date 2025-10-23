# OBSERVABILITY GUIDE

## Railway Logging Standards

This document outlines the logging standards for the k-alpha service running on Railway, helping DevOps teams understand log levels and troubleshoot issues.

## Log Levels

### ✅ INFO Level (Normal Operations)
**Color**: Green/Blue  
**When to use**: Successful operations, normal flow, status updates

**Examples**:
```json
{"message":"Stored QQQ: $604.12 (Vol: 312)","attributes":{"level":"info","service":"k-alpha","timestamp":"2025-10-23T13:17:18.175Z"}}
{"message":"Calculated indicators for QQQ: $604.12","attributes":{"level":"info","service":"k-alpha","timestamp":"2025-10-23T13:17:18.282Z"}}
{"message":"📊 Starting fetch cycle - Current rate: 24/min","attributes":{"level":"info","service":"k-alpha","timestamp":"2025-10-23T13:17:22.942Z"}}
{"message":"💰 Account 8042-3452: $100000.00 (Cash: $50000.00, Buying Power: $200000.00) - Saved to DB","attributes":{"level":"info","service":"k-alpha","timestamp":"2025-10-23T13:17:23.120Z"}}
```

**What these mean**:
- Quote data successfully stored
- Technical indicators calculated
- Service cycles starting normally
- Account balance successfully retrieved and stored

### ⚠️ WARN Level (Potential Issues)
**Color**: Yellow/Orange  
**When to use**: Recoverable issues, degraded performance, non-critical failures

**Examples**:
```json
{"message":"Rate limit approaching: 110/120 calls per minute","attributes":{"level":"warn","service":"k-alpha","timestamp":"2025-10-23T13:17:18.175Z"}}
{"message":"Market hours filter removed 50% of data points","attributes":{"level":"warn","service":"k-alpha","timestamp":"2025-10-23T13:17:18.175Z"}}
{"message":"Supabase connection retry attempt 2/3","attributes":{"level":"warn","service":"k-alpha","timestamp":"2025-10-23T13:17:18.175Z"}}
```

**What these mean**:
- API rate limits being approached
- Data filtering removing significant data
- Connection retries in progress

### ❌ ERROR Level (Critical Issues)
**Color**: Red  
**When to use**: Service failures, API errors, data corruption, authentication failures

**Examples**:
```json
{"message":"Account balance error: Schwab Account API error: 400 Bad Request","attributes":{"level":"error","service":"k-alpha","timestamp":"2025-10-23T13:17:23.120Z"}}
{"message":"Failed to insert quote data: Supabase error: connection timeout","attributes":{"level":"error","service":"k-alpha","timestamp":"2025-10-23T13:17:23.120Z"}}
{"message":"Schwab authentication failed: Invalid refresh token","attributes":{"level":"error","service":"k-alpha","timestamp":"2025-10-23T13:17:23.120Z"}}
{"message":"Database migration failed: table already exists","attributes":{"level":"error","service":"k-alpha","timestamp":"2025-10-23T13:17:23.120Z"}}
```

**What these mean**:
- External API calls failing
- Database operations failing
- Authentication issues
- Data integrity problems

## Service Components

### 1. Quote Fetching Service
- **Purpose**: Fetches real-time stock quotes from Schwab API
- **Frequency**: Every 2 seconds
- **Success Logs**: Quote storage, volume calculations
- **Error Logs**: API failures, data insertion failures

### 2. Account Balance Service
- **Purpose**: Fetches account balance data from Schwab API
- **Frequency**: Every 5 seconds
- **Success Logs**: Balance retrieval and storage
- **Error Logs**: API authentication failures, invalid account IDs

### 3. Technical Indicators Service
- **Purpose**: Calculates moving averages and technical indicators
- **Frequency**: After each quote fetch
- **Success Logs**: Indicator calculations
- **Error Logs**: Calculation failures, data corruption

### 4. Database Operations
- **Purpose**: Stores data in Supabase
- **Frequency**: Continuous
- **Success Logs**: Data insertion confirmations
- **Error Logs**: Connection failures, constraint violations

## Troubleshooting Guide

### High Error Rate
**Symptoms**: Multiple ERROR level logs
**Actions**:
1. Check API authentication tokens
2. Verify database connectivity
3. Review rate limiting status
4. Check external service status

### Account Balance Errors
**Symptoms**: `Account balance error: Schwab Account API error: 400 Bad Request`
**Common Causes**:
1. Invalid account ID format
2. Expired authentication token
3. Insufficient API permissions
4. Account not accessible via API

**Resolution Steps**:
1. Verify `SCHWAB_ACCOUNT_ID` environment variable
2. Check Schwab API authentication
3. Confirm account has API access enabled
4. Review Schwab API documentation for account endpoint

### Database Connection Issues
**Symptoms**: `Failed to insert` or `Supabase error`
**Actions**:
1. Check `SUPABASE_URL` and `SUPABASE_KEY` environment variables
2. Verify database is accessible
3. Check RLS policies
4. Review migration status

### Rate Limiting Issues
**Symptoms**: `Rate limit approaching` warnings
**Actions**:
1. Monitor API call frequency
2. Adjust fetch intervals if needed
3. Implement exponential backoff
4. Review API usage quotas

## Monitoring Recommendations

### Key Metrics to Watch
1. **Error Rate**: Should be < 1% of total logs
2. **Quote Fetch Success**: Should be > 95%
3. **Account Balance Success**: Should be > 90%
4. **Database Insert Success**: Should be > 99%

### Alert Thresholds
- **Critical**: > 5 ERROR logs in 1 minute
- **Warning**: > 10 WARN logs in 5 minutes
- **Info**: Normal operation, no action needed

### Health Check Endpoints
- Service status: Check for regular quote fetch cycles
- Database health: Monitor successful data insertions
- API health: Watch for authentication and rate limit errors

## Environment Variables

### Required for Operation
- `SCHWAB_API_KEY`: Schwab API client ID
- `SCHWAB_API_SECRET`: Schwab API client secret
- `SCHWAB_ACCOUNT_ID`: Target account ID (e.g., "8042-3452")
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service role key

### Optional Configuration
- `SCHWAB_CALLBACK_URL`: OAuth callback URL
- `QUOTE_SYMBOL`: Symbol to track (default: "QQQ")
- `FETCH_INTERVAL_MS`: Quote fetch interval (default: 2000ms)

## Common Issues and Solutions

### 1. Authentication Failures
**Error**: `Schwab authentication failed`
**Solution**: Refresh OAuth tokens, verify credentials

### 2. Account Access Denied
**Error**: `400 Bad Request` on account endpoints
**Solution**: Verify account ID, check API permissions

### 3. Database Connection Timeout
**Error**: `Supabase error: connection timeout`
**Solution**: Check network connectivity, verify Supabase status

### 4. Rate Limit Exceeded
**Error**: `Rate limit exceeded`
**Solution**: Implement backoff, reduce fetch frequency

## Log Analysis Commands

### Railway CLI
```bash
# View recent logs
railway logs --tail

# Filter by log level
railway logs --tail | grep "level.*error"

# Filter by service component
railway logs --tail | grep "Account balance"
```

### Local Development
```bash
# View all logs
npm run dev | tee logs.txt

# Filter errors only
npm run dev 2>&1 | grep -i error
```

## Contact Information

- **Service**: k-alpha
- **Environment**: Railway Production
- **Repository**: https://github.com/MAKaminski/k-alpha
- **Last Updated**: 2025-01-23
