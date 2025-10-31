# LinkUup Testing Framework Guide

## Overview

This document provides a comprehensive guide to the testing framework implemented for the LinkUup project. The testing framework includes unit tests, integration tests, and end-to-end tests for both the backend (FastAPI) and frontend (React) components.

## Testing Architecture

### Backend Testing (FastAPI + PostgreSQL)
- **Framework**: pytest with pytest-asyncio
- **Database**: SQLite test database with fixtures
- **Coverage**: pytest-cov for code coverage
- **Mocking**: factory-boy for test data generation
- **HTTP Testing**: httpx for async HTTP client testing

### Frontend Testing (React + TypeScript)
- **Unit Tests**: Vitest with React Testing Library
- **E2E Tests**: Playwright for browser automation
- **Mocking**: MSW (Mock Service Worker) for API mocking
- **Coverage**: Vitest coverage reporting

## Quick Start

### Run All Tests
```bash
# Run all tests (backend + frontend + e2e)
./scripts/run-tests.sh

# Run with coverage
./scripts/run-tests.sh --coverage

# Run only backend tests
./scripts/run-tests.sh --backend-only

# Run only frontend tests
./scripts/run-tests.sh --frontend-only

# Run only E2E tests
./scripts/run-tests.sh --e2e-only
```

### Individual Test Commands

#### Backend Tests
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v --cov=. --cov-report=html
```

#### Frontend Tests
```bash
cd frontend
npm ci
npm run test:run
npm run test:coverage
```

#### End-to-End Tests
```bash
cd frontend
npx playwright install --with-deps
npm run test:e2e
```

## Test Structure

### Backend Tests (`backend/tests/`)

```
backend/tests/
├── __init__.py
├── conftest.py              # Pytest configuration and fixtures
├── test_auth.py            # Authentication tests
├── test_places.py          # Places/Salons tests
├── test_services.py        # Services tests
├── test_bookings.py        # Bookings tests
└── test_integration.py     # Integration tests
```

#### Key Features:
- **Database Fixtures**: Automatic test database setup/teardown
- **Authentication Fixtures**: Pre-authenticated user setup
- **API Testing**: Complete endpoint testing with status codes
- **Data Validation**: Input validation and error handling tests
- **Coverage**: 80%+ code coverage requirement

### Frontend Tests (`frontend/src/test/`)

```
frontend/src/test/
├── setup.ts                # Test setup and configuration
├── utils/
│   └── test-utils.tsx      # Custom render function with providers
├── mocks/
│   ├── server.ts           # MSW server setup
│   └── handlers.ts         # API mock handlers
├── components/
│   ├── Header.test.tsx     # Header component tests
│   └── SalonCard.test.tsx  # SalonCard component tests
├── pages/
│   └── HomePage.test.tsx   # Page component tests
├── hooks/
│   └── useAuth.test.ts     # Custom hook tests
└── e2e/
    ├── homepage.spec.ts    # Homepage E2E tests
    └── booking.spec.ts     # Booking flow E2E tests
```

#### Key Features:
- **Component Testing**: React Testing Library for component behavior
- **Hook Testing**: Custom hook testing with renderHook
- **API Mocking**: MSW for realistic API responses
- **E2E Testing**: Playwright for complete user workflows
- **Responsive Testing**: Mobile and desktop viewport testing

## Test Categories

### 1. Unit Tests
- **Backend**: Individual function and class testing
- **Frontend**: Component rendering and behavior testing
- **Coverage**: 80%+ code coverage requirement

### 2. Integration Tests
- **API Endpoints**: Complete request/response cycle testing
- **Database Operations**: CRUD operations with real database
- **Authentication Flow**: Login, registration, and token management

### 3. End-to-End Tests
- **User Workflows**: Complete user journeys
- **Cross-Browser**: Chrome, Firefox, Safari testing
- **Mobile Testing**: Responsive design validation

## Test Data Management

### Backend Test Data
- **Fixtures**: Predefined test data in `conftest.py`
- **Factory Boy**: Dynamic test data generation
- **Database Isolation**: Each test gets a fresh database

### Frontend Test Data
- **MSW Handlers**: Mock API responses
- **Test Utilities**: Reusable test data and helpers
- **Component Props**: Realistic prop data for components

## Coverage Requirements

### Backend Coverage
- **Minimum**: 80% code coverage
- **Critical Paths**: 95% coverage for authentication and booking logic
- **Reports**: HTML and terminal coverage reports

### Frontend Coverage
- **Minimum**: 80% code coverage
- **Components**: All components must be tested
- **Hooks**: All custom hooks must be tested

## CI/CD Integration

### GitHub Actions Workflow
- **Backend Tests**: Python 3.11, PostgreSQL service
- **Frontend Tests**: Node.js 18, npm caching
- **E2E Tests**: Playwright with multiple browsers
- **Security Tests**: Dependency vulnerability scanning
- **Performance Tests**: Load testing and performance validation

### Test Reports
- **Coverage Reports**: HTML coverage reports uploaded as artifacts
- **Test Results**: JUnit XML reports for test results
- **E2E Reports**: Playwright HTML reports with screenshots

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names should describe the behavior
3. **Single Responsibility**: One test per behavior
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include error conditions and boundary cases

### Test Maintenance
1. **Keep Tests Fast**: Unit tests should run quickly
2. **Independent Tests**: Tests should not depend on each other
3. **Clean Up**: Remove unused test data and mocks
4. **Update Tests**: Keep tests in sync with code changes

### Debugging Tests
1. **Verbose Output**: Use `-v` flag for detailed output
2. **Debug Mode**: Use `--pdb` for Python debugging
3. **Screenshots**: E2E tests capture screenshots on failure
4. **Logs**: Check test logs for detailed error information

## Common Issues and Solutions

### Backend Issues
- **Database Conflicts**: Use test database isolation
- **Authentication**: Use fixture-based authentication
- **Async Operations**: Use pytest-asyncio for async tests

### Frontend Issues
- **Component Rendering**: Use custom render function with providers
- **API Mocking**: Ensure MSW handlers match API endpoints
- **E2E Flakiness**: Use proper waits and selectors

### Performance Issues
- **Slow Tests**: Optimize database operations and API calls
- **Memory Leaks**: Clean up resources in test teardown
- **Parallel Execution**: Use parallel test execution where possible

## Advanced Usage

### Custom Test Fixtures
```python
# backend/tests/conftest.py
@pytest.fixture
def sample_booking_data():
    return {
        "customer_name": "Test Customer",
        "customer_email": "customer@test.com",
        "service_id": 1,
        "booking_date": "2024-12-25",
        "booking_time": "10:00:00"
    }
```

### Custom Test Utilities
```typescript
// frontend/src/test/utils/test-utils.tsx
export const renderWithProviders = (ui: ReactElement) => {
  return render(ui, { wrapper: AllTheProviders })
}
```

### E2E Test Helpers
```typescript
// frontend/src/test/e2e/helpers.ts
export const loginUser = async (page: Page) => {
  await page.goto('/login')
  await page.fill('[data-testid="email"]', 'test@example.com')
  await page.fill('[data-testid="password"]', 'password123')
  await page.click('[data-testid="login-button"]')
}
```

## Monitoring and Reporting

### Test Metrics
- **Pass Rate**: Percentage of passing tests
- **Coverage**: Code coverage percentage
- **Performance**: Test execution time
- **Flakiness**: Test reliability metrics

### Reports and Dashboards
- **Coverage Reports**: HTML coverage reports
- **Test Results**: JUnit XML reports
- **E2E Reports**: Playwright HTML reports
- **CI/CD Status**: GitHub Actions status badges

## Conclusion

The LinkUup testing framework provides comprehensive coverage for both backend and frontend components. With proper test organization, fixtures, and CI/CD integration, the framework ensures code quality and reliability throughout the development process.

For questions or issues with the testing framework, please refer to the project documentation or create an issue in the repository.
