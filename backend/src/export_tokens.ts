import * as fs from 'fs';
import * as path from 'path';

const TOKEN_FILE_PATH = path.join(process.cwd(), '.schwab_tokens.json');

try {
  const data = fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
  const tokens = JSON.parse(data);
  
  console.log('\n=== Railway Environment Variable ===\n');
  console.log('Add this to your Railway project variables:\n');
  console.log('Variable Name: SCHWAB_TOKENS');
  console.log('Variable Value (copy everything below):\n');
  console.log(JSON.stringify(tokens));
  console.log('\n');
  
} catch (error) {
  console.error('Error: Could not read .schwab_tokens.json');
  console.error('Make sure you have run "npm run auth" first');
  process.exit(1);
}

