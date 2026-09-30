import { SocialUser } from '../../domain/entities';

export interface ParsedThreadsPayload {
  readonly targetUserId?: string;
  readonly type: 'followers' | 'following' | 'unknown';
  readonly users: SocialUser[];
  readonly hasNextPage?: boolean;
  readonly endCursor?: string;
}

export class ThreadsGraphQLParser {
  /**
   * Safely extracts users from threads.com GraphQL response bodies.
   */
  public static parse(raw: unknown): ParsedThreadsPayload {
    if (!raw || typeof raw !== 'object') {
      return { type: 'unknown', users: [] };
    }

    const data = (raw as Record<string, unknown>).data as Record<string, unknown> | undefined;
    if (!data) {
      return { type: 'unknown', users: [] };
    }

    const node = data.node as Record<string, unknown> | undefined;
    if (node) {
      const targetUserId = String(node.id || node.pk || '');

      // Check followers
      const followers = node.followers as Record<string, unknown> | undefined;
      if (followers && Array.isArray(followers.edges)) {
        return {
          targetUserId,
          type: 'followers',
          users: this.extractFromEdges(followers.edges),
          hasNextPage: Boolean(
            (followers.page_info as Record<string, unknown> | undefined)?.has_next_page
          ),
          endCursor: String(
            (followers.page_info as Record<string, unknown> | undefined)?.end_cursor || ''
          ),
        };
      }

      // Check following
      const following = node.following as Record<string, unknown> | undefined;
      if (following && Array.isArray(following.edges)) {
        return {
          targetUserId,
          type: 'following',
          users: this.extractFromEdges(following.edges),
          hasNextPage: Boolean(
            (following.page_info as Record<string, unknown> | undefined)?.has_next_page
          ),
          endCursor: String(
            (following.page_info as Record<string, unknown> | undefined)?.end_cursor || ''
          ),
        };
      }
    }

    // Direct users array fallback
    if (Array.isArray(data.users)) {
      return {
        type: 'followers',
        users: this.extractFromUserArray(data.users),
      };
    }

    return { type: 'unknown', users: [] };
  }

  private static extractFromEdges(edges: unknown[]): SocialUser[] {
    const list: SocialUser[] = [];
    for (const edge of edges) {
      if (edge && typeof edge === 'object' && 'node' in edge) {
        const item = (edge as { node?: Record<string, unknown> }).node;
        const user = this.normalizeUser(item);
        if (user) list.push(user);
      }
    }
    return list;
  }

  private static extractFromUserArray(users: unknown[]): SocialUser[] {
    const list: SocialUser[] = [];
    for (const item of users) {
      if (item && typeof item === 'object') {
        const user = this.normalizeUser(item as Record<string, unknown>);
        if (user) list.push(user);
      }
    }
    return list;
  }

  private static normalizeUser(rawUser?: Record<string, unknown>): SocialUser | null {
    if (!rawUser) return null;
    const id = String(rawUser.pk || rawUser.id || '');
    const username = String(rawUser.username || '');
    if (!id || !username) return null;

    return {
      id,
      username,
      fullName: String(rawUser.full_name || rawUser.fullName || ''),
      avatarUrl: String(rawUser.profile_pic_url || rawUser.avatarUrl || ''),
      isVerified: Boolean(rawUser.is_verified || rawUser.isVerified),
    };
  }
}
