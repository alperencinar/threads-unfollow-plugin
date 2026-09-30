export type CircuitBreakerState = 'CLOSED' | 'OPEN';

export class SafetyCircuitBreaker {
  private failureCount = 0;
  private state: CircuitBreakerState = 'CLOSED';

  constructor(private readonly failureThreshold: number = 2) {}

  public recordSuccess(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  public recordFailure(statusCode: number): void {
    if (statusCode === 429 || statusCode === 403 || statusCode === 400) {
      this.failureCount++;
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
    }
  }

  public isOpen(): boolean {
    return this.state === 'OPEN';
  }

  public reset(): void {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  /**
   * Generates a randomized human jitter delay.
   */
  public static async jitter(minMs = 2500, maxMs = 5500): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
