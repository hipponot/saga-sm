# RBV Test Failures Debug Analysis
**Date**: September 22, 2024
**Issue**: Intermittent failures in RBV integration tests

## Failing Tests
1. `rbv.integration.test.ts` - "request for the next week of meeting times gives alternating A and B days"
   - Error: "Failed to calculate meeting times"

2. `rbv-builder.integration.test.ts` - "builds a bell schedule from factory data"
   - Error: "Requested bell schedule not found"

## Root Causes Identified

### 1. Missing Database Cleanup in rbv-builder.integration.test.ts
**Problem**: The test file doesn't clean up the database before/after tests, unlike the other test files.
- `rbv.integration.test.ts` has: `await prisma.bellSchedule.deleteMany()` in beforeEach
- `rbv-crud.integration.test.ts` has cleanup in both beforeEach and afterEach
- `rbv-builder.integration.test.ts` has NO cleanup at all

**Impact**: When tests run in parallel or sequentially, leftover data causes conflicts.

### 2. Insufficient Error Context in calculate_meeting_times
**Location**: `rbv_helper.ts` line 683
```typescript
if (!day_object) {
  throw new Error(`Day with id ${day?.scheduleDayId} not found on the schedule`);
}
```
**Problem**: Error doesn't provide enough context about which schedule or why the day is missing.

### 3. Potential Race Condition in BellScheduleBuilder
**Location**: `rbv.builders.ts` lines 115-120
```typescript
const result = await this.rbv_helper.createCompleteSchedule(createInput);
if (!result.success) {
  throw new Error(result.message);
}
return result.data;
```
**Problem**: Creates data in transaction, then immediately fetches it back. May have timing issues.

### 4. Test Isolation Issues
- Tests use fixed IDs from factories
- No explicit waits after database operations
- No retry logic for flaky operations

## Fixes Implemented

### Fix #1: Add Database Cleanup (UPDATED)
Added proper cleanup to `rbv-builder.integration.test.ts`:
- beforeEach: Delete all bell schedules BEFORE creating container (prevents transaction conflicts)
- afterEach: Clean up after each test
- **Key Finding**: The order matters - cleanup must happen before container creation

### Fix #2: Improve Error Messages (COMPLETED)
Enhanced error messages in `rbv_helper.ts`:
- Line 684: Added schedule ID, available days, and context
- Line 652: Added logging when schedule fetch fails
- Line 661: Better message for missing rule sets
- Lines 733 & 738: Improved pattern-based rule error messages

## New Finding: The Real Root Cause
The error `Failed to update complete schedule` reveals that:
1. Tests are calling `updateCompleteSchedule` with IDs that don't exist
2. This happens when `deleteMany()` runs while another test's transaction is still in progress
3. The tests run sequentially (`concurrent: false` in vitest.config), but database transactions can overlap
4. The cleanup in `beforeEach` was happening AFTER container creation, which could leave transactions open

## Additional Fixes Applied

### Fix #3: Double Database Cleanup
Added explicit `deleteMany()` calls at the start of each test to ensure absolutely clean state:
- In `rbv-builder.integration.test.ts`: Added cleanup at start of test
- In `rbv.integration.test.ts`: Added cleanup and re-creation of schedule in the test itself

### Fix #4: Force Test Serialization
Updated `vitest.integration.config.ts` to force single-threaded execution:
- Added `pool: 'forks'` with `singleFork: true`
- This ensures tests cannot run in parallel at all

### Fix #5: Add Timing Delays
Added 100ms delays after database cleanup operations to ensure:
1. Database transactions are fully committed
2. Connection pool is reset between tests
3. No lingering locks or connections interfere

### Fix #6: Better Error Distinction
Modified error messages in `createCompleteSchedule` to clearly distinguish from `updateCompleteSchedule` errors.

**Root Cause Summary**:
The tests were running in parallel despite `concurrent: false` because Vitest can still parallelize test files. The `updateCompleteSchedule` error was from `rbv-crud.integration.test.ts` running simultaneously with the builder test, causing database conflicts.

## Fixes Deferred (Awaiting Instructions)

### Fix #3: Transaction Consistency in BellScheduleBuilder
- Add explicit await and error handling between creation and fetch
- Consider adding a small delay or verification step
- Ensure all relations are properly loaded

### Fix #4: Test Isolation Improvements
- Generate unique IDs for each test run using faker
- Add explicit waits after database operations
- Consider retry logic for flaky database operations
- Use test-specific prefixes for IDs to avoid conflicts

## Testing Strategy

### To Verify Fixes:
1. Run tests multiple times in sequence:
   ```bash
   for i in {1..10}; do
     ./scripts/run-rbv-int-tests.sh
   done
   ```

2. Run tests in parallel:
   ```bash
   pnpm test:integration --run --parallel
   ```

3. Check for specific test isolation:
   ```bash
   pnpm test:integration -t "BellScheduleBuilder"
   ```

## Additional Observations

1. **Test Script Safety**: The `run-rbv-int-tests.sh` script has excellent safety features:
   - Checks for local database only
   - Blocks cloud providers
   - Resets database before tests
   - Good timeout handling

2. **Pattern Consistency**: Most test files follow the pattern of cleanup in both beforeEach and afterEach, but rbv-builder test was missing this.

3. **Error Handling**: The RBVHelper has good transaction management but could benefit from more detailed error messages for debugging.

## Next Steps
1. Monitor test stability after fixes 1 & 2
2. If issues persist, implement fixes 3 & 4
3. Consider adding debug logging that can be enabled via environment variable
4. Add test retry mechanism in CI/CD pipeline