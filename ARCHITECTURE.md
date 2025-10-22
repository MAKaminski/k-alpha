# K-Alpha Trading Dashboard Architecture

## Database Architecture

### Supabase Limitations
- **Row Limit**: Supabase JavaScript client has a default limit of 1000 rows per query
- **Performance**: Large datasets should be aggregated to reduce query size
- **Real-time**: Real-time subscriptions work best with smaller datasets

### Data Flow
1. **Raw Data**: `indicators` table stores all tick data
2. **Aggregated Data**: `chart_data` table stores time-aggregated data for display
3. **Frontend**: Fetches aggregated data (≤1000 rows) for charting

## Chart Data Strategy

### Problem
- Raw `indicators` table can have 10,000+ records per day
- Supabase limit prevents fetching all data in single query
- Pagination causes performance issues and chart rendering problems

### Solution
- Aggregate raw data into time buckets (e.g., 1-minute intervals)
- Store aggregated data in separate table
- Frontend queries aggregated table (≤1000 rows)
- Real-time updates append to both raw and aggregated tables

### Tables
- `indicators`: Raw tick data (high volume)
- `chart_data`: Aggregated data for charting (low volume)
- `options`: Options chain data

## Implementation Notes
- Always keep query results under 1000 rows
- Use aggregation for time-series charts
- Maintain real-time capabilities with smaller datasets
