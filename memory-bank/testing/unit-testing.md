# Unit Testing Conventions

## Overview

This document outlines the unit testing conventions for the saga-sm monorepo, maintaining consistency with the saga-soa project.

## Framework

- **Primary Framework**: Vitest (preferred for new tests)
- **Legacy Framework**: Jest (maintained for existing tests)

## File Organization

### Directory Structure

Tests are organized using the `__tests__` directory pattern:

```
src/
  __tests__/
    *.test.ts        # Simple test files
    unit/            # Unit test subdivision (for complex packages)
      *.test.ts
    integration/     # Integration test subdivision
      *.test.ts
```

### Test File Placement

- **Primary Location**: Tests go in `__tests__` directories within each module/package
- **Alternative**: Tests can be placed alongside the code they test (discouraged for consistency)

### File Naming Conventions

- Use kebab-case with `.test.ts` suffix
- Examples:
  - `user-service.test.ts`
  - `example-helper.test.ts`
  - `authentication-controller.test.ts`

## Test Configuration

### Vitest Configuration

Each package should have its own `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.spec.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/test/**', '**/__tests__/**/mocks/**'],
    },
  },
});
```

### Jest Configuration (Legacy)

For packages still using Jest, maintain `jest.config.cjs`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
};
```

## Test Organization Patterns

### Simple Packages

For straightforward packages (utilities, helpers):
```
src/
  __tests__/
    helper-function.test.ts
    utility-class.test.ts
```

### Complex Packages

For packages with multiple concerns:
```
src/
  __tests__/
    unit/
      services/
        user-service.test.ts
      controllers/
        auth-controller.test.ts
    integration/
      api-flow.test.ts
```

### API Applications

For API applications:
```
src/
  sectors/
    example/
      __tests__/
        helpers/
          example-helper.test.ts
        controllers/
          example-controller.test.ts
  __tests__/
    integration/
      api-integration.test.ts
```

## Testing Levels

1. **Unit Tests**: Test individual functions/classes in isolation
2. **Integration Tests**: Test component interactions
3. **End-to-End Tests**: Test complete user flows
4. **Performance Tests**: Test system performance characteristics

## Best Practices

1. Use descriptive test names that explain the scenario and expected outcome
2. Follow AAA pattern: Arrange, Act, Assert
3. Mock external dependencies in unit tests
4. Keep tests focused and atomic
5. Use consistent naming and organization patterns
6. Maintain test coverage reporting
7. Run tests in CI/CD pipelines

## Migration Guidelines

When moving existing tests to `__tests__` directories:
1. Preserve test functionality
2. Update import paths as needed
3. Maintain file naming conventions
4. Update test configurations to include new paths
5. Verify all tests pass after migration

## Framework Transition

When transitioning from Jest to Vitest:
1. Update configuration files
2. Verify test compatibility
3. Update package.json test scripts
4. Ensure coverage reporting works
5. Update CI/CD configurations

This convention ensures consistency across the saga-sm monorepo and maintains alignment with saga-soa testing practices.