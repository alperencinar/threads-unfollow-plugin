import { SocialUser } from './SocialUser';

export interface DiffResult {
  readonly calculatedAt: number;
  readonly previousTimestamp: number;
  readonly currentTimestamp: number;
  readonly unfollowers: ReadonlyArray<SocialUser>;
  readonly newFollowers: ReadonlyArray<SocialUser>;
  readonly notFollowingBack: ReadonlyArray<SocialUser>;
  readonly fans: ReadonlyArray<SocialUser>;
  readonly mutuals: ReadonlyArray<SocialUser>;
}
