# Schwab OAuth Authentication Setup

This guide walks you through obtaining Schwab API credentials and authenticating your application.

## Step 1: Register Your App with Schwab

1. **Go to** [developer.schwab.com](https://developer.schwab.com)
2. **Sign up** or log in with your Schwab account
3. **Create a new app**:
   - Navigate to "My Apps" → "Create New App"
   - Fill in the required details:
     - **App Name**: k-alpha
     - **Redirect URI**: `https://127.0.0.1` (exactly as shown)
   - Save the app
4. **Save your credentials**:
   - Copy the **Client ID** (App Key)
   - Copy the **Client Secret** (Secret Key)

## Step 2: Configure Local Environment

Create `backend/.env` file with your Schwab credentials:

```bash
cd backend
cp env.example .env
```

Edit `backend/.env` and add:

```env
SCHWAB_CLIENT_ID=your_client_id_here
SCHWAB_CLIENT_SECRET=your_client_secret_here
SCHWAB_REDIRECT_URI=https://127.0.0.1
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_service_key
```

## Step 3: Run Authentication Flow

From the `backend` directory, run the authentication script:

```bash
cd backend
npm install  # if not done already
npm run auth
```

**The script will:**
1. Print an authorization URL
2. Wait for you to complete authentication
3. Ask you to paste the callback URL
4. Exchange the code for access/refresh tokens
5. Save tokens to `.schwab_tokens.json` (gitignored)

**Follow these steps:**

1. **Copy the URL** printed by the script
2. **Open it in your browser**
3. **Log in** to your Schwab account
4. **Authorize** the application
5. **You'll be redirected** to a URL that looks like:
   ```
   https://127.0.0.1/?code=XXXXX&session=YYYY
   ```
   Your browser may show a security warning (this is normal - it's localhost)
6. **Copy the entire URL** from your browser's address bar
7. **Paste it** into the terminal where the auth script is waiting
8. **Press Enter**

The script will complete and save your tokens.

## Step 4: Deploy to Railway

Once you have tokens locally and the app works, you need to set Railway environment variables:

1. Go to Railway dashboard → Your project → Variables
2. Add these variables:
   ```
   SCHWAB_CLIENT_ID=your_client_id
   SCHWAB_CLIENT_SECRET=your_client_secret
   SCHWAB_REDIRECT_URI=https://127.0.0.1
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_service_key
   ```

3. **For the initial token on Railway**, you have two options:

   **Option A - Manual token upload (simpler):**
   - After running `npm run auth` locally, you'll have `.schwab_tokens.json`
   - Copy the entire contents of this file
   - In Railway, add one more variable:
     ```
     SCHWAB_TOKENS={"access_token":"...","refresh_token":"...","expires_in":...,"token_type":"Bearer","expires_at":...}
     ```
   - Paste the entire JSON as the value

   **Option B - Run auth flow on Railway:**
   - Deploy the app first
   - Use Railway's terminal to run `npm run auth`
   - Follow the same OAuth flow

## Token Management

- **Access tokens** expire after ~30 minutes
- **Refresh tokens** are valid for 7 days
- The app **automatically refreshes** access tokens when they expire
- If refresh token expires (after 7 days), you must re-run `npm run auth`

## Troubleshooting

**"SCHWAB_CLIENT_ID and SCHWAB_CLIENT_SECRET must be set"**
- Check that your `backend/.env` file exists and contains the credentials

**"No authorization code found in callback URL"**
- Make sure you copied the ENTIRE URL from the browser, including `?code=...`

**"Token exchange failed: 401"**
- Check that your Client ID and Secret are correct
- Ensure the Redirect URI in Schwab app settings is exactly `https://127.0.0.1`

**"No tokens found. Run auth script first."**
- You need to run `npm run auth` before running the main app

## Security Notes

- ✅ `.schwab_tokens.json` is gitignored
- ✅ Never commit your Client ID/Secret
- ✅ Tokens are automatically refreshed
- ⚠️ Refresh tokens expire after 7 days - plan to re-authenticate weekly or implement a reminder

## Testing Locally

After authentication, test the app:

```bash
cd backend
npm run dev
```

You should see QQQ quotes being fetched and stored every second!

