# Deployment Guide

## ✅ Completed

- [x] Git repository initialized
- [x] Security audit completed (0 vulnerabilities)
- [x] SECURITY.md created with best practices
- [x] GitHub Actions workflow for automated security audits
- [x] All code committed to git

## 📋 Next Steps

### 1. Push to GitHub

```bash
# Create a new repository on GitHub (don't initialize with README)
# Then run:

cd /Users/makaminski1337/Developer/k-alpha
git remote add origin https://github.com/YOUR_USERNAME/k-alpha.git
git push -u origin main
```

### 2. Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once created, go to SQL Editor
3. Copy contents of `supabase/migrations/001_create_quotes_table.sql`
4. Paste and run in SQL Editor
5. Go to Settings → API to get:
   - Project URL (for `SUPABASE_URL`)
   - `anon` `public` key (for frontend `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - `service_role` `secret` key (for backend `SUPABASE_KEY`)

### 3. Get Schwab API Credentials

1. Go to [developer.schwab.com](https://developer.schwab.com)
2. Create an app
3. Complete OAuth flow to get access token
4. Note: Tokens expire - you'll need to implement refresh logic for production

### 4. Deploy Backend to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `k-alpha` repository
4. Configure:
   - Root Directory: `backend`
   - Click "Add Variables" and add:
     ```
     SCHWAB_ACCESS_TOKEN=<your_token>
     SUPABASE_URL=<your_supabase_url>
     SUPABASE_KEY=<your_supabase_service_key>
     ```
5. Click "Deploy"

### 5. Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import your `k-alpha` repository
4. Configure:
   - Root Directory: `frontend`
   - Framework Preset: Next.js (should auto-detect)
5. Click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
   ```
6. Click "Deploy"

## 🔐 Environment Variables Reference

### Local Development (In Application)

Create these files locally (they're gitignored):

**backend/.env**
```bash
SCHWAB_ACCESS_TOKEN=your_token_here
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=your_service_role_key_here
```

**frontend/.env.local**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### Production (Platform Dashboards Only)

Never commit production credentials - set them in:
- **Railway Dashboard**: Project → Variables tab
- **Vercel Dashboard**: Project → Settings → Environment Variables

## 🧪 Testing Locally

```bash
# Terminal 1 - Backend
cd backend
npm install
cp env.example .env
# Edit .env with your credentials
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
cp env.local.example .env.local
# Edit .env.local with your credentials
npm run dev
```

Frontend will be at `http://localhost:3000`

## ✨ What Gets Deployed

- **Railway**: Runs `backend/src/main.ts` continuously, fetching QQQ quotes every second
- **Vercel**: Hosts `frontend` as a static Next.js app with real-time Supabase subscriptions
- **Supabase**: PostgreSQL database storing all quotes with RLS enabled

Your dashboard will update in real-time as new quotes arrive!

