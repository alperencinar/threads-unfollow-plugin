import { create } from 'zustand';
import { DiffResult } from '../../domain/entities';
import { SnapshotDiffEngine } from '../../domain/services/SnapshotDiffEngine';
import { StoragePort } from '../../infrastructure/storage/StoragePort';

export type ActiveTabType =
  | 'unfollowers'
  | 'notFollowing'
  | 'newFollowers'
  | 'fans'
  | 'mutuals';

export interface UnfollowerState {
  activeTab: ActiveTabType;
  diffResult: DiffResult | null;
  isLoading: boolean;
  error: string | null;
  targetUserId: string | null;
  totalFollowers: number;
  totalFollowing: number;

  setActiveTab: (tab: ActiveTabType) => void;
  setTargetUserId: (id: string) => void;
  loadDiff: (targetUserId: string, storage: StoragePort) => Promise<void>;
  reset: () => void;
}

export const useUnfollowerStore = create<UnfollowerState>((set) => ({
  activeTab: 'unfollowers',
  diffResult: null,
  isLoading: false,
  error: null,
  targetUserId: null,
  totalFollowers: 0,
  totalFollowing: 0,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setTargetUserId: (id) => set({ targetUserId: id }),

  loadDiff: async (targetUserId, storage) => {
    set({ isLoading: true, error: null });
    try {
      const [current, previous] = await storage.getLatestSnapshots(targetUserId);

      if (!current) {
        set({
          isLoading: false,
          diffResult: null,
          totalFollowers: 0,
          totalFollowing: 0,
        });
        return;
      }

      set({
        totalFollowers: current.followers.length,
        totalFollowing: current.following.length,
      });

      if (!previous) {
        // First snapshot baseline established
        set({
          isLoading: false,
          diffResult: {
            calculatedAt: Date.now(),
            previousTimestamp: current.timestamp,
            currentTimestamp: current.timestamp,
            unfollowers: [],
            newFollowers: current.followers,
            notFollowingBack: current.following.filter(
              (f) => !current.followers.some((fol) => fol.id === f.id)
            ),
            fans: current.followers.filter(
              (fol) => !current.following.some((f) => f.id === fol.id)
            ),
            mutuals: current.followers.filter((fol) =>
              current.following.some((f) => f.id === fol.id)
            ),
          },
        });
        return;
      }

      const result = SnapshotDiffEngine.compute(previous, current);
      set({ diffResult: result, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  },

  reset: () =>
    set({
      diffResult: null,
      isLoading: false,
      error: null,
      totalFollowers: 0,
      totalFollowing: 0,
    }),
}));
