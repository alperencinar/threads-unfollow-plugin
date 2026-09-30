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

  it('handles empty or malformed objects gracefully without throwing', () => {
    expect(ThreadsGraphQLParser.parse(null)).toEqual({ type: 'unknown', users: [] });
    expect(ThreadsGraphQLParser.parse({})).toEqual({ type: 'unknown', users: [] });
    expect(ThreadsGraphQLParser.parse({ data: {} })).toEqual({ type: 'unknown', users: [] });
  });
});
