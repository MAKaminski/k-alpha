# Vercel Deployment Setup (Next.js)

## Environment Variables Required

You need to set the following environment variables in your Vercel project dashboard:

### 1. NEXT_PUBLIC_SUPABASE_URL
- **Value**: Your Supabase project URL (same as SUPABASE_URL in Railway)
- **Example**: `https://your-project-id.supabase.co`

### 2. NEXT_PUBLIC_SUPABASE_ANON_KEY
- **Value**: Your Supabase anon/public key (NOT the service key)
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## How to Set Environment Variables in Vercel

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable:
   - **Name**: `NEXT_PUBLIC_SUPABASE_URL`
   - **Value**: Your Supabase project URL
   - **Environment**: Production, Preview, Development (select all)
5. Repeat for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Important Notes

- Use the **anon key** (public key) for the frontend, NOT the service key
- The service key is only for backend operations
- Make sure to select all environments (Production, Preview, Development)
- After adding the variables, redeploy your project
- Next.js automatically makes `NEXT_PUBLIC_*` variables available in the browser

## Getting Your Supabase Keys

1. Go to your Supabase project dashboard
2. Go to Settings → API
3. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Current Values (from your .env file)
- NEXT_PUBLIC_SUPABASE_URL: `https://uylrjohqqvqniuiugjgm.supabase.co`
- NEXT_PUBLIC_SUPABASE_ANON_KEY: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5bHJqb2hxcXZxbml1aXVnamdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTc0NTAsImV4cCI6MjA3NjYzMzQ1MH0.yG9IfjTzyJo_SPhkt24RRlSWIOBFNqoTjHQRcNz0gEg`
