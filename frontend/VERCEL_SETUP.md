# Vercel Deployment Setup

## Environment Variables Required

You need to set the following environment variables in your Vercel project dashboard:

### 1. VITE_SUPABASE_URL
- **Value**: Your Supabase project URL (same as SUPABASE_URL in Railway)
- **Example**: `https://your-project-id.supabase.co`

### 2. VITE_SUPABASE_ANON_KEY
- **Value**: Your Supabase anon/public key (NOT the service key)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Your Supabase project URL
   - **Environment**: Production, Preview, Development (select all)
5. Repeat for `VITE_SUPABASE_ANON_KEY`

## Important Notes

- Use the **anon key** (public key) for the frontend, NOT the service key
- The service key is only for backend operations
- Make sure to select all environments (Production, Preview, Development)
- After adding the variables, redeploy your project

## Getting Your Supabase Keys

1. Go to your Supabase project dashboard
2. Go to Settings → API
3. Copy:
   - **Project URL** → Use for `VITE_SUPABASE_URL`
   - **anon public** key → Use for `VITE_SUPABASE_ANON_KEY`
