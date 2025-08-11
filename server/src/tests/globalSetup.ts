import dotenv from 'dotenv';

export default async function globalSetup() {
  // Load test environment variables before any other modules
  dotenv.config({ path: '.env.test' });
  
  // Ensure NODE_ENV is set to test
  process.env.NODE_ENV = 'test';
  
  console.log('Test environment loaded:', {
    NODE_ENV: process.env.NODE_ENV,
    USE_SQLITE: process.env.USE_SQLITE,
  });
}