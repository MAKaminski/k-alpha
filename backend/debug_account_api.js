import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function debugAccountAPI() {
  console.log('🔍 Debugging Schwab Account API Response...');
  
  // Check what we're currently storing
  const { data: currentData, error } = await supabase
    .from('account_balances')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(1);
    
  if (error) {
    console.error('Error fetching current data:', error);
    return;
  }
  
  console.log('Current stored data:');
  console.log(JSON.stringify(currentData, null, 2));
  
  // The issue might be that the Schwab API response structure is different
  // Let's check what fields are actually available in the response
  console.log('\n🔍 Checking Schwab API response structure...');
  
  // Based on Schwab API docs, the response should have this structure:
  const mockResponse = {
    "securitiesAccount": {
      "type": "CASH",
      "accountNumber": "80423452",
      "currentBalances": {
        "liquidationValue": 100000.00,
        "equity": 100000.00,
        "availableFunds": 100000.00,
        "cashBalance": 100000.00,
        "buyingPower": 100000.00
      }
    }
  };
  
  console.log('Expected response structure:');
  console.log(JSON.stringify(mockResponse, null, 2));
  
  console.log('\n🔍 The issue might be:');
  console.log('1. API returning different field names');
  console.log('2. Account not found in response');
  console.log('3. Response structure is different than expected');
  console.log('4. Authentication issues');
  
  console.log('\n💡 Next steps:');
  console.log('1. Check Railway logs for actual API response');
  console.log('2. Verify account ID format (with/without dashes)');
  console.log('3. Check if paper account has different API behavior');
}

debugAccountAPI().catch(console.error);
