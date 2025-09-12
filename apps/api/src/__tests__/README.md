# Unit Tests with Mocked Database

This directory contains unit tests for the API service that use mocked databases instead of real database connections.

## Structure

```
src/
├── __tests__/
│   └── setup/
│       ├── database-mock.ts    # Prisma database mocking utilities
│       └── vitest.setup.ts     # Global test setup and configuration
├── sectors/
│   ├── example/
│   │   ├── __tests__/
│   │   │   └── helpers/
│   │   │       └── example-helper.test.ts  # Original helper tests (integration)
│   │   └── trpc/
│   │       └── __tests__/
│   │           └── example-controller.test.ts  # New controller unit tests
│   └── rbv/
│       └── __tests__/
│           ├── rbv.unit.test.ts          # Original integration tests
│           └── rbv-helper-unit.test.ts   # New helper unit tests with mocks
```

## Features

### Database Mocking Infrastructure
- **`database-mock.ts`**: Provides comprehensive mocking for Prisma client operations
- **Mock factories**: Helper functions to create test data for Bell Schedules, Days, Time Slots, etc.
- **Reset utilities**: Functions to clear mocks between tests

### Test Setup
- **`vitest.setup.ts`**: Configures global mocking and test environment
- **Automatic mock reset**: Database mocks are reset before each test
- **Dependency injection support**: Works with the existing Inversify container setup

### Unit Tests Created

#### 1. RBV Helper Unit Tests (`rbv-helper-unit.test.ts`)
- ✅ Tests `get_schedule` method with mocked database calls
- ✅ Tests `upsert_schedule` method for create and update operations
- ✅ Tests `delete_schedule` method 
- ✅ Error handling scenarios
- ✅ Proper mock verification and assertions

#### 2. Example Controller Tests (`example-controller.test.ts`)
- ✅ Tests controller initialization and dependency injection
- ✅ Tests tRPC router creation and endpoint availability
- ✅ Tests helper integration without complex tRPC internals

## Running Tests

```bash
# Run all unit tests (excludes integration tests)
pnpm test:unit

# Run specific unit test file
pnpm test src/path/to/test.ts

# Run with coverage
pnpm test:coverage

# Run all tests (unit + integration)
pnpm test:all
```

## Test Scripts Available

- `test:unit` - Run unit tests with mocked dependencies
- `test:watch:unit` - Watch mode for unit tests
- `test:integration` - Run integration tests with real database
- `test:coverage` - Run tests with coverage report
- `test:all` - Run both unit and integration tests

## Benefits of Mocked Unit Tests

1. **Fast execution**: No database setup or network calls required
2. **Reliable**: Tests are deterministic and don't depend on external state
3. **Isolated**: Each test runs in isolation with fresh mocks
4. **Comprehensive**: Can test error scenarios that are difficult to reproduce with real databases
5. **CI/CD friendly**: No database dependencies in test environment

## Mock Capabilities

The database mocking system supports:
- All Prisma model operations (create, read, update, delete, upsert)
- Complex include relationships
- Transaction operations
- Connection management
- Custom return values and error scenarios
- Spy/assertion capabilities for verifying calls

## Integration with Existing Tests

The new unit tests complement the existing integration tests:
- **Integration tests**: Test with real database for end-to-end scenarios
- **Unit tests**: Test business logic with mocked dependencies for speed and reliability
- Both test types can run independently or together