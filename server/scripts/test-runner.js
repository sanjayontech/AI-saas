#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const testSuites = {
  unit: {
    command: 'npm run test:unit',
    description: 'Run unit tests (fast, isolated tests)'
  },
  integration: {
    command: 'npm run test:integration',
    description: 'Run integration tests (external service interactions)'
  },
  e2e: {
    command: 'npm run test:e2e',
    description: 'Run end-to-end tests (complete user workflows)'
  },
  performance: {
    command: 'npm run test:performance',
    description: 'Run performance tests (load and stress testing)'
  },
  security: {
    command: 'npm run test:security',
    description: 'Run security tests (authentication and data protection)'
  },
  all: {
    command: 'npm run test:all',
    description: 'Run all test suites'
  },
  coverage: {
    command: 'npm run test:coverage',
    description: 'Run all tests with coverage report'
  },
  ci: {
    command: 'npm run test:ci',
    description: 'Run tests in CI mode (no watch, with coverage)'
  }
};

function showHelp() {
  console.log('\n🧪 AI Chatbot SaaS Test Runner\n');
  console.log('Usage: node scripts/test-runner.js [suite] [options]\n');
  console.log('Available test suites:\n');
  
  Object.entries(testSuites).forEach(([name, config]) => {
    console.log(`  ${name.padEnd(12)} - ${config.description}`);
  });
  
  console.log('\nOptions:');
  console.log('  --help, -h   Show this help message');
  console.log('  --verbose    Run with verbose output');
  console.log('  --watch      Run in watch mode (unit tests only)');
  console.log('\nExamples:');
  console.log('  node scripts/test-runner.js unit');
  console.log('  node scripts/test-runner.js integration --verbose');
  console.log('  node scripts/test-runner.js all');
  console.log('  node scripts/test-runner.js --help\n');
}

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🚀 Running: ${command}\n`);
    
    const [cmd, ...args] = command.split(' ');
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd(),
      ...options
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log(`\n✅ Command completed successfully\n`);
        resolve(code);
      } else {
        console.log(`\n❌ Command failed with exit code ${code}\n`);
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ Error running command: ${error.message}\n`);
      reject(error);
    });
  });
}

async function runTestSuite(suiteName, options = {}) {
  const suite = testSuites[suiteName];
  
  if (!suite) {
    console.error(`\n❌ Unknown test suite: ${suiteName}\n`);
    showHelp();
    process.exit(1);
  }
  
  let command = suite.command;
  
  // Add options to command
  if (options.verbose) {
    command += ' --verbose';
  }
  
  if (options.watch && suiteName === 'unit') {
    command = 'npm run test:watch';
  }
  
  try {
    console.log(`\n📋 Test Suite: ${suiteName}`);
    console.log(`📝 Description: ${suite.description}`);
    
    // Check if we need to set up test environment
    if (['integration', 'e2e', 'performance', 'security'].includes(suiteName)) {
      console.log('\n⚙️  Setting up test environment...');
      await runCommand('npm run db:reset');
    }
    
    const startTime = Date.now();
    await runCommand(command);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n🎉 Test suite '${suiteName}' completed successfully in ${duration}s\n`);
    
  } catch (error) {
    console.error(`\n💥 Test suite '${suiteName}' failed: ${error.message}\n`);
    process.exit(1);
  }
}

async function runMultipleSuites(suites, options = {}) {
  console.log(`\n🔄 Running multiple test suites: ${suites.join(', ')}\n`);
  
  const results = [];
  
  for (const suite of suites) {
    try {
      await runTestSuite(suite, options);
      results.push({ suite, status: 'passed' });
    } catch (error) {
      results.push({ suite, status: 'failed', error: error.message });
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:\n');
  results.forEach(({ suite, status, error }) => {
    const icon = status === 'passed' ? '✅' : '❌';
    console.log(`  ${icon} ${suite}: ${status}`);
    if (error) {
      console.log(`     Error: ${error}`);
    }
  });
  
  const failed = results.filter(r => r.status === 'failed');
  if (failed.length > 0) {
    console.log(`\n❌ ${failed.length} test suite(s) failed\n`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All ${results.length} test suite(s) passed!\n`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  verbose: args.includes('--verbose'),
  watch: args.includes('--watch'),
  help: args.includes('--help') || args.includes('-h')
};

const suiteArgs = args.filter(arg => !arg.startsWith('--') && arg !== '-h');

// Main execution
async function main() {
  if (options.help || args.length === 0) {
    showHelp();
    return;
  }
  
  // Special handling for multiple suites
  if (suiteArgs.length > 1) {
    await runMultipleSuites(suiteArgs, options);
    return;
  }
  
  const suiteName = suiteArgs[0];
  
  // Special case for running all suites sequentially with better reporting
  if (suiteName === 'all') {
    const allSuites = ['unit', 'integration', 'e2e', 'performance', 'security'];
    await runMultipleSuites(allSuites, options);
    return;
  }
  
  await runTestSuite(suiteName, options);
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Test execution interrupted by user\n');
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log('\n\n⚠️  Test execution terminated\n');
  process.exit(143);
});

// Run the main function
main().catch((error) => {
  console.error(`\n💥 Unexpected error: ${error.message}\n`);
  process.exit(1);
});