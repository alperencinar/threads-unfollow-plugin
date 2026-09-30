export interface SocialUser {
  readonly id: string;
  readonly username: string;
  readonly fullName: string;
  readonly avatarUrl: string;
  readonly isVerified?: boolean;
}
