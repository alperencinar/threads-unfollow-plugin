import { describe, it, expect } from 'vitest';
import { ThreadsGraphQLParser } from '../../src/infrastructure/parser/ThreadsGraphQLParser';

describe('ThreadsGraphQLParser', () => {
  it('parses Relay GraphQL follower edges properly', () => {
    const raw = {
      data: {
        node: {
          id: 'user_12345',
          pk: 'user_12345',
          followers: {
            edges: [
              {
                node: {
                  pk: '999',
                  username: 'threads_creator',
                  full_name: 'Creator Name',
                  profile_pic_url: 'https://cdn.threads.com/pic.jpg',
                  is_verified: true,
                },
              },
            ],
            page_info: {
              has_next_page: true,
              end_cursor: 'cursor_abc_123',
            },
          },
        },
      },
    };

    const parsed = ThreadsGraphQLParser.parse(raw);

    expect(parsed.type).toBe('followers');
    expect(parsed.targetUserId).toBe('user_12345');
    expect(parsed.hasNextPage).toBe(true);
    expect(parsed.endCursor).toBe('cursor_abc_123');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0]).toEqual({
      id: '999',
      username: 'threads_creator',
      fullName: 'Creator Name',
      avatarUrl: 'https://cdn.threads.com/pic.jpg',
      isVerified: true,
    });
  });

  it('parses Relay pagination chunk when node does not return id/pk', () => {
    const raw = {
      data: {
        node: {
          __typename: 'XDTUser',
          followers: {
            edges: [
              {
                node: {
                  pk: '1001',
                  username: 'page2_user',
                  full_name: 'Page 2 User',
                },
              },
            ],
            page_info: {
              has_next_page: true,
              end_cursor: 'cursor_page_3',
            },
          },
        },
      },
    };

    const parsed = ThreadsGraphQLParser.parse(raw, 'https://www.threads.com/api/graphql');
    expect(parsed.type).toBe('followers');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('page2_user');
  });

  it('parses Relay streaming incremental chunk (@stream_connection)', () => {
    const raw = {
      incremental: [
        {
          items: [
            {
              node: {
                pk: '2001',
                username: 'streamed_user',
                full_name: 'Streamed User',
              },
            },
          ],
          path: ['node', 'followers', 'edges', 20],
        },
      ],
    };

    const parsed = ThreadsGraphQLParser.parse(raw, 'https://www.threads.com/api/graphql');
    expect(parsed.type).toBe('followers');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('streamed_user');
  });

  it('parses flat edges where edge directly represents the user', () => {
    const raw = {
      data: {
        node: {
          followers: {
            edges: [
              {
                id: '3001',
                username: 'flat_user',
                full_name: 'Flat User',
              },
            ],
          },
        },
      },
    };

    const parsed = ThreadsGraphQLParser.parse(raw);
    expect(parsed.type).toBe('followers');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('flat_user');
  });

  it('parses connection aliases like followers_connection or custom fragments', () => {
    const raw = {
      data: {
        node: {
          followers_connection: {
            edges: [
              {
                node: {
                  pk: '4001',
                  username: 'alias_user',
                },
              },
            ],
          },
        },
      },
    };

    const parsed = ThreadsGraphQLParser.parse(raw);
    expect(parsed.type).toBe('followers');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('alias_user');
  });

  it('parses xdt_user following edges with url hints', () => {
    const raw = {
      data: {
        xdt_user: {
          id: 'user_777',
          edge_follow: {
            edges: [
              {
                node: {
                  id: '888',
                  username: 'followed_friend',
                  fullName: 'Friend Name',
                },
              },
            ],
            page_info: {
              has_next_page: false,
            },
          },
        },
      },
    };

    const parsed = ThreadsGraphQLParser.parse(raw, 'https://www.threads.net/graphql/query');
    expect(parsed.type).toBe('following');
    expect(parsed.targetUserId).toBe('user_777');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('followed_friend');
  });

  it('parses direct REST array with friendship following endpoint', () => {
    const raw = {
      users: [
        {
          pk: '555',
          username: 'rest_user',
          full_name: 'REST User',
        },
      ],
      big_list: true,
      next_max_id: 'next_page_token',
    };

    const parsed = ThreadsGraphQLParser.parse(
      raw,
      'https://www.threads.com/api/v1/friendships/123/following/'
    );

    expect(parsed.type).toBe('following');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('rest_user');
    expect(parsed.hasNextPage).toBe(true);
    expect(parsed.endCursor).toBe('next_page_token');
  });

  it('correctly classifies following pagination even with generic incremental path when bodyHint contains BarcelonaProfileFollowingPaginationQuery', () => {
    const raw = {
      incremental: [
        {
          items: [
            {
              node: {
                pk: '7701',
                username: 'lazy_loaded_following',
                full_name: 'Following User 2',
              },
            },
          ],
          path: ['node', 'edges', 20],
        },
      ],
    };

    const parsed = ThreadsGraphQLParser.parse(
      raw,
      'https://www.threads.com/api/graphql',
      'doc_id=123&fb_api_req_friendly_name=BarcelonaProfileFollowingPaginationQuery&variables={"after":"cursor"}'
    );

    expect(parsed.type).toBe('following');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('lazy_loaded_following');
  });

  it('correctly classifies following when connection alias is generic and bodyHint specifies following', () => {
    const raw = {
      data: {
        node: {
          items: {
            edges: [
              {
                node: {
                  pk: '8801',
                  username: 'alias_following_user',
                },
              },
            ],
          },
        },
      },
    };

    const parsed = ThreadsGraphQLParser.parse(
      raw,
      'https://www.threads.net/api/graphql',
      'variables={"userID":"123","first":20}&query=edge_follow'
    );

    expect(parsed.type).toBe('following');
    expect(parsed.users).toHaveLength(1);
    expect(parsed.users[0].username).toBe('alias_following_user');
  });

  it('handles empty or malformed objects gracefully without throwing', () => {
    expect(ThreadsGraphQLParser.parse(null)).toEqual({ type: 'unknown', users: [] });
    expect(ThreadsGraphQLParser.parse({})).toEqual({ type: 'unknown', users: [] });
    expect(ThreadsGraphQLParser.parse({ data: {} })).toEqual({ type: 'unknown', users: [] });
  });
});
