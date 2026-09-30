import { describe, it, expect } from 'vitest';
import { SafetyCircuitBreaker } from '../../src/domain/services/SafetyCircuitBreaker';

describe('SafetyCircuitBreaker', () => {
  it('starts in CLOSED state', () => {
    const breaker = new SafetyCircuitBreaker(2);
    expect(breaker.isOpen()).toBe(false);
  });

  it('trips to OPEN state after reaching failure threshold for 429', () => {
    const breaker = new SafetyCircuitBreaker(2);
    breaker.recordFailure(429);
    expect(breaker.isOpen()).toBe(false);

    breaker.recordFailure(429);
    expect(breaker.isOpen()).toBe(true);
  });

  it('resets to CLOSED upon recordSuccess or reset call', () => {
    const breaker = new SafetyCircuitBreaker(2);
    breaker.recordFailure(429);
    breaker.recordFailure(429);
    expect(breaker.isOpen()).toBe(true);

    breaker.recordSuccess();
    expect(breaker.isOpen()).toBe(false);
  });

  it('ignores non-fatal status codes like 200 or 404', () => {
    const breaker = new SafetyCircuitBreaker(2);
    breaker.recordFailure(200);
    breaker.recordFailure(404);
    expect(breaker.isOpen()).toBe(false);
  });
});
