import { SocialUser } from './SocialUser';

export interface FollowerSnapshot {
  readonly id: string;
  readonly timestamp: number;
  readonly targetUserId: string;
  readonly platform: 'threads.com';
  readonly followers: ReadonlyArray<SocialUser>;
  readonly following: ReadonlyArray<SocialUser>;
}
