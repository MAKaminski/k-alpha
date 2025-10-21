import 'dotenv/config';
import { run_auth_flow } from './utils/schwab_auth.js';

run_auth_flow().catch((error) => {
  console.error('Auth flow failed:', error);
  process.exit(1);
});

