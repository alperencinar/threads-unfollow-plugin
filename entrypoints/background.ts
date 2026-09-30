import { LocalDatabase } from '../src/infrastructure/storage/LocalDatabase';
import { ThreadsGraphQLParser } from '../src/infrastructure/parser/ThreadsGraphQLParser';
import { FollowerSnapshot } from '../src/domain/entities';

const db = new LocalDatabase();

export default defineBackground(() => {
  // Automatically open the side panel when the user clicks the extension action icon
  if (chrome.sidePanel && 'setPanelBehavior' in chrome.sidePanel) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch(() => {});
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.action === 'PROCESS_RAW_THREADS_DATA') {
      handleRawThreadsData(message.data)
        .then(() => sendResponse({ status: 'OK' }))
        .catch((err) => sendResponse({ status: 'ERROR', error: String(err) }));
      return true; // Asynchronous reply
    }

    if (message?.action === 'GET_DATABASE_STATUS') {
      sendResponse({ status: 'ONLINE', platform: 'threads.com' });
      return false;
    }
  });
});

async function handleRawThreadsData(raw: unknown): Promise<void> {
  const parsed = ThreadsGraphQLParser.parse(raw);
  if (parsed.type === 'unknown' || parsed.users.length === 0) {
    return;
  }

  const targetUserId = parsed.targetUserId || 'current_user';
  const [latest] = await db.getLatestSnapshots(targetUserId);

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

  const newSnapshot: FollowerSnapshot = {
    id: `snap_${Date.now()}`,
    timestamp: Date.now(),
    targetUserId,
    platform: 'threads.com',
    followers: updatedFollowers,
    following: updatedFollowing,
  };

  await db.saveSnapshot(newSnapshot);

  // Notify active Side Panel UI of the new snapshot
  chrome.runtime.sendMessage({
    action: 'DATABASE_UPDATED',
    targetUserId,
    timestamp: newSnapshot.timestamp,
  }).catch(() => {
    // Side Panel might be closed, perfectly safe
  });
}
