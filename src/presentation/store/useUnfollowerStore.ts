import { create } from 'zustand';
import { DiffResult, SocialUser } from '../../domain/entities';
import { SnapshotDiffEngine } from '../../domain/services/SnapshotDiffEngine';
import {
  UnfollowQueueManager,
  QueueProgress,
  UnfollowExecutor,
} from '../../domain/services/UnfollowQueueManager';
import { StoragePort } from '../../infrastructure/storage/StoragePort';

export type ActiveTabType = 'notFollowing' | 'fans' | 'mutuals';

export interface UnfollowerState {
  activeTab: ActiveTabType;
  diffResult: DiffResult | null;
  isLoading: boolean;
  error: string | null;
  targetUserId: string | null;
  totalFollowers: number;
  totalFollowing: number;

  singleUnfollowingId: string | null;
  queueProgress: QueueProgress;

  setActiveTab: (tab: ActiveTabType) => void;
  setTargetUserId: (id: string) => void;
  loadDiff: (targetUserId?: string, storage?: StoragePort) => Promise<void>;
  removeNotFollowingUser: (userId: string) => void;
  unfollowSingleUser: (user: SocialUser) => Promise<{ success: boolean; error?: string }>;
  startQueue: (users: ReadonlyArray<SocialUser>) => void;
  pauseQueue: () => void;
  resumeQueue: () => void;
  stopQueue: () => void;
  reset: () => void;
}

const defaultExecutor: UnfollowExecutor = async (user) => {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    try {
      const res: any = await chrome.runtime.sendMessage({
        action: 'UNFOLLOW_USER',
        userId: user.id,
        username: user.username,
      });
      return {
        success: Boolean(res?.success),
        isRateLimit: Boolean(res?.isRateLimit),
        status: res?.status,
        error: res?.error,
      };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
  return { success: false, error: 'Extension runtime not available' };
};

let queueManagerInstance: UnfollowQueueManager | null = null;

const initialQueueProgress: QueueProgress = {
  status: 'IDLE',
  total: 0,
  completed: 0,
  currentUser: null,
  countdownSeconds: 0,
  error: null,
};

export const useUnfollowerStore = create<UnfollowerState>((set, get) => {
  const getQueueManager = () => {
    if (!queueManagerInstance) {
      queueManagerInstance = new UnfollowQueueManager(async (user) => {
        const res = await defaultExecutor(user);
        if (res.success) {
          get().removeNotFollowingUser(user.id);
        }
        return res;
      });

      queueManagerInstance.onProgress((progress) => {
        set({ queueProgress: progress });
      });
    }
    return queueManagerInstance;
  };

  return {
    activeTab: 'notFollowing',
    diffResult: null,
    isLoading: false,
    error: null,
    targetUserId: null,
    totalFollowers: 0,
    totalFollowing: 0,
    singleUnfollowingId: null,
    queueProgress: initialQueueProgress,

    setActiveTab: (tab) => set({ activeTab: tab }),

    setTargetUserId: (id) => set({ targetUserId: id }),

    loadDiff: async (targetUserId, storage) => {
      if (!storage) return;
      set({ isLoading: true, error: null });
      try {
        const [current, previous] = await storage.getLatestSnapshots(targetUserId);

        if (!current) {
          set({
            isLoading: false,
            diffResult: null,
            targetUserId: null,
            totalFollowers: 0,
            totalFollowing: 0,
          });
          return;
        }

        set({
          targetUserId: current.targetUserId,
          totalFollowers: current.followers.length,
          totalFollowing: current.following.length,
        });

        if (!previous) {
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

    removeNotFollowingUser: (userId) => {
      set((state) => {
        if (!state.diffResult) return state;
        const updated = state.diffResult.notFollowingBack.filter((u) => u.id !== userId);
        return {
          diffResult: {
            ...state.diffResult,
            notFollowingBack: updated,
          },
          totalFollowing: Math.max(0, state.totalFollowing - 1),
        };
      });
    },

    unfollowSingleUser: async (user) => {
      set({ singleUnfollowingId: user.id });
      try {
        const res = await defaultExecutor(user);
        if (res.success) {
          get().removeNotFollowingUser(user.id);
          set({ singleUnfollowingId: null });
          return { success: true };
        } else {
          set({ singleUnfollowingId: null });
          return { success: false, error: res.error || 'Failed' };
        }
      } catch (err) {
        set({ singleUnfollowingId: null });
        return { success: false, error: String(err) };
      }
    },

    startQueue: (users) => {
      const qm = getQueueManager();
      qm.start(users, { maxQuota: 25, minJitterSec: 12, maxJitterSec: 25 });
    },

    pauseQueue: () => {
      const qm = getQueueManager();
      qm.pause();
    },

    resumeQueue: () => {
      const qm = getQueueManager();
      qm.resume({ maxQuota: 25, minJitterSec: 12, maxJitterSec: 25 });
    },

    stopQueue: () => {
      const qm = getQueueManager();
      qm.stop();
    },

    reset: () => {
      if (queueManagerInstance) {
        queueManagerInstance.stop();
      }
      set({
        diffResult: null,
        isLoading: false,
        error: null,
        targetUserId: null,
        totalFollowers: 0,
        totalFollowing: 0,
        singleUnfollowingId: null,
        queueProgress: initialQueueProgress,
      });
    },
  };
});
