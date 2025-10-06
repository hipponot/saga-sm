# Testing Strategy and Conventions

## Overview

This directory contains the testing strategy and conventions for the saga-sm monorepo, maintaining alignment with the saga-soa project testing practices.

## Testing Workflow

Our comprehensive testing approach follows this hierarchy:

1. **Unit Tests** → Test individual components in isolation
2. **Integration Tests** → Test component interactions  
3. **End-to-End Tests** → Test complete user workflows
4. **Performance Tests** → Test system performance characteristics

## Directory Structure

```
memory-bank/
  testing/
    README.md              # This overview document
    unit-testing.md        # Unit testing conventions and patterns
    rest-api-testing.md    # API-specific testing strategies (future)
    vitest-config.md       # Vitest configuration patterns (future)
```

## Key Testing Principles

### Consistency with saga-soa
- Follow identical directory structures (`__tests__/`)
- Use same file naming conventions (kebab-case with `.test.ts`)
- Maintain compatible test organization patterns
- Use consistent framework choices (Vitest preferred, Jest legacy)

### Test Organization
- **Location**: All tests go in `__tests__` directories
- **Structure**: Organize by test type (unit, integration) for complex packages
- **Naming**: Use descriptive, kebab-case filenames
- **Coverage**: Maintain comprehensive test coverage

### Framework Standards
- **Primary**: Vitest for new test suites
- **Legacy**: Jest for existing test suites
- **Environment**: Node.js test environment
- **Reporting**: Text and HTML coverage reports

## Implementation Status

### Current State
- ✅ Memory-bank documentation created
- ✅ Unit testing conventions documented
- ✅ Existing tests migrated to `__tests__` structure
- ✅ Import paths updated for new structure

### Migration Completed
- `apps/api/src/sectors/example/helpers/example_helper.test.ts` 
  → `apps/api/src/sectors/example/__tests__/helpers/example-helper.test.ts`

### Next Steps
1. Apply `__tests__` structure to all future tests
2. Migrate any additional existing tests as they're discovered
3. Ensure test configurations include `__tests__/**/*.test.ts` patterns
4. Document API-specific testing strategies
5. Create Vitest configuration templates

## References

- [Unit Testing Conventions](./unit-testing.md) - Detailed testing patterns and practices
- [saga-soa Testing Documentation](../../saga-soa/memory-bank/testing/) - Source reference for conventions

This testing strategy ensures consistency across the saga-sm monorepo while maintaining compatibility with saga-soa project standards.