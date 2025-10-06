# Testing Guide for saga-sm

This project has a comprehensive testing setup with both unit tests (mocked dependencies) and integration tests (real databases).

## Test Types

### 🚀 Unit Tests (Fast, Isolated)
- **Location**: `apps/api/src/**/*.test.ts` (excluding integration tests)
- **Database**: Mocked with Vitest  
- **Speed**: ~500ms
- **Purpose**: Test business logic without external dependencies

### 🎯 Integration Tests (Real Database)  
- **Location**: `apps/api/src/**/*.integration.test.ts`
- **Database**: Real PostgreSQL + MongoDB via Docker
- **Speed**: ~600ms
- **Purpose**: Test full database interactions end-to-end

## Quick Start

### 1. Setup Test Environment (First Time)
```bash
# From project root
./scripts/setup-test-env.sh

# Or from API directory  
cd apps/api && pnpm test:setup
```

### 2. Run Tests
```bash
cd apps/api

# Run only unit tests (no database needed)
pnpm test:unit

# Run only integration tests (requires database)
pnpm test:integration  

# Run all tests
pnpm test:all

# Watch mode for development
pnpm test:watch:unit      # Unit tests only
pnpm test:watch          # All tests
```

## Available Test Scripts

| Script | Description | Database Required |
|--------|-------------|-------------------|
| `pnpm test:setup` | Setup test environment with databases | ❌ |
| `pnpm test:unit` | Run unit tests with mocked DB | ❌ |
| `pnpm test:integration` | Run integration tests | ✅ |
| `pnpm test:all` | Run both unit + integration tests | ✅ |  
| `pnpm test:watch:unit` | Watch unit tests | ❌ |
| `pnpm test:coverage` | Generate coverage report | ❌ |

## Test Environment Setup

### Manual Database Setup
```bash
# Start databases
docker compose up -d postgres mongodb redis

# Setup schema (from packages/database)
DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm" \
  npx prisma db push --schema ./prisma/schema.prisma --accept-data-loss
```

### Automated Setup (Recommended)
```bash
# Run the setup script
./scripts/setup-test-env.sh
```

## Database Configuration

### PostgreSQL (Integration Tests)
- **Host**: `localhost:5432` 
- **Database**: `saga_sm`
- **User**: `saga_user`
- **Password**: `password123`

### MongoDB (Future Integration Tests)
- **Host**: `localhost:27017`
- **Database**: `saga_sm`
- **User**: `admin`
- **Password**: `password123`

## Writing Tests

### Unit Tests (Mocked Database)
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockPrisma } from '@tests/setup/database-mock'

describe('MyService', () => {
    beforeEach(() => {
        // Mocks are automatically reset
    })

    it('should create user', async () => {
        const mockUser = { id: '1', name: 'Test' }
        mockPrisma.user.create.mockResolvedValue(mockUser)

        const result = await myService.createUser({ name: 'Test' })
        
        expect(result).toEqual(mockUser)
        expect(mockPrisma.user.create).toHaveBeenCalledWith({
            data: { name: 'Test' }
        })
    })
})
```

### Integration Tests (Real Database)
```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { prisma } from '@repo/db'

describe('MyService Integration', () => {
    beforeEach(async () => {
        // Clean database before each test
        await prisma.user.deleteMany()
    })

    it('should create user in database', async () => {
        const result = await myService.createUser({ name: 'Test' })
        
        const dbUser = await prisma.user.findUnique({
            where: { id: result.id }
        })
        
        expect(dbUser).toEqual(expect.objectContaining({
            name: 'Test'
        }))
    })
})
```

## Troubleshooting

### Database Connection Issues
```bash
# Check if databases are running
docker compose ps

# Restart databases
docker compose restart postgres mongodb redis

# Check database logs
docker logs saga-sm-postgres
docker logs saga-sm-mongodb
```

### Schema Issues
```bash
# Reset database schema
cd packages/database
DATABASE_URL="postgresql://saga_user:password123@localhost:5432/saga_sm" \
  npx prisma db push --schema ./prisma/schema.prisma --force-reset
```

### Test Failures
1. **Unit tests failing**: Check if mocks are properly configured in `src/__tests__/setup/`
2. **Integration tests failing**: Ensure databases are running and schema is applied
3. **Connection errors**: Verify environment variables and database credentials

## CI/CD Integration

### Unit Tests (Fast Pipeline)
```yaml
- name: Run Unit Tests
  run: |
    cd apps/api
    pnpm test:unit
```

### Integration Tests (Full Pipeline)
```yaml
- name: Setup Database
  run: |
    docker compose up -d postgres mongodb redis
    ./scripts/setup-test-env.sh
    
- name: Run All Tests  
  run: |
    cd apps/api
    pnpm test:all
```

## Performance

### Test Execution Times
- **Unit Tests**: ~500ms (37 tests)
- **Integration Tests**: ~600ms (7 tests)  
- **All Tests**: ~1.1s (44 tests)

### Coverage
Run `pnpm test:coverage` to generate coverage reports in:
- `apps/api/coverage/` (HTML reports)

## Best Practices

1. **Write unit tests first** - Faster feedback loop during development
2. **Use integration tests for critical paths** - Database operations, API endpoints
3. **Clean database between integration tests** - Avoid test pollution
4. **Mock external services** - Keep tests fast and reliable
5. **Use descriptive test names** - Make failures easy to understand

---

For more details on the testing infrastructure, see `apps/api/src/__tests__/README.md`.