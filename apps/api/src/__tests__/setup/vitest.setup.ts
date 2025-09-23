import { vi, beforeEach } from "vitest";
import "reflect-metadata";
import { mockPrisma, resetDatabaseMocks } from "./database-mock";

// Mock the database module
vi.mock("@repo/db", () => ({
  prisma: mockPrisma,
}));

// Global test setup
beforeEach(() => {
  // Reset all database mocks before each test
  resetDatabaseMocks();

  // Reset any other global state if needed
  vi.clearAllTimers();
});

// Mock console methods if needed for cleaner test output
const mockConsole = {
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Export mock console for tests that need to verify logging
export { mockConsole };
