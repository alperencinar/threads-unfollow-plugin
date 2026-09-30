import { describe, it, expect } from 'vitest';
import { SnapshotDiffEngine } from '../../src/domain/services/SnapshotDiffEngine';
import { FollowerSnapshot, SocialUser } from '../../src/domain/entities';

describe('SnapshotDiffEngine', () => {
  const userA: SocialUser = { id: '1', username: 'user_a', fullName: 'User A', avatarUrl: 'http://a' };
  const userB: SocialUser = { id: '2', username: 'user_b', fullName: 'User B', avatarUrl: 'http://b' };
  const userC: SocialUser = { id: '3', username: 'user_c', fullName: 'User C', avatarUrl: 'http://c' };
  const userD: SocialUser = { id: '4', username: 'user_d', fullName: 'User D', avatarUrl: 'http://d' };

  it('correctly calculates unfollowers when user drops from followers list', () => {
    const snapT0: FollowerSnapshot = {
      id: 'snap-1',
      timestamp: 1000,
      targetUserId: 'self',
      platform: 'threads.com',
      followers: [userA, userB, userC],
      following: [userA],
    };

    const snapT1: FollowerSnapshot = {
      id: 'snap-2',
      timestamp: 2000,
      targetUserId: 'self',
      platform: 'threads.com',
      followers: [userA, userC], // userB unfollowed!
      following: [userA],
    };

    const diff = SnapshotDiffEngine.compute(snapT0, snapT1);

    expect(diff.unfollowers).toHaveLength(1);
    expect(diff.unfollowers[0].username).toBe('user_b');
    expect(diff.newFollowers).toHaveLength(0);
  });

  it('correctly detects new followers who joined at t1', () => {
    const snapT0: FollowerSnapshot = {
      id: 'snap-1',
      timestamp: 1000,
      targetUserId: 'self',
      platform: 'threads.com',
      followers: [userA],
      following: [],
    };

    const snapT1: FollowerSnapshot = {
      id: 'snap-2',
      timestamp: 2000,
      targetUserId: 'self',
      platform: 'threads.com',
      followers: [userA, userD],
      following: [],
    };

    const diff = SnapshotDiffEngine.compute(snapT0, snapT1);

    expect(diff.newFollowers).toHaveLength(1);
    expect(diff.newFollowers[0].username).toBe('user_d');
    expect(diff.unfollowers).toHaveLength(0);
  });

  it('correctly identifies notFollowingBack and fans', () => {
    const snapT0: FollowerSnapshot = {
      id: 'snap-1',
      timestamp: 1000,
      targetUserId: 'self',
      platform: 'threads.com',
      followers: [userA, userB], // A and B follow self
      following: [userA, userC], // Self follows A and C
    };

    const diff = SnapshotDiffEngine.compute(snapT0, snapT0);

    // Mutuals: userA
    expect(diff.mutuals.map(u => u.id)).toEqual(['1']);
    // Not following back: Self follows userC, but C does not follow self
    expect(diff.notFollowingBack.map(u => u.id)).toEqual(['3']);
    // Fans: userB follows self, but self does not follow userB
    expect(diff.fans.map(u => u.id)).toEqual(['2']);
  });
});
