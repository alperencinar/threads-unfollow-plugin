import { SocialUser, FollowerSnapshot, DiffResult } from '../entities';

export class SnapshotDiffEngine {
  /**
   * Computes the mathematical set differences between two snapshots.
   * Time Complexity: O(N + M)
   * Space Complexity: O(N + M)
   */
  public static compute(
    previousSnapshot: FollowerSnapshot,
    currentSnapshot: FollowerSnapshot
  ): DiffResult {
    const prevFollowersMap = new Map<string, SocialUser>(
      previousSnapshot.followers.map((u) => [u.id, u])
    );
    const currFollowersMap = new Map<string, SocialUser>(
      currentSnapshot.followers.map((u) => [u.id, u])
    );
    const currFollowingMap = new Map<string, SocialUser>(
      currentSnapshot.following.map((u) => [u.id, u])
    );

    // Unfollowers: F(t0) \ F(t1)
    const unfollowers: SocialUser[] = [];
    for (const [id, user] of prevFollowersMap) {
      if (!currFollowersMap.has(id)) {
        unfollowers.push(user);
      }
    }

    // New Followers: F(t1) \ F(t0)
    const newFollowers: SocialUser[] = [];
    for (const [id, user] of currFollowersMap) {
      if (!prevFollowersMap.has(id)) {
        newFollowers.push(user);
      }
    }

    // Not Following Back: Following(t1) \ Followers(t1)
    const notFollowingBack: SocialUser[] = [];
    for (const [id, user] of currFollowingMap) {
      if (!currFollowersMap.has(id)) {
        notFollowingBack.push(user);
      }
    }

    // Fans: Followers(t1) \ Following(t1)
    const fans: SocialUser[] = [];
    for (const [id, user] of currFollowersMap) {
      if (!currFollowingMap.has(id)) {
        fans.push(user);
      }
    }

    // Mutuals: Followers(t1) ∩ Following(t1)
    const mutuals: SocialUser[] = [];
    for (const [id, user] of currFollowersMap) {
      if (currFollowingMap.has(id)) {
        mutuals.push(user);
      }
    }

    return {
      calculatedAt: Date.now(),
      previousTimestamp: previousSnapshot.timestamp,
      currentTimestamp: currentSnapshot.timestamp,
      unfollowers,
      newFollowers,
      notFollowingBack,
      fans,
      mutuals,
    };
  }
}
