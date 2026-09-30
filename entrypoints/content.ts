export default defineContentScript({
  matches: ['*://*.threads.com/*', '*://*.threads.net/*'],
  runAt: 'document_start',
  async main() {
    try {
      await injectScript('/main-world-bridge.js', {
        keepInDom: false,
      });
    } catch (e) {
      console.warn('[Threads Unfollower] Main world injection deferred:', e);
    }

    window.addEventListener('message', (event) => {
      if (
        event.source !== window ||
        event.data?.source !== 'THREADS_UNFOLLOWER_EXT'
      ) {
        return;
      }

      if (event.data.type === 'GRAPHQL_FOLLOWER_PAYLOAD') {
        chrome.runtime
          .sendMessage({
            action: 'PROCESS_RAW_THREADS_DATA',
            data: event.data.payload,
          })
          .catch(() => {
            // Worker is awakening or closed, safe to ignore
          });
      }
    });
  },
});
