import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'reflect-metadata';
import { Container } from 'inversify';
import { ExampleHelper, type IExampleHelper } from '../../helpers/example_helper.ts';

describe('ExampleHelper', () => {
  let container: Container;
  let helper: IExampleHelper;

  beforeEach(() => {
    container = new Container();
    container.bind<IExampleHelper>('IExampleHelper').to(ExampleHelper);
    helper = container.get('IExampleHelper');
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('generateId', () => {
    it('should generate unique IDs with correct format', () => {
      const id1 = helper.generateId();
      const id2 = helper.generateId();

      expect(id1).toMatch(/^example-\d+-[a-z0-9]{9}$/);
      expect(id2).toMatch(/^example-\d+-[a-z0-9]{9}$/);
      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with example prefix', () => {
      const id = helper.generateId();
      expect(id).toMatch(/^example-/);
    });

    it('should generate IDs with timestamp component', () => {
      const beforeTime = Date.now();
      const id = helper.generateId();
      const afterTime = Date.now();

      const timestampMatch = id.match(/^example-(\d+)-/);
      expect(timestampMatch).toBeTruthy();

      const timestamp = parseInt(timestampMatch![1]);
      expect(timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('formatTitle', () => {
    it('should format simple titles correctly', () => {
      expect(helper.formatTitle('hello world')).toBe('Hello World');
      expect(helper.formatTitle('test title')).toBe('Test Title');
    });

    it('should handle titles with extra whitespace', () => {
      expect(helper.formatTitle('  hello   world  ')).toBe('Hello World');
      expect(helper.formatTitle('   test    title   ')).toBe('Test Title');
    });

    it('should handle uppercase titles', () => {
      expect(helper.formatTitle('HELLO WORLD')).toBe('Hello World');
      expect(helper.formatTitle('TEST TITLE')).toBe('Test Title');
    });

    it('should handle mixed case titles', () => {
      expect(helper.formatTitle('hELLo WoRLd')).toBe('Hello World');
      expect(helper.formatTitle('tESt tiTLE')).toBe('Test Title');
    });

    it('should handle single word titles', () => {
      expect(helper.formatTitle('hello')).toBe('Hello');
      expect(helper.formatTitle('TEST')).toBe('Test');
      expect(helper.formatTitle('  word  ')).toBe('Word');
    });

    it('should handle empty and whitespace-only strings', () => {
      expect(helper.formatTitle('')).toBe('');
      expect(helper.formatTitle('   ')).toBe('');
    });

    it('should preserve hyphens and special characters', () => {
      expect(helper.formatTitle('hello-world')).toBe('Hello-world');
      expect(helper.formatTitle('test_title')).toBe('Test_title');
    });
  });

  describe('calculatePriority', () => {
    it('should return high priority for urgent tags', () => {
      expect(helper.calculatePriority(['urgent'])).toBe('high');
      expect(helper.calculatePriority(['urgent', 'bug'])).toBe('high');
      expect(helper.calculatePriority(['other', 'urgent', 'more'])).toBe('high');
    });

    it('should return high priority for critical tags', () => {
      expect(helper.calculatePriority(['critical'])).toBe('high');
      expect(helper.calculatePriority(['critical', 'security'])).toBe('high');
      expect(helper.calculatePriority(['bug', 'critical'])).toBe('high');
    });

    it('should return medium priority for important tags', () => {
      expect(helper.calculatePriority(['important'])).toBe('medium');
      expect(helper.calculatePriority(['important', 'enhancement'])).toBe('medium');
      expect(helper.calculatePriority(['other', 'important'])).toBe('medium');
    });

    it('should return medium priority for feature tags', () => {
      expect(helper.calculatePriority(['feature'])).toBe('medium');
      expect(helper.calculatePriority(['feature', 'new'])).toBe('medium');
      expect(helper.calculatePriority(['enhancement', 'feature'])).toBe('medium');
    });

    it('should return low priority for other tags', () => {
      expect(helper.calculatePriority(['bug'])).toBe('low');
      expect(helper.calculatePriority(['enhancement'])).toBe('low');
      expect(helper.calculatePriority(['documentation'])).toBe('low');
      expect(helper.calculatePriority(['refactor', 'cleanup'])).toBe('low');
    });

    it('should return low priority for empty tag array', () => {
      expect(helper.calculatePriority([])).toBe('low');
    });

    it('should prioritize high over medium when both are present', () => {
      expect(helper.calculatePriority(['important', 'urgent'])).toBe('high');
      expect(helper.calculatePriority(['feature', 'critical'])).toBe('high');
    });
  });

  describe('validateStatus', () => {
    it('should validate correct statuses', () => {
      expect(helper.validateStatus('draft')).toBe(true);
      expect(helper.validateStatus('active')).toBe(true);
      expect(helper.validateStatus('completed')).toBe(true);
      expect(helper.validateStatus('archived')).toBe(true);
    });

    it('should reject invalid statuses', () => {
      expect(helper.validateStatus('invalid')).toBe(false);
      expect(helper.validateStatus('pending')).toBe(false);
      expect(helper.validateStatus('in-progress')).toBe(false);
      expect(helper.validateStatus('cancelled')).toBe(false);
    });

    it('should reject empty and whitespace strings', () => {
      expect(helper.validateStatus('')).toBe(false);
      expect(helper.validateStatus('   ')).toBe(false);
    });

    it('should be case sensitive', () => {
      expect(helper.validateStatus('Draft')).toBe(false);
      expect(helper.validateStatus('ACTIVE')).toBe(false);
      expect(helper.validateStatus('Completed')).toBe(false);
      expect(helper.validateStatus('ARCHIVED')).toBe(false);
    });

    it('should reject null and undefined', () => {
      expect(helper.validateStatus(null as any)).toBe(false);
      expect(helper.validateStatus(undefined as any)).toBe(false);
    });
  });
});
