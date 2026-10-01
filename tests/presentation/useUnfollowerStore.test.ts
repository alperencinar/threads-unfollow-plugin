import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { useUnfollowerStore } from '../../src/presentation/store/useUnfollowerStore';
import { LocalDatabase } from '../../src/infrastructure/storage/LocalDatabase';
import { FollowerSnapshot } from '../../src/domain/entities';

describe('useUnfollowerStore', () => {
  let db: LocalDatabase;

  beforeEach(async () => {
    useUnfollowerStore.getState().reset();
    db = new LocalDatabase(`TestStoreDB_${Date.now()}`);
    await db.clearAll();
  });

  it('updates activeTab correctly', () => {
    const store = useUnfollowerStore.getState();
    expect(store.activeTab).toBe('notFollowing');

    store.setActiveTab('fans');
    expect(useUnfollowerStore.getState().activeTab).toBe('fans');

    store.setActiveTab('mutuals');
    expect(useUnfollowerStore.getState().activeTab).toBe('mutuals');
  });

  it('loads diff and sets new baseline if only 1 snapshot exists', async () => {
    const snap: FollowerSnapshot = {
      id: 's1',
      timestamp: 1000,
      targetUserId: 'target_1',
      platform: 'threads.com',
      followers: [{ id: 'u1', username: 'alice', fullName: 'Alice', avatarUrl: '' }],
      following: [{ id: 'u2', username: 'bob', fullName: 'Bob', avatarUrl: '' }],
    };

    await db.saveSnapshot(snap);

    await useUnfollowerStore.getState().loadDiff('target_1', db);

    const state = useUnfollowerStore.getState();
    expect(state.totalFollowers).toBe(1);
    expect(state.totalFollowing).toBe(1);
    expect(state.diffResult?.unfollowers).toHaveLength(0);
    expect(state.diffResult?.notFollowingBack).toHaveLength(1); // Bob does not follow Alice

    // Test removing notFollowing user
    useUnfollowerStore.getState().removeNotFollowingUser('u2');
    const updatedState = useUnfollowerStore.getState();
    expect(updatedState.diffResult?.notFollowingBack).toHaveLength(0);
    expect(updatedState.totalFollowing).toBe(0);
  });
});
