export default defineContentScript({
  matches: ['*://*.threads.com/*', '*://*.threads.net/*'],
  runAt: 'document_start',
  main() {
    window.addEventListener('message', (event) => {
      if (
        event.source !== window ||
        event.data?.source !== 'THREADS_UNFOLLOWER_EXT'
      ) {
        return;
      }

      if (event.data.type === 'GRAPHQL_FOLLOWER_PAYLOAD') {
        try {
          if (!chrome.runtime?.id) return;
          chrome.runtime
            .sendMessage({
              action: 'PROCESS_RAW_THREADS_DATA',
              data: event.data.payload,
              url: event.data.url,
              bodyHint: event.data.bodyHint,
            })
            .catch(() => {
              // Worker is awakening or closed, safe to ignore
            });
        } catch {
          // Extension was reloaded or updated; context invalidated. Safe to ignore.
        }
      }
    });

    // 2. Bridge messages (PING & EXECUTE_UNFOLLOW)
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.action === 'PING') {
        sendResponse({ status: 'PONG', connected: true });
        return false;
      }

      if (message?.action === 'EXECUTE_UNFOLLOW') {
        const requestId = `unf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        const timeout = setTimeout(() => {
          window.removeEventListener('message', handleResponse);
          sendResponse({ success: false, error: 'TIMEOUT' });
        }, 15000);

        const handleResponse = (event: MessageEvent) => {
          if (
            event.source === window &&
            event.data?.source === 'THREADS_UNFOLLOWER_EXT_MAIN' &&
            event.data?.type === 'UNFOLLOW_RESULT' &&
            event.data?.requestId === requestId
          ) {
            clearTimeout(timeout);
            window.removeEventListener('message', handleResponse);
            sendResponse(event.data);
          }
        };

        window.addEventListener('message', handleResponse);

        window.postMessage(
          {
            source: 'THREADS_UNFOLLOWER_EXT_CONTENT',
            type: 'EXECUTE_UNFOLLOW',
            requestId,
            userId: message.userId,
            username: message.username,
          },
          '*'
        );

        return true; // Asynchronous response
      }
    });
  },
});
