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

  it('isolates snapshots by targetUserId', async () => {
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
});
