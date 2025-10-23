import * as fs from 'fs';
import * as path from 'path';

const TOKEN_FILE_PATH = path.join(process.cwd(), '.schwab_tokens.json');
const PAPER_TOKEN_FILE_PATH = path.join(process.cwd(), '.schwab_paper_tokens.json');

// Check if we're in paper trading mode
const isPaperTrading = process.env.SCHWAB_PAPER === 'true';
const tokenPath = isPaperTrading ? PAPER_TOKEN_FILE_PATH : TOKEN_FILE_PATH;
const envVarName = isPaperTrading ? 'SCHWAB_PAPER_TOKENS' : 'SCHWAB_TOKENS';
const envType = isPaperTrading ? 'PAPER' : 'LIVE';

try {
  const data = fs.readFileSync(tokenPath, 'utf-8');
  const tokens = JSON.parse(data);
  
  console.log(`\n=== Railway Environment Variable (${envType} TRADING) ===\n`);
  console.log('Add this to your Railway project variables:\n');
  console.log(`Variable Name: ${envVarName}`);
  console.log('Variable Value (copy everything below):\n');
  console.log(JSON.stringify(tokens));
  console.log('\n');
  
} catch (error) {
  console.error(`Error: Could not read ${tokenPath}`);
  console.error(`Make sure you have run "npm run auth" first with ${envType.toLowerCase()} trading credentials`);
  process.exit(1);
}

