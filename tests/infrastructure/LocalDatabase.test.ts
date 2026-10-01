import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { LocalDatabase } from '../../src/infrastructure/storage/LocalDatabase';
import { FollowerSnapshot } from '../../src/domain/entities';

describe('LocalDatabase with Dexie', () => {
  let db: LocalDatabase;

  beforeEach(async () => {
    db = new LocalDatabase(`TestDB_${Date.now()}`);
    await db.clearAll();
  });

  it('saves and retrieves latest snapshots by targetUserId ordered by timestamp', async () => {
    const snap1: FollowerSnapshot = {
      id: 's1',
      timestamp: 1000,
      targetUserId: 'user_1',
      platform: 'threads.com',
      followers: [{ id: 'u1', username: 'john', fullName: 'John Doe', avatarUrl: '' }],
      following: [],
    };

    const snap2: FollowerSnapshot = {
      id: 's2',
      timestamp: 2000,
      targetUserId: 'user_1',
      platform: 'threads.com',
      followers: [],
      following: [],
    };

    await db.saveSnapshot(snap1);
    await db.saveSnapshot(snap2);

    const [latest, previous] = await db.getLatestSnapshots('user_1');

    expect(latest?.id).toBe('s2');
    expect(previous?.id).toBe('s1');
  });

  it('falls back to latest snapshots across any user if targetUserId has no exact match or is current_user', async () => {
    const snap: FollowerSnapshot = {
      id: 'snap_num_id',
      timestamp: 5000,
      targetUserId: '178414000123',
      platform: 'threads.com',
      followers: [{ id: 'u9', username: 'alice', fullName: 'Alice', avatarUrl: '' }],
      following: [],
    };

    await db.saveSnapshot(snap);

    const [latest] = await db.getLatestSnapshots('current_user');
    expect(latest?.id).toBe('snap_num_id');
    expect(latest?.targetUserId).toBe('178414000123');
  });

  it('isolates snapshots by targetUserId when both exist', async () => {
    const snapUser1: FollowerSnapshot = {
      id: 's1',
      timestamp: 1000,
      targetUserId: 'user_1',
      platform: 'threads.com',
      followers: [],
      following: [],
    };

    const snapUser2: FollowerSnapshot = {
      id: 's2',
      timestamp: 2000,
      targetUserId: 'user_2',
      platform: 'threads.com',
      followers: [],
      following: [],
    };

    await db.saveSnapshot(snapUser1);
    await db.saveSnapshot(snapUser2);

    const snapshotsUser1 = await db.getAllSnapshots('user_1');
    expect(snapshotsUser1).toHaveLength(1);
    expect(snapshotsUser1[0].id).toBe('s1');
  });

  it('removes a following user from the latest snapshot', async () => {
    const snap: FollowerSnapshot = {
      id: 's_remove',
      timestamp: 3000,
      targetUserId: 'user_target',
      platform: 'threads.com',
      followers: [],
      following: [
        { id: 'u_keep', username: 'keep_me', fullName: 'Keep', avatarUrl: '' },
        { id: 'u_remove', username: 'remove_me', fullName: 'Remove', avatarUrl: '' },
      ],
    };

    await db.saveSnapshot(snap);
    await db.removeFollowingUser('user_target', 'u_remove');

    const [latest] = await db.getLatestSnapshots('user_target');
    expect(latest?.following).toHaveLength(1);
    expect(latest?.following[0].id).toBe('u_keep');
  });
});
