// Global setup for Playwright tests
async function globalSetup(config) {
  console.log('🚀 Starting global setup for E2E tests...');
  
  // Setup test database
  const { execSync } = require('child_process');
  
  try {
    // Reset test database
    console.log('📊 Setting up test database...');
    execSync('cd ../../server && npm run db:reset', { stdio: 'inherit' });
    
    // Create test users and data if needed
    console.log('👤 Creating test data...');
    // You could add API calls here to create test users, chatbots, etc.
    
    console.log('✅ Global setup completed successfully');
  } catch (error) {
    console.error('❌ Global setup failed:', error.message);
    throw error;
  }
}

module.exports = globalSetup;