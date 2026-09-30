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
    targetUserId: string
  ): Promise<[FollowerSnapshot | null, FollowerSnapshot | null]> {
    const list = await this.snapshots
      .where('targetUserId')
      .equals(targetUserId)
      .reverse()
      .sortBy('timestamp');

    return [list[0] || null, list[1] || null];
  }

  public async getAllSnapshots(targetUserId: string): Promise<FollowerSnapshot[]> {
    return this.snapshots
      .where('targetUserId')
      .equals(targetUserId)
      .reverse()
      .sortBy('timestamp');
  }

  public async clearAll(): Promise<void> {
    await this.snapshots.clear();
  }
}
