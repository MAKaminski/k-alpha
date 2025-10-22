import 'dotenv/config';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test.supabase.co';
process.env.SUPABASE_KEY = process.env.SUPABASE_KEY || 'test-key';
process.env.SCHWAB_CLIENT_ID = process.env.SCHWAB_CLIENT_ID || 'test-client-id';
process.env.SCHWAB_CLIENT_SECRET = process.env.SCHWAB_CLIENT_SECRET || 'test-client-secret';
