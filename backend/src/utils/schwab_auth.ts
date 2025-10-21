import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenData extends TokenResponse {
  expires_at: number;
}

const TOKEN_FILE_PATH = path.join(process.cwd(), '.schwab_tokens.json');

export class SchwabAuth {
  private client_id: string;
  private client_secret: string;
  private redirect_uri: string;

  constructor(client_id: string, client_secret: string, redirect_uri: string) {
    this.client_id = client_id;
    this.client_secret = client_secret;
    this.redirect_uri = redirect_uri;
  }

  get_authorization_url(): string {
    const params = new URLSearchParams({
      client_id: this.client_id,
      redirect_uri: this.redirect_uri,
      response_type: 'code'
    });
    
    return `https://api.schwabapi.com/v1/oauth/authorize?${params.toString()}`;
  }

  async exchange_code_for_tokens(code: string): Promise<TokenData> {
    const response = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirect_uri,
        client_id: this.client_id,
        client_secret: this.client_secret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token exchange failed: ${response.status} ${error}`);
    }

    const data = await response.json() as TokenResponse;
    const expires_at = Date.now() + (data.expires_in * 1000);

    return { ...data, expires_at };
  }

  async refresh_access_token(refresh_token: string): Promise<TokenData> {
    const response = await fetch('https://api.schwabapi.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: this.client_id,
        client_secret: this.client_secret
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${error}`);
    }

    const data = await response.json() as TokenResponse;
    const expires_at = Date.now() + (data.expires_in * 1000);

    return { ...data, expires_at };
  }

  save_tokens(tokens: TokenData): void {
    fs.writeFileSync(TOKEN_FILE_PATH, JSON.stringify(tokens, null, 2));
    console.log(`Tokens saved to ${TOKEN_FILE_PATH}`);
  }

  load_tokens(): TokenData | null {
    try {
      const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
      return JSON.parse(data) as TokenData;
    } catch {
      return null;
    }
  }

  async get_valid_access_token(): Promise<string> {
    const tokens = this.load_tokens();
    
    if (!tokens) {
      throw new Error('No tokens found. Run auth script first.');
    }

    if (Date.now() >= tokens.expires_at - 60000) {
      console.log('Access token expired, refreshing...');
      const new_tokens = await this.refresh_access_token(tokens.refresh_token);
      this.save_tokens(new_tokens);
      return new_tokens.access_token;
    }

    return tokens.access_token;
  }
}

async function prompt_user(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function extract_code_from_url(callback_url: string): string {
  const url = new URL(callback_url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    throw new Error('No authorization code found in callback URL');
  }
  
  return code;
}

export async function run_auth_flow(): Promise<void> {
  const client_id = process.env.SCHWAB_API_KEY || process.env.SCHWAB_CLIENT_ID;
  const client_secret = process.env.SCHWAB_API_SECRET || process.env.SCHWAB_CLIENT_SECRET;
  const redirect_uri = process.env.SCHWAB_CALLBACK_URL || process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1';

  if (!client_id || !client_secret) {
    throw new Error('SCHWAB_API_KEY and SCHWAB_API_SECRET must be set');
  }

  const auth = new SchwabAuth(client_id, client_secret, redirect_uri);

  console.log('\n=== Schwab OAuth Authentication ===\n');
  console.log('Step 1: Visit this URL in your browser:\n');
  console.log(auth.get_authorization_url());
  console.log('\nStep 2: After authorizing, you will be redirected to a URL.');
  console.log('Copy the ENTIRE callback URL and paste it below.\n');

  const callback_url = await prompt_user('Paste the callback URL here: ');
  
  try {
    const code = extract_code_from_url(callback_url);
    console.log('\nExchanging authorization code for tokens...');
    
    const tokens = await auth.exchange_code_for_tokens(code);
    auth.save_tokens(tokens);
    
    console.log('\n✅ Authentication successful!');
    console.log(`\nAccess Token: ${tokens.access_token.substring(0, 20)}...`);
    console.log(`Expires in: ${tokens.expires_in} seconds`);
    console.log('\nTokens have been saved. You can now run the main application.');
    
  } catch (error) {
    console.error('\n❌ Authentication failed:', error);
    throw error;
  }
}

