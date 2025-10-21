# Security Policy

## Security Considerations

### Environment Variables

**CRITICAL**: Never commit sensitive credentials to the repository.

#### Local Development
- Copy `backend/env.example` to `backend/.env`
- Copy `frontend/env.local.example` to `frontend/.env.local`
- Add actual credentials to these `.env` files (already gitignored)

#### Production Deployment
- **Railway**: Set environment variables in Railway dashboard under Variables tab
- **Vercel**: Set environment variables in Vercel dashboard under Project Settings > Environment Variables

### Credentials Required

#### Schwab API
- `SCHWAB_ACCESS_TOKEN`: OAuth access token from Schwab Developer Portal
- **Note**: Schwab tokens expire and require OAuth refresh flow
- **Recommendation**: Implement token refresh mechanism before production deployment

#### Supabase
- Backend uses **service key** (full access): `SUPABASE_KEY`
- Frontend uses **anon key** (RLS protected): `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Both use same `SUPABASE_URL`

### Row Level Security (RLS)

The Supabase quotes table has RLS enabled:
- Public users can READ quotes (safe for dashboard)
- Only service role can INSERT quotes (backend only)
- This prevents unauthorized data modification

### API Rate Limits

- Schwab API has rate limits - monitor usage to avoid throttling
- Current implementation: 1 request/second (3,600 requests/hour, 86,400/day)
- Review Schwab API documentation for your tier's limits

### Network Security

- Backend runs on Railway with HTTPS by default
- Frontend runs on Vercel with HTTPS by default
- Supabase enforces SSL connections

### Dependency Security

Run security audits regularly:
```bash
npm audit
npm audit fix
```

### Known Limitations

1. **Token Expiration**: Schwab access tokens expire - implement OAuth refresh flow
2. **No Authentication**: Frontend is public (add auth if needed)
3. **No Rate Limiting**: Backend has no rate limiting on Supabase inserts
4. **No Error Notifications**: Failed fetches only log to console

### Recommendations Before Production

- [ ] Implement Schwab OAuth token refresh mechanism
- [ ] Add monitoring/alerting for service failures
- [ ] Set up log aggregation (Railway logs are ephemeral)
- [ ] Consider adding authentication to frontend
- [ ] Set up database backups in Supabase
- [ ] Review and adjust Supabase RLS policies for your use case
- [ ] Add error handling for network failures
- [ ] Implement circuit breaker pattern for API failures

### Reporting Security Issues

If you discover a security vulnerability, please email the repository owner directly rather than opening a public issue.

