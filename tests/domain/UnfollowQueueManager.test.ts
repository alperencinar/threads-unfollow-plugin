import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnfollowQueueManager, UnfollowExecutor } from '../../src/domain/services/UnfollowQueueManager';
import { SafetyCircuitBreaker } from '../../src/domain/services/SafetyCircuitBreaker';
import { SocialUser } from '../../src/domain/entities';

describe('UnfollowQueueManager', () => {
  const dummyUsers: SocialUser[] = [
    { id: '1', username: 'user1', fullName: 'User One', avatarUrl: '' },
    { id: '2', username: 'user2', fullName: 'User Two', avatarUrl: '' },
    { id: '3', username: 'user3', fullName: 'User Three', avatarUrl: '' },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('completes immediately if queue is empty', () => {
    const executor = vi.fn();
    const manager = new UnfollowQueueManager(executor);

    manager.start([]);
    const progress = manager.getProgress();

    expect(progress.status).toBe('COMPLETED');
    expect(progress.completed).toBe(0);
    expect(executor).not.toHaveBeenCalled();
  });

  it('respects maxQuota and caps input users', async () => {
    const manyUsers: SocialUser[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      username: `user_${i}`,
      fullName: `User ${i}`,
      avatarUrl: '',
    }));

    const executor: UnfollowExecutor = vi.fn().mockResolvedValue({ success: true });
    const manager = new UnfollowQueueManager(executor);

    manager.start(manyUsers, { maxQuota: 5, minJitterSec: 1, maxJitterSec: 1 });
    expect(manager.getProgress().total).toBe(5);

    manager.stop();
  });

  it('executes users with jitter and completes whole queue', async () => {
    const executor: UnfollowExecutor = vi.fn().mockResolvedValue({ success: true });
    const manager = new UnfollowQueueManager(executor);

    manager.start(dummyUsers, { minJitterSec: 2, maxJitterSec: 2 });

    // First user executed immediately
    await vi.advanceTimersByTimeAsync(10);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(manager.getProgress().completed).toBe(1);
    expect(manager.getProgress().countdownSeconds).toBe(2);

    // Wait 1 second (countdown: 1)
    await vi.advanceTimersByTimeAsync(1000);
    expect(manager.getProgress().countdownSeconds).toBe(1);

    // Wait 1 more second (second user executed)
    await vi.advanceTimersByTimeAsync(1000);
    expect(executor).toHaveBeenCalledTimes(2);
    expect(manager.getProgress().completed).toBe(2);

    // Wait 2 seconds for third user
    await vi.advanceTimersByTimeAsync(2000);
    expect(executor).toHaveBeenCalledTimes(3);
    expect(manager.getProgress().completed).toBe(3);
    expect(manager.getProgress().status).toBe('COMPLETED');
  });

  it('stops queue and sets RATE_LIMITED if rate limit occurs', async () => {
    const executor: UnfollowExecutor = vi.fn().mockResolvedValue({
      success: false,
      isRateLimit: true,
      status: 429,
      error: 'Action Blocked',
    });
    const cb = new SafetyCircuitBreaker(1);
    const manager = new UnfollowQueueManager(executor, cb);

    manager.start(dummyUsers, { minJitterSec: 2, maxJitterSec: 2 });

    await vi.advanceTimersByTimeAsync(10);
    expect(executor).toHaveBeenCalledTimes(1);
    expect(manager.getProgress().status).toBe('RATE_LIMITED');
    expect(cb.isOpen()).toBe(true);
  });

  it('handles pause and resume cleanly', async () => {
    const executor: UnfollowExecutor = vi.fn().mockResolvedValue({ success: true });
    const manager = new UnfollowQueueManager(executor);

    manager.start(dummyUsers, { minJitterSec: 5, maxJitterSec: 5 });

    await vi.advanceTimersByTimeAsync(10);
    expect(executor).toHaveBeenCalledTimes(1);

    manager.pause();
    expect(manager.getProgress().status).toBe('PAUSED');

    // Advance time while paused: should not trigger next user
    await vi.advanceTimersByTimeAsync(10000);
    expect(executor).toHaveBeenCalledTimes(1);

    manager.resume({ minJitterSec: 1, maxJitterSec: 1 });
    expect(manager.getProgress().status).toBe('RUNNING');
    await vi.advanceTimersByTimeAsync(10);
    expect(executor).toHaveBeenCalledTimes(2);

    manager.stop();
    expect(manager.getProgress().status).toBe('STOPPED');
  });
});
