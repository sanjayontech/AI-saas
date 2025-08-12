# Testing Documentation

This document describes the comprehensive testing strategy implemented for the AI Chatbot SaaS platform.

## Test Structure

The testing suite is organized into several categories:

### 1. Unit Tests (`/tests/**/*.simple.test.ts`, `/tests/**/*.test.ts`)
- Test individual functions, classes, and components in isolation
- Fast execution, no external dependencies
- Mock external services and database calls
- Located throughout the codebase alongside the code they test

### 2. Integration Tests (`/tests/integration/`)
- Test interactions between different components
- Test external service integrations (Google AI API, database)
- Verify data flow between services
- Use test database and mock external APIs when needed

### 3. End-to-End Tests (`/tests/e2e/`)
- Test complete user workflows from start to finish
- Simulate real user interactions with the API
- Test critical business processes
- Use test database with real data scenarios

### 4. Performance Tests (`/tests/performance/`)
- Test system performance under various loads
- Measure response times and resource usage
- Test concurrent user scenarios
- Identify performance bottlenecks

### 5. Security Tests (`/tests/security/`)
- Test authentication and authorization mechanisms
- Verify data protection and privacy controls
- Test against common security vulnerabilities
- Validate input sanitization and validation

## Running Tests

### Individual Test Categories

```bash
# Run only unit tests (default)
npm test

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Run performance tests
npm run test:performance

# Run security tests
npm run test:security

# Run all tests
npm run test:all
```

### Development Workflow

```bash
# Watch mode for unit tests during development
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# CI/CD pipeline test command
npm run test:ci
```

## Test Configuration

### Environment Setup

Tests use a separate test database configured in `.env.test`:

```env
NODE_ENV=test
DATABASE_URL=sqlite://./test.sqlite3
GOOGLE_AI_API_KEY=test-key-or-real-key-for-integration-tests
JWT_SECRET=test-jwt-secret
```

### Test Database

- Uses SQLite for fast test execution
- Database is reset before each test suite
- Migrations are run automatically
- Test data is cleaned up after each test

## Integration Test Details

### Google AI Integration (`/tests/integration/googleAI.integration.test.ts`)

Tests the integration with Google's Generative AI API:

- **Real API Tests**: Only run when `GOOGLE_AI_API_KEY` is provided
- **Response Generation**: Tests basic message processing
- **Context Handling**: Verifies conversation context is maintained
- **Error Handling**: Tests API failures and network issues
- **Performance**: Measures response times and concurrent requests

### Database Integration (`/tests/integration/database.integration.test.ts`)

Tests database operations and data integrity:

- **Model Relationships**: Tests complex queries with joins
- **Transaction Handling**: Verifies ACID properties
- **Cascade Operations**: Tests data deletion cascades
- **Performance**: Tests query performance with large datasets

### API Integration (`/tests/integration/api.integration.test.ts`)

Tests complete API workflows:

- **Authentication Flow**: Registration, login, token refresh
- **CRUD Operations**: Create, read, update, delete for all resources
- **Cross-Service Integration**: Tests data flow between services
- **Error Handling**: Tests error responses and edge cases

## End-to-End Test Details

### User Workflows (`/tests/e2e/userWorkflows.e2e.test.ts`)

Tests complete user journeys:

- **Registration to Deployment**: Complete user onboarding flow
- **Multi-User Scenarios**: Tests concurrent user interactions
- **Chatbot Lifecycle**: Creation, usage, updates, deletion
- **Error Recovery**: Tests system resilience and error handling

## Performance Test Details

### Chatbot Performance (`/tests/performance/chatbot.performance.test.ts`)

Tests system performance under load:

- **Response Times**: Measures API response times
- **Concurrent Users**: Tests multiple simultaneous conversations
- **Database Performance**: Tests query performance with large datasets
- **Memory Usage**: Monitors memory consumption and leaks

Performance Benchmarks:
- Single message response: < 5 seconds
- Concurrent conversations (5 users): < 10 seconds average
- Database queries: < 2 seconds
- Memory increase per request: < 50MB

## Security Test Details

### Authentication Security (`/tests/security/authentication.security.test.ts`)

Tests authentication and authorization security:

- **JWT Security**: Token validation, expiration, signature verification
- **Password Security**: Hashing, strength requirements, brute force protection
- **Authorization**: Access control, privilege escalation prevention
- **Input Validation**: SQL injection, XSS, NoSQL injection prevention
- **Session Management**: Session invalidation, concurrent sessions
- **Rate Limiting**: API rate limiting and abuse prevention

### Data Protection (`/tests/security/dataProtection.security.test.ts`)

Tests data privacy and protection:

- **Personal Data**: PII handling and exposure prevention
- **Data Encryption**: Password hashing and sensitive data storage
- **Access Controls**: Cross-user data access prevention
- **Data Retention**: Account deletion and data anonymization
- **Audit Trail**: Security event logging without sensitive data

## Test Data Management

### Fixtures and Mocks

- **Database Fixtures**: Reusable test data sets
- **API Mocks**: Mock external service responses
- **User Factories**: Generate test users with various configurations
- **Chatbot Templates**: Pre-configured chatbots for testing

### Data Cleanup

- Database is cleaned before each test
- Transactions are rolled back on test failure
- Memory is monitored for leaks
- External service calls are mocked to prevent side effects

## Continuous Integration

### CI Pipeline Tests

The `test:ci` command runs all test categories with:
- Coverage reporting
- No watch mode
- Sequential execution to prevent conflicts
- Detailed error reporting

### Coverage Requirements

- Minimum 80% code coverage for unit tests
- Integration tests must cover all external service interactions
- E2E tests must cover all critical user workflows
- Security tests must cover all authentication and authorization paths

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure test database is properly configured
   - Check that migrations have run successfully
   - Verify database cleanup between tests

2. **Google AI API Errors**
   - Check API key configuration
   - Verify network connectivity
   - Review rate limiting settings

3. **Performance Test Failures**
   - Check system resources during test execution
   - Verify database performance
   - Review memory usage patterns

4. **Security Test Failures**
   - Verify authentication configuration
   - Check input validation rules
   - Review access control implementation

### Debugging Tests

```bash
# Run specific test file
npx jest src/tests/integration/googleAI.integration.test.ts

# Run with verbose output
npx jest --verbose

# Run with debug information
DEBUG=* npm run test:integration
```

## Best Practices

### Writing Tests

1. **Isolation**: Each test should be independent
2. **Clarity**: Test names should describe the expected behavior
3. **Coverage**: Test both success and failure scenarios
4. **Performance**: Keep unit tests fast, integration tests focused
5. **Security**: Always test authentication and authorization

### Test Maintenance

1. **Regular Updates**: Keep tests updated with code changes
2. **Performance Monitoring**: Monitor test execution times
3. **Coverage Analysis**: Review coverage reports regularly
4. **Security Reviews**: Update security tests with new threats

### Code Quality

1. **DRY Principle**: Reuse test utilities and fixtures
2. **Clear Assertions**: Use descriptive assertion messages
3. **Error Handling**: Test error conditions thoroughly
4. **Documentation**: Document complex test scenarios