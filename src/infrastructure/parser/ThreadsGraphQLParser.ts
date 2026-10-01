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
   * Safely extracts users from threads.com / threads.net GraphQL & REST response bodies.
   * Supports standard Relay queries, connection aliases, pagination chunks, and @stream_connection.
   */
  public static parse(
    raw: unknown,
    urlHint?: string,
    bodyHint?: string
  ): ParsedThreadsPayload {
    if (!raw || typeof raw !== 'object') {
      return { type: 'unknown', users: [] };
    }

    const root = raw as Record<string, unknown>;

    // 1. Relay Streaming Incremental Chunks (@stream_connection or @defer)
    if (Array.isArray(root.incremental)) {
      const allUsers: SocialUser[] = [];
      let detectedType: 'followers' | 'following' = this.detectType({
        bodyHint,
        urlHint,
      });

      for (const inc of root.incremental) {
        if (!inc || typeof inc !== 'object') continue;

        // Determine type from incremental path if available (e.g. ["node", "following", "edges", 20])
        if (Array.isArray(inc.path)) {
          detectedType = this.detectType({
            path: inc.path,
            bodyHint,
            urlHint,
          });
        }

        if (Array.isArray(inc.items)) {
          allUsers.push(...this.extractFromEdges(inc.items));
        } else if (inc.data && typeof inc.data === 'object') {
          const subParsed = this.parse({ data: inc.data }, urlHint, bodyHint);
          if (subParsed.users.length > 0) {
            allUsers.push(...subParsed.users);
            if (subParsed.type !== 'unknown') detectedType = subParsed.type;
          }
        }
      }

      if (allUsers.length > 0) {
        return {
          type: detectedType,
          users: allUsers,
          hasNextPage: Boolean(root.hasNext),
        };
      }
    }

    // 2. Direct REST users array (e.g., /api/v1/friendships/.../followers/)
    if (Array.isArray(root.users)) {
      const type = this.detectType({ key: 'users', bodyHint, urlHint });
      return {
        type,
        users: this.extractFromUserArray(root.users),
        hasNextPage: Boolean(root.big_list || root.next_max_id),
        endCursor: root.next_max_id ? String(root.next_max_id) : undefined,
      };
    }

    const data = root.data as Record<string, unknown> | undefined;
    if (!data || typeof data !== 'object') {
      return { type: 'unknown', users: [] };
    }

    // 3. Check Relay container nodes: data.node, data.xdt_user, data.user
    const candidateContainers: Record<string, unknown>[] = [
      data.node,
      data.xdt_user,
      data.user,
      data.user_info,
      data,
    ].filter((c): c is Record<string, unknown> => Boolean(c && typeof c === 'object'));

    for (const container of candidateContainers) {
      const targetUserId = String(container.id || container.pk || '');

      // Inspect all keys for connection objects (followers, following, aliases, etc.)
      for (const [key, val] of Object.entries(container)) {
        if (!val || typeof val !== 'object') continue;
        const valObj = val as Record<string, unknown>;

        const keyLower = key.toLowerCase();
        const isFollowKey =
          keyLower.includes('follower') ||
          keyLower.includes('following') ||
          keyLower.includes('edge_follow') ||
          keyLower.includes('edge_followed_by') ||
          keyLower.includes('friendship');

        // Check if valObj has edges or is an edges array
        const edges = Array.isArray(valObj.edges)
          ? valObj.edges
          : Array.isArray(val)
          ? val
          : null;

        if (edges && isFollowKey) {
          const users = this.extractFromEdges(edges);
          if (users.length > 0) {
            const type = this.detectType({ key, bodyHint, urlHint });

            return {
              targetUserId: targetUserId || undefined,
              type,
              users,
              hasNextPage: Boolean(
                (valObj.page_info as Record<string, unknown> | undefined)?.has_next_page
              ),
              endCursor: String(
                (valObj.page_info as Record<string, unknown> | undefined)?.end_cursor || ''
              ),
            };
          }
        }
      }
    }

    // 4. Direct users array fallback inside data
    if (Array.isArray(data.users)) {
      const type = this.detectType({ key: 'users', bodyHint, urlHint });
      return {
        type,
        users: this.extractFromUserArray(data.users),
      };
    }

    // 5. Deep scan fallback: find any array of objects containing username & pk/id
    const deepUsers = this.deepFindUsers(data);
    if (deepUsers.length > 0) {
      return {
        type: this.detectType({ bodyHint, urlHint }),
        users: deepUsers,
      };
    }

    return { type: 'unknown', users: [] };
  }

  /**
   * Deterministically identifies whether this request belongs to following or followers.
   * Priority: bodyHint (GraphQL query name/variables) > key/path > urlHint.
   */
  public static detectType(context: {
    key?: string;
    path?: unknown[];
    bodyHint?: string;
    urlHint?: string;
  }): 'followers' | 'following' {
    const { key, path, bodyHint, urlHint } = context;

    // 1. Request body hint (e.g. BarcelonaProfileFollowingPaginationQuery or doc_id)
    if (bodyHint) {
      const b = bodyHint.toLowerCase();
      // Check following patterns first
      if (
        b.includes('following') ||
        b.includes('edge_follow') ||
        b.includes('barcelonaprofilefollowing')
      ) {
        return 'following';
      }
      if (
        b.includes('follower') ||
        b.includes('edge_followed_by') ||
        b.includes('barcelonaprofilefollower')
      ) {
        return 'followers';
      }
    }

    // 2. Direct key inspection
    if (key) {
      const k = key.toLowerCase();
      if (k.includes('following') || k.includes('edge_follow')) {
        return 'following';
      }
      if (k.includes('follower') || k.includes('edge_followed_by')) {
        return 'followers';
      }
    }

    // 3. Incremental path inspection
    if (path && Array.isArray(path)) {
      const pathStr = path.join('_').toLowerCase();
      if (pathStr.includes('following') || pathStr.includes('edge_follow')) {
        return 'following';
      }
      if (pathStr.includes('follower') || pathStr.includes('edge_followed_by')) {
        return 'followers';
      }
    }

    // 4. URL hint inspection
    if (urlHint) {
      const u = urlHint.toLowerCase();
      if (u.includes('following') || u.includes('edge_follow')) {
        return 'following';
      }
      if (u.includes('follower') || u.includes('edge_followed_by')) {
        return 'followers';
      }
    }

    return 'followers';
  }

  private static extractFromEdges(edges: unknown[]): SocialUser[] {
    const list: SocialUser[] = [];
    for (const edge of edges) {
      if (edge && typeof edge === 'object') {
        const item = (edge as { node?: Record<string, unknown> }).node || edge;
        const user = this.normalizeUser(item as Record<string, unknown>);
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
    if (!rawUser || typeof rawUser !== 'object') return null;
    const id = String(rawUser.pk || rawUser.id || rawUser.strong_id__ || '');
    const username = String(rawUser.username || '');
    if (!id || !username) return null;

    const rawPic =
      rawUser.profile_pic_url ||
      rawUser.profile_pic_url_hd ||
      (rawUser.hd_profile_pic_url_info as Record<string, unknown> | undefined)?.url ||
      (rawUser.profile_picture as Record<string, unknown> | undefined)?.uri ||
      rawUser.avatarUrl ||
      '';

    return {
      id,
      username,
      fullName: String(rawUser.full_name || rawUser.fullName || ''),
      avatarUrl: typeof rawPic === 'string' ? rawPic : '',
      isVerified: Boolean(rawUser.is_verified || rawUser.isVerified),
    };
  }

  private static deepFindUsers(obj: unknown, depth = 0): SocialUser[] {
    if (!obj || typeof obj !== 'object' || depth > 5) return [];

    if (Array.isArray(obj)) {
      const users = this.extractFromEdges(obj);
      if (users.length > 0) return users;

      for (const item of obj) {
        const found = this.deepFindUsers(item, depth + 1);
        if (found.length > 0) return found;
      }
    } else {
      for (const val of Object.values(obj)) {
        const found = this.deepFindUsers(val, depth + 1);
        if (found.length > 0) return found;
      }
    }
    return [];
  }
}
