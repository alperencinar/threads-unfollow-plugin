import { FollowerSnapshot } from '../../domain/entities';

export interface StoragePort {
  saveSnapshot(snapshot: FollowerSnapshot): Promise<void>;
  getLatestSnapshots(
    targetUserId: string
  ): Promise<[FollowerSnapshot | null, FollowerSnapshot | null]>;
  getAllSnapshots(targetUserId: string): Promise<FollowerSnapshot[]>;
  clearAll(): Promise<void>;
}
