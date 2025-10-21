# K-Alpha

Real-time equity data service that downloads QQQ quotes from Schwab API every second and stores them in Supabase.

## Architecture

- **Railway**: Backend service (TypeScript/Node.js) continuously fetches QQQ quotes
- **Supabase**: PostgreSQL database for storing quote data
- **Vercel**: Frontend (Next.js) for visualizing real-time quotes

## Setup

### 1. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migration in `supabase/migrations/001_create_quotes_table.sql` via the Supabase SQL Editor
3. Note your project URL and anon key

### 2. Schwab API Setup

1. Create a Schwab developer account at [developer.schwab.com](https://developer.schwab.com)
2. Create an app and obtain your API credentials
3. Get an access token (refer to Schwab API documentation for OAuth flow)

### 3. Environment Variables Setup

**IMPORTANT**: For security, environment variables are NOT stored in the application code.

#### Local Development (in application)
```bash
# Backend - create backend/.env
cd backend
cp env.example .env
# Edit .env and add your actual credentials

# Frontend - create frontend/.env.local
cd frontend
cp env.local.example .env.local
# Edit .env.local and add your actual credentials
```

#### Production (must be set in platform dashboards)
- **Railway**: Go to your project → Variables tab → Add each variable
  - `SCHWAB_ACCESS_TOKEN`
  - `SUPABASE_URL`
  - `SUPABASE_KEY` (use service key, not anon key)
  
- **Vercel**: Go to your project → Settings → Environment Variables → Add each variable
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (use anon key, not service key)

### 4. GitHub Setup

1. Create a new repository on GitHub
2. Push this code:
   ```bash
   git remote add origin https://github.com/yourusername/k-alpha.git
   git branch -M main
   git push -u origin main
   ```

### 5. Backend Deployment (Railway)

1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub repo
3. Select your k-alpha repository
4. Set root directory to `backend`
5. Add environment variables (see section 3 above)
6. Deploy

### 6. Frontend Deployment (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. New Project → Import from GitHub
3. Select your k-alpha repository
4. Set root directory to `frontend`
5. Framework preset: Next.js (auto-detected)
6. Add environment variables (see section 3 above)
7. Deploy

## Local Development

### Backend

```bash
cd backend
npm install
cp .env.example .env  # Fill in your credentials
npm run dev
```

### Frontend

```bash
cd frontend
npm install
# Create .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=your_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
npm run dev
```

## Project Structure

```
k-alpha/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── constants.ts      # Configuration constants
│   │   ├── services/
│   │   │   ├── schwab_client.ts  # Schwab API client
│   │   │   └── supabase_client.ts # Supabase client
│   │   ├── utils/
│   │   │   └── logger.ts         # Minimal logging
│   │   └── main.ts               # Service entry point
│   ├── railway.json
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx          # Main dashboard
│   │   └── lib/
│   │       └── supabase.ts       # Supabase client
│   ├── vercel.json
│   └── package.json
└── supabase/
    └── migrations/
        └── 001_create_quotes_table.sql
```

## Features

- Fetches QQQ quotes every second from Schwab API
- Stores quotes in Supabase with full bid/ask/last/volume data
- Real-time dashboard with live updates via Supabase subscriptions
- Interactive price chart showing last 100 quotes
- Minimal logging (max 100KB)
- TypeScript throughout

