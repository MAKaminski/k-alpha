import 'dotenv/config';
import { AccountClient } from './dist/services/account_client.js';
import { SchwabAuth } from './dist/utils/schwab_auth.js';

async function fundPaperAccount() {
  console.log('💰 Funding Paper Account with $200,000...');
  
  // Initialize auth
  const schwab_auth = new SchwabAuth(
    process.env.SCHWAB_API_KEY || process.env.SCHWAB_CLIENT_ID || '',
    process.env.SCHWAB_API_SECRET || process.env.SCHWAB_CLIENT_SECRET || '',
    process.env.SCHWAB_CALLBACK_URL || process.env.SCHWAB_REDIRECT_URI || 'https://127.0.0.1'
  );

  // Initialize account client
  const account_client = new AccountClient(
    '',
    () => schwab_auth.get_valid_access_token()
  );

  try {
    console.log('🔍 Getting valid access token...');
    const token = await schwab_auth.get_valid_access_token();
    console.log(`✅ Token obtained (length: ${token.length})`);
    
    console.log('🔍 Fetching current account balance...');
    const account_id = process.env.SCHWAB_ACCOUNT_ID || '8042-3452';
    const account_data = await account_client.fetch_account_balance(account_id);
    
    console.log('📊 Current Account Status:');
    console.log(`   Account ID: ${account_data.account_id}`);
    console.log(`   Account Type: ${account_data.account_type}`);
    console.log(`   Current Balance: $${account_data.current_balance.toFixed(2)}`);
    console.log(`   Available Cash: $${account_data.available_cash.toFixed(2)}`);
    console.log(`   Buying Power: $${account_data.buying_power.toFixed(2)}`);
    
    if (account_data.current_balance >= 200000) {
      console.log('✅ Account already has sufficient funds ($200,000+)');
      return;
    }
    
    console.log('\n⚠️  Paper Account Funding Instructions:');
    console.log('=====================================');
    console.log('Since this is a paper trading account, you need to manually fund it:');
    console.log('');
    console.log('1. Log into your Schwab account at https://client.schwab.com');
    console.log('2. Navigate to the paper trading section');
    console.log('3. Look for "Account Funding" or "Deposit Funds"');
    console.log('4. Add $200,000 to your paper trading account');
    console.log('5. The account should then show the updated balance');
    console.log('');
    console.log('Alternatively, if you have API access to fund accounts:');
    console.log('- Check Schwab API documentation for funding endpoints');
    console.log('- Some paper accounts may have automatic funding options');
    console.log('- Contact Schwab support for paper account funding assistance');
    console.log('');
    console.log('Once funded, the account balance will be updated in our system');
    console.log('and the Account Balance Widget will display the correct amount.');
    
  } catch (error) {
    console.error('❌ Error funding account:', error.message);
    console.error('Full error:', error);
  }
}

fundPaperAccount().catch(console.error);
