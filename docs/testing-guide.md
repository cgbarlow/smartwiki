# SmartWiki Testing Guide

## Overview

This guide outlines the comprehensive testing strategy implemented for SmartWiki, covering unit tests, integration tests, end-to-end tests, performance testing, and security testing.

## Testing Stack

### Frontend Testing
- **Unit/Integration**: Vitest + React Testing Library
- **E2E**: Playwright
- **Coverage**: v8 provider with 90%+ targets
- **Security**: Integrated security tests

### Backend Testing
- **Unit/Integration**: Vitest + Supertest
- **Performance**: K6 load testing
- **Security**: OWASP security testing
- **Coverage**: v8 provider with 85%+ targets

## Test Types

### 1. Unit Tests

Unit tests focus on testing individual components, functions, and services in isolation.

**Location**: 
- Frontend: `src/**/*.{test,spec}.{ts,tsx}`
- Backend: `src/**/*.{test,spec}.{ts,js}`

**Coverage Targets**:
- Frontend: 90% lines, functions, statements; 85% branches
- Backend: 85% lines, functions, statements; 80% branches

**Example**:
```typescript
// Component test
import { render, screen } from '@/test/test-utils';
import { SearchBar } from './SearchBar';

test('renders search input', () => {
  render(<SearchBar onSearch={() => {}} />);
  expect(screen.getByRole('searchbox')).toBeInTheDocument();
});

// Service test
import { bedrockService } from './bedrockService';

test('generates response from prompt', async () => {
  const result = await bedrockService.generateResponse('Test prompt');
  expect(result).toBeDefined();
});
```

### 2. Integration Tests

Integration tests verify that different parts of the application work together correctly.

**Location**: `tests/integration/**/*.{test,spec}.{ts,js}`

**Features Tested**:
- API endpoints with authentication
- Database operations
- External service integrations
- Component interactions

**Example**:
```javascript
import request from 'supertest';
import { app } from '../../../backend/src/server';

test('creates document with authentication', async () => {
  const response = await request(app)
    .post('/api/documents')
    .set('Authorization', `Bearer ${authToken}`)
    .send(documentData)
    .expect(201);
});
```

### 3. End-to-End Tests

E2E tests simulate real user interactions to verify complete user workflows.

**Location**: `tests/e2e/**/*.spec.js`

**Features Tested**:
- Complete user journeys
- Cross-browser compatibility
- Responsive design
- Accessibility
- Performance thresholds

**Example**:
```javascript
import { test, expect } from '@playwright/test';

test('user can create and edit document', async ({ page }) => {
  await page.goto('/documents');
  await page.getByRole('button', { name: 'Create Document' }).click();
  await page.getByLabel('Title').fill('Test Document');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Document created')).toBeVisible();
});
```

### 4. Performance Tests

Performance tests ensure the application meets response time and scalability requirements.

**Tool**: K6 load testing framework

**Metrics Tested**:
- Response times (95th percentile < 2s)
- Throughput under load
- Error rates (< 1%)
- Concurrent user handling

**Example**:
```javascript
export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};
```

### 5. Security Tests

Security tests verify protection against common vulnerabilities and attack vectors.

**Location**: `tests/security/**/*.js`

**Vulnerabilities Tested**:
- SQL injection
- XSS attacks
- Authentication bypass
- Authorization flaws
- Rate limiting
- Input validation

**Example**:
```javascript
test('prevents XSS in document content', async () => {
  const xssPayload = '<script>alert("XSS")</script>';
  const response = await request(app)
    .post('/api/documents')
    .send({ content: xssPayload })
    .expect(201);
  
  expect(response.body.data.content).not.toContain('<script>');
});
```

## Test Configuration

### Coverage Thresholds

**Frontend (Vitest)**:
```typescript
coverage: {
  thresholds: {
    global: {
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
    },
  },
}
```

**Backend (Vitest)**:
```typescript
coverage: {
  thresholds: {
    global: {
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },
}
```

### Test Scripts

**Frontend**:
```bash
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:e2e          # End-to-end tests
npm run test:e2e:ui       # E2E with UI
npm run test:security     # Security tests
npm run test:all          # All test types
npm run test:ci           # CI pipeline tests
```

**Backend**:
```bash
npm run test              # Run unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only
npm run test:security     # Security tests
npm run test:performance  # K6 performance tests
npm run test:all          # All test types
npm run test:ci           # CI pipeline tests
```

## Test Utilities

### Frontend Test Utils (`src/test/test-utils.tsx`)

- Custom render with providers
- Mock data factories
- User event utilities
- Accessibility helpers
- Performance measurement

### Backend Test Utils (`src/test/test-utils.ts`)

- Mock Express objects
- JWT helpers
- Database utilities
- API testing helpers
- Performance measurement

## Best Practices

### Writing Tests

1. **Arrange, Act, Assert**: Structure tests clearly
2. **Descriptive names**: Test names should explain what they verify
3. **One assertion per test**: Keep tests focused
4. **Mock external dependencies**: Isolate code under test
5. **Test edge cases**: Include error conditions and boundary values

### Test Data

1. **Use factories**: Create consistent test data
2. **Avoid hard-coded values**: Use variables and constants
3. **Clean up**: Reset state between tests
4. **Realistic data**: Use data that resembles production

### Performance

1. **Set thresholds**: Define acceptable performance limits
2. **Test under load**: Verify behavior with concurrent users
3. **Monitor trends**: Track performance over time
4. **Optimize bottlenecks**: Address slow tests and code

### Security

1. **Test all inputs**: Verify input validation and sanitization
2. **Test authentication**: Verify access controls
3. **Test authorization**: Verify permission enforcement
4. **Test rate limiting**: Verify DoS protection

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      # Frontend tests
      - name: Install frontend dependencies
        run: cd frontend && npm ci
      - name: Run frontend tests
        run: cd frontend && npm run test:ci
      
      # Backend tests
      - name: Install backend dependencies
        run: cd backend && npm ci
      - name: Run backend tests
        run: cd backend && npm run test:ci
      
      # Upload coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
```

### Test Reports

- **Coverage reports**: HTML and LCOV formats
- **E2E reports**: Playwright HTML reports with screenshots
- **Performance reports**: K6 summary and trends
- **Security reports**: Vulnerability assessments

## Troubleshooting

### Common Issues

1. **Tests failing in CI but passing locally**:
   - Check environment variables
   - Verify dependencies and versions
   - Review timing-sensitive tests

2. **Low coverage warnings**:
   - Identify uncovered code paths
   - Add tests for edge cases
   - Review exclusion patterns

3. **Flaky E2E tests**:
   - Add proper waits and timeouts
   - Use data-testid selectors
   - Review page load timing

4. **Performance test failures**:
   - Check system resources
   - Verify test environment
   - Review threshold settings

### Debugging

1. **Use test debugging tools**: VS Code debugger, browser dev tools
2. **Add logging**: Temporary console.log statements
3. **Run tests in isolation**: Use `.only()` to focus on specific tests
4. **Check test setup**: Verify mocks and test data

## Maintenance

### Regular Tasks

1. **Update dependencies**: Keep testing libraries current
2. **Review coverage**: Ensure adequate test coverage
3. **Performance monitoring**: Track test execution times
4. **Security updates**: Update security testing patterns

### Continuous Improvement

1. **Monitor metrics**: Track test reliability and performance
2. **Gather feedback**: Listen to developer experience
3. **Refactor tests**: Improve test maintainability
4. **Update patterns**: Adopt new testing best practices

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [K6 Documentation](https://k6.io/docs/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)