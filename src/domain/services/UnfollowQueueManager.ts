import { SocialUser } from '../entities';
import { SafetyCircuitBreaker } from './SafetyCircuitBreaker';

export type QueueStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPED'
  | 'COMPLETED'
  | 'RATE_LIMITED';

export interface QueueProgress {
  status: QueueStatus;
  total: number;
  completed: number;
  currentUser: SocialUser | null;
  countdownSeconds: number;
  error: string | null;
}

export interface UnfollowResult {
  success: boolean;
  status?: number;
  isRateLimit?: boolean;
  error?: string;
}

export type UnfollowExecutor = (user: SocialUser) => Promise<UnfollowResult>;

export interface QueueOptions {
  maxQuota?: number;
  minJitterSec?: number;
  maxJitterSec?: number;
}

export class UnfollowQueueManager {
  private queue: SocialUser[] = [];
  private currentIndex = 0;
  private status: QueueStatus = 'IDLE';
  private completed = 0;
  private currentUser: SocialUser | null = null;
  private countdownSeconds = 0;
  private error: string | null = null;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private listeners: Array<(progress: QueueProgress) => void> = [];

  constructor(
    private readonly executor: UnfollowExecutor,
    private readonly circuitBreaker: SafetyCircuitBreaker = new SafetyCircuitBreaker(1)
  ) {}

  public onProgress(listener: (progress: QueueProgress) => void): () => void {
    this.listeners.push(listener);
    listener(this.getProgress());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getProgress(): QueueProgress {
    return {
      status: this.status,
      total: this.queue.length,
      completed: this.completed,
      currentUser: this.currentUser,
      countdownSeconds: this.countdownSeconds,
      error: this.error,
    };
  }

  private notify(): void {
    const progress = this.getProgress();
    for (const listener of this.listeners) {
      try {
        listener(progress);
      } catch {}
    }
  }

  public start(users: ReadonlyArray<SocialUser>, options: QueueOptions = {}): void {
    if (this.status === 'RUNNING') return;

    const maxQuota = options.maxQuota ?? 25;
    // Cap total queue at maxQuota for safe session limits
    this.queue = users.slice(0, maxQuota);
    this.currentIndex = 0;
    this.completed = 0;
    this.error = null;
    this.status = 'RUNNING';
    this.notify();

    if (this.queue.length === 0) {
      this.status = 'COMPLETED';
      this.notify();
      return;
    }

    this.processNext(options);
  }

  public pause(): void {
    if (this.status !== 'RUNNING') return;
    this.status = 'PAUSED';
    this.clearTimer();
    this.notify();
  }

  public resume(options: QueueOptions = {}): void {
    if (this.status !== 'PAUSED') return;
    this.status = 'RUNNING';
    this.notify();
    this.processNext(options);
  }

  public stop(): void {
    this.status = 'STOPPED';
    this.clearTimer();
    this.currentUser = null;
    this.countdownSeconds = 0;
    this.notify();
  }

  private clearTimer(): void {
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private async processNext(options: QueueOptions): Promise<void> {
    if (this.status !== 'RUNNING') return;

    if (this.circuitBreaker.isOpen()) {
      this.status = 'RATE_LIMITED';
      this.error = 'Circuit breaker open due to rate limit';
      this.notify();
      return;
    }

    if (this.currentIndex >= this.queue.length) {
      this.status = 'COMPLETED';
      this.currentUser = null;
      this.countdownSeconds = 0;
      this.notify();
      return;
    }

    const user = this.queue[this.currentIndex];
    this.currentUser = user;
    this.countdownSeconds = 0;
    this.notify();

    try {
      const result = await this.executor(user);

      if (this.status !== 'RUNNING') return;

      if (!result.success) {
        if (result.isRateLimit || result.status === 429 || result.status === 400) {
          this.circuitBreaker.recordFailure(result.status || 429);
          this.status = 'RATE_LIMITED';
          this.error = result.error || 'Rate limit or action blocked';
          this.notify();
          return;
        }

        // Non-rate-limit single error (e.g. temporary user error), proceed to next with jitter
        this.error = result.error || 'Failed to unfollow user';
      } else {
        this.circuitBreaker.recordSuccess();
        this.completed++;
      }

      this.currentIndex++;

      if (this.currentIndex >= this.queue.length) {
        this.status = 'COMPLETED';
        this.currentUser = null;
        this.countdownSeconds = 0;
        this.notify();
        return;
      }

      // Calculate randomized human jitter delay
      const minJitter = options.minJitterSec ?? 12;
      const maxJitter = options.maxJitterSec ?? 25;
      const jitterSec = Math.floor(Math.random() * (maxJitter - minJitter + 1)) + minJitter;

      this.startCountdown(jitterSec, options);
    } catch (err) {
      if (this.status !== 'RUNNING') return;
      this.status = 'STOPPED';
      this.error = String(err);
      this.notify();
    }
  }

  private startCountdown(seconds: number, options: QueueOptions): void {
    this.countdownSeconds = seconds;
    this.notify();

    const tick = () => {
      if (this.status !== 'RUNNING') return;

      if (this.countdownSeconds <= 1) {
        this.countdownSeconds = 0;
        this.notify();
        this.processNext(options);
      } else {
        this.countdownSeconds--;
        this.notify();
        this.timerId = setTimeout(tick, 1000);
      }
    };

    this.timerId = setTimeout(tick, 1000);
  }
}
