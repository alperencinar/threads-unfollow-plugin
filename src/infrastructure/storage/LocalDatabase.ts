import Dexie, { type Table } from 'dexie';
import { FollowerSnapshot } from '../../domain/entities';
import { StoragePort } from './StoragePort';

export class LocalDatabase extends Dexie implements StoragePort {
  public snapshots!: Table<FollowerSnapshot, string>;

  constructor(databaseName = 'ThreadsUnfollowerDB') {
    super(databaseName);
    this.version(1).stores({
      snapshots: 'id, timestamp, targetUserId, platform',
    });
  }

  public async saveSnapshot(snapshot: FollowerSnapshot): Promise<void> {
    await this.snapshots.put(snapshot);
  }

  public async getLatestSnapshots(
    targetUserId?: string
  ): Promise<[FollowerSnapshot | null, FollowerSnapshot | null]> {
    if (targetUserId && targetUserId !== 'current_user') {
      const list = await this.snapshots
        .where('targetUserId')
        .equals(targetUserId)
        .reverse()
        .sortBy('timestamp');

      if (list.length > 0) {
        return [list[0] || null, list[1] || null];
      }
    }

    const fallbackList = await this.snapshots
      .orderBy('timestamp')
      .reverse()
      .limit(2)
      .toArray();

    return [fallbackList[0] || null, fallbackList[1] || null];
  }

  public async getAllSnapshots(targetUserId?: string): Promise<FollowerSnapshot[]> {
    if (targetUserId && targetUserId !== 'current_user') {
      const list = await this.snapshots
        .where('targetUserId')
        .equals(targetUserId)
        .reverse()
        .sortBy('timestamp');

      if (list.length > 0) return list;
    }

    return this.snapshots
      .orderBy('timestamp')
      .reverse()
      .toArray();
  }

  public async removeFollowingUser(
    targetUserId: string | undefined,
    userIdToRemove: string
  ): Promise<void> {
    const [latest] = await this.getLatestSnapshots(targetUserId);
    if (!latest) return;
    const updatedFollowing = latest.following.filter((u) => u.id !== userIdToRemove);
    await this.saveSnapshot({
      ...latest,
      following: updatedFollowing,
    });
  }

  public async clearAll(): Promise<void> {
    await this.snapshots.clear();
  }
}
