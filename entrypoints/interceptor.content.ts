export default defineContentScript({
  matches: ['*://*.threads.com/*', '*://*.threads.net/*'],
  runAt: 'document_start',
  world: 'MAIN',
  main() {
    const originalFetch = window.fetch;

    function dispatchPayload(url: string, payload: unknown, bodyHint?: string) {
      if (!payload || typeof payload !== 'object') return;
      window.postMessage(
        {
          source: 'THREADS_UNFOLLOWER_EXT',
          type: 'GRAPHQL_FOLLOWER_PAYLOAD',
          url,
          bodyHint,
          payload,
        },
        '*'
      );
    }

    function processText(url: string, text: string, bodyHint?: string) {
      if (!text || text.length < 5) return;

      // 1. Try direct JSON.parse
      try {
        const json = JSON.parse(text);
        dispatchPayload(url, json, bodyHint);
        return;
      } catch {}

      // 2. Try removing Meta's security prefix for (;;);
      try {
        const cleaned = text.replace(/^for\s*\(\s*;\s*;\s*\)\s*;\s*/, '');
        const json = JSON.parse(cleaned);
        dispatchPayload(url, json, bodyHint);
        return;
      } catch {}

      // 3. Try splitting Newline-Delimited JSON (NDJSON) or multipart/stream chunks
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          try {
            const json = JSON.parse(trimmed);
            dispatchPayload(url, json, bodyHint);
          } catch {}
        }
      }
    }

    function extractBodyHint(input: unknown, init?: RequestInit): string {
      try {
        let body = init?.body;
        if (!body && input instanceof Request) {
          body = (input as any)._bodyInit || (input as any).body;
        }
        if (typeof body === 'string') {
          return body;
        }
        if (body instanceof URLSearchParams) {
          return body.toString();
        }
        if (body instanceof FormData) {
          const parts: string[] = [];
          body.forEach((val, key) => {
            if (typeof val === 'string') parts.push(`${key}=${val}`);
          });
          return parts.join('&');
        }
      } catch {}
      return '';
    }

    // 1. Hook window.fetch (Relay & Modern SPA)
    window.fetch = async function (...args) {
      const response = await originalFetch.apply(this, args);

      try {
        const url =
          typeof args[0] === 'string'
            ? args[0]
            : (args[0] as Request)?.url || '';

        if (
          url.includes('/graphql') ||
          url.includes('/api/graphql') ||
          url.includes('/api/v1/friendships') ||
          url.includes('/api/v1/') ||
          url.includes('query')
        ) {
          const bodyHint = extractBodyHint(args[0], args[1]);
          const clonedResponse = response.clone();
          clonedResponse
            .text()
            .then((text) => processText(url, text, bodyHint))
            .catch(() => {});
        }
      } catch {
        // Fail-safe: Never disrupt native application fetch flow
      }

      return response;
    };

    // 2. Hook XMLHttpRequest (Legacy fallback)
    try {
      const xhrProto = XMLHttpRequest.prototype as any;
      const originalOpen = xhrProto.open;
      const originalSend = xhrProto.send;

      xhrProto.open = function (this: XMLHttpRequest, ...args: any[]) {
        (this as any)._hookedUrl = typeof args[1] === 'string' ? args[1] : String(args[1] || '');
        return originalOpen.apply(this, args);
      };

      xhrProto.send = function (this: XMLHttpRequest, ...args: any[]) {
        const bodyHint = typeof args[0] === 'string' ? args[0] : '';
        this.addEventListener('load', function () {
          try {
            const url = (this as any)._hookedUrl || '';
            if (
              url.includes('/graphql') ||
              url.includes('/api/graphql') ||
              url.includes('/api/v1/friendships') ||
              url.includes('/api/v1/') ||
              url.includes('query')
            ) {
              processText(url, this.responseText, bodyHint);
            }
          } catch {}
        });
        return originalSend.apply(this, args);
      };
    } catch {
      // Safe fallback if XHR is restricted
    }

    // 3. Listen for EXECUTE_UNFOLLOW commands from extension content script
    window.addEventListener('message', async (event) => {
      if (
        event.source !== window ||
        event.data?.source !== 'THREADS_UNFOLLOWER_EXT_CONTENT' ||
        event.data?.type !== 'EXECUTE_UNFOLLOW'
      ) {
        return;
      }

      const { requestId, userId } = event.data;
      try {
        const csrfMatch = document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/);
        const csrf = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';

        const res = await originalFetch(`/api/v1/friendships/destroy/${userId}/`, {
          method: 'POST',
          headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'x-csrftoken': csrf,
            'x-ig-app-id': '238260118697367',
            'x-asbd-id': '129477',
            'x-requested-with': 'XMLHttpRequest',
          },
          credentials: 'include',
        });

        const data = await res.json().catch(() => null);

        if (res.ok && (data?.status === 'ok' || data?.friendship_status)) {
          window.postMessage(
            {
              source: 'THREADS_UNFOLLOWER_EXT_MAIN',
              type: 'UNFOLLOW_RESULT',
              requestId,
              success: true,
              status: res.status,
              data,
            },
            '*'
          );
        } else {
          const isRateLimit =
            res.status === 429 ||
            res.status === 400 ||
            data?.message === 'checkpoint_required' ||
            Boolean(data?.feedback_required);

          window.postMessage(
            {
              source: 'THREADS_UNFOLLOWER_EXT_MAIN',
              type: 'UNFOLLOW_RESULT',
              requestId,
              success: false,
              status: res.status,
              isRateLimit,
              error: isRateLimit
                ? 'RATE_LIMIT'
                : (data?.message || `HTTP_${res.status}`),
            },
            '*'
          );
        }
      } catch (err) {
        window.postMessage(
          {
            source: 'THREADS_UNFOLLOWER_EXT_MAIN',
            type: 'UNFOLLOW_RESULT',
            requestId,
            success: false,
            status: 500,
            error: String(err),
          },
          '*'
        );
      }
    });
  },
});
