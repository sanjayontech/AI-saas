// Global teardown for Playwright tests
async function globalTeardown(config) {
  console.log('🧹 Starting global teardown for E2E tests...');
  
  try {
    // Clean up test data
    console.log('🗑️  Cleaning up test data...');
    
    // You could add cleanup logic here
    // For example, delete test users, reset database, etc.
    
    console.log('✅ Global teardown completed successfully');
  } catch (error) {
    console.error('❌ Global teardown failed:', error.message);
    // Don't throw error in teardown to avoid masking test failures
  }
}

module.exports = globalTeardown;