import { LocalDatabase } from '../src/infrastructure/storage/LocalDatabase';
import { ThreadsGraphQLParser } from '../src/infrastructure/parser/ThreadsGraphQLParser';
import { FollowerSnapshot } from '../src/domain/entities';

const db = new LocalDatabase();
const SESSION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export default defineBackground(() => {
  // Automatically open the side panel when the user clicks the extension action icon
  if (chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(() => {});
  }

  // Setup declarativeNetRequest rules to allow image loading from Meta CDN (*.fbcdn.net and *.cdninstagram.com)
  setupImageCORPRules();

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === 'PROCESS_RAW_THREADS_DATA') {
      handleRawThreadsData(message.data, message.url, message.bodyHint)
        .then(() => sendResponse({ status: 'OK' }))
        .catch((err) => sendResponse({ status: 'ERROR', error: String(err) }));
      return true; // Asynchronous reply
    }

    if (message?.action === 'GET_DATABASE_STATUS') {
      sendResponse({ status: 'ONLINE', platform: 'threads.com' });
      return false;
    }

    if (message?.action === 'UNFOLLOW_USER') {
      handleUnfollowUser(message.userId, message.username)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: String(err) }));
      return true;
    }
  });
});

async function handleUnfollowUser(
  userId: string,
  username: string
): Promise<{ success: boolean; status?: number; error?: string; isRateLimit?: boolean }> {
  try {
    const tabs = await chrome.tabs.query({
      url: ['*://*.threads.com/*', '*://*.threads.net/*'],
    });

    const activeTab = tabs.find((t) => t.active) || tabs[0];
    if (!activeTab?.id) {
      return { success: false, error: 'NO_THREADS_TAB' };
    }

    const result: any = await chrome.tabs.sendMessage(activeTab.id, {
      action: 'EXECUTE_UNFOLLOW',
      userId,
      username,
    });

    if (result?.success) {
      let targetUserId: string | undefined;
      if (chrome.storage?.local) {
        const stored = await chrome.storage.local.get(['lastActiveUserId']);
        if (typeof stored?.lastActiveUserId === 'string') {
          targetUserId = stored.lastActiveUserId;
        }
      }
      await db.removeFollowingUser(targetUserId, userId);

      chrome.runtime
        .sendMessage({
          action: 'USER_UNFOLLOWED',
          userId,
          username,
        })
        .catch(() => {});
    }

    return result || { success: false, error: 'NO_RESPONSE' };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

async function handleRawThreadsData(
  raw: unknown,
  url?: string,
  bodyHint?: string
): Promise<void> {
  const parsed = ThreadsGraphQLParser.parse(raw, url, bodyHint);
  if (parsed.type === 'unknown' || parsed.users.length === 0) {
    return;
  }

  // Retrieve stored active user ID if parsed doesn't provide one
  let targetUserId = parsed.targetUserId;
  if (!targetUserId && chrome.storage?.local) {
    try {
      const stored = await chrome.storage.local.get(['lastActiveUserId']);
      if (typeof stored?.lastActiveUserId === 'string') {
        targetUserId = stored.lastActiveUserId;
      }
    } catch {}
  }

  const [latest] = await db.getLatestSnapshots(targetUserId);
  if (!targetUserId && latest?.targetUserId) {
    targetUserId = latest.targetUserId;
  }
  if (!targetUserId) {
    targetUserId = 'current_user';
  }

  let updatedFollowers = latest ? [...latest.followers] : [];
  let updatedFollowing = latest ? [...latest.following] : [];

  if (parsed.type === 'followers') {
    const existingIds = new Set(updatedFollowers.map((u) => u.id));
    for (const user of parsed.users) {
      if (!existingIds.has(user.id)) {
        updatedFollowers.push(user);
        existingIds.add(user.id);
      }
    }
  } else if (parsed.type === 'following') {
    const existingIds = new Set(updatedFollowing.map((u) => u.id));
    for (const user of parsed.users) {
      if (!existingIds.has(user.id)) {
        updatedFollowing.push(user);
        existingIds.add(user.id);
      }
    }
  }

  const now = Date.now();
  let snapshotToSave: FollowerSnapshot;

  // Session accumulation: If latest snapshot was updated recently, update it in-place
  if (latest && now - latest.timestamp < SESSION_WINDOW_MS) {
    snapshotToSave = {
      ...latest,
      timestamp: now,
      followers: updatedFollowers,
      following: updatedFollowing,
    };
  } else {
    // New scanning session: create a new snapshot baseline
    snapshotToSave = {
      id: `snap_${now}`,
      timestamp: now,
      targetUserId,
      platform: 'threads.com',
      followers: updatedFollowers,
      following: updatedFollowing,
    };
  }

  await db.saveSnapshot(snapshotToSave);

  // Remember latest active user id
  if (chrome.storage?.local && targetUserId !== 'current_user') {
    chrome.storage.local.set({ lastActiveUserId: targetUserId }).catch(() => {});
  }

  // Notify active Side Panel UI of the new snapshot
  chrome.runtime.sendMessage({
    action: 'DATABASE_UPDATED',
    targetUserId,
    timestamp: snapshotToSave.timestamp,
    type: parsed.type,
    newCount: parsed.users.length,
    totalFollowers: updatedFollowers.length,
    totalFollowing: updatedFollowing.length,
  }).catch(() => {
    // Side Panel might be closed, perfectly safe
  });
}

function setupImageCORPRules(): void {
  if (!chrome.declarativeNetRequest?.updateDynamicRules) return;

  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: [1001, 1002],
      addRules: [
        {
          id: 1001,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            responseHeaders: [
              {
                header: 'Cross-Origin-Resource-Policy',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'cross-origin',
              },
              {
                header: 'Access-Control-Allow-Origin',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: '*',
              },
            ],
          },
          condition: {
            urlFilter: '||fbcdn.net',
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.IMAGE,
              chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            ],
          },
        },
        {
          id: 1002,
          priority: 1,
          action: {
            type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
            responseHeaders: [
              {
                header: 'Cross-Origin-Resource-Policy',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: 'cross-origin',
              },
              {
                header: 'Access-Control-Allow-Origin',
                operation: chrome.declarativeNetRequest.HeaderOperation.SET,
                value: '*',
              },
            ],
          },
          condition: {
            urlFilter: '||cdninstagram.com',
            resourceTypes: [
              chrome.declarativeNetRequest.ResourceType.IMAGE,
              chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
            ],
          },
        },
      ],
    })
    .catch(() => {});
}
