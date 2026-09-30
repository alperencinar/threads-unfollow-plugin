export default defineUnlistedScript(() => {
  const originalFetch = window.fetch;

  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url =
        typeof args[0] === 'string'
          ? args[0]
          : (args[0] as Request)?.url || '';

      // Intercept threads.com and threads.net GraphQL endpoints
      if (
        url.includes('/api/graphql') ||
        url.includes('/graphql/query')
      ) {
        const clonedResponse = response.clone();
        clonedResponse
          .json()
          .then((payload) => {
            window.postMessage(
              {
                source: 'THREADS_UNFOLLOWER_EXT',
                type: 'GRAPHQL_FOLLOWER_PAYLOAD',
                payload,
              },
              '*'
            );
          })
          .catch(() => {
            // Ignore non-json or streaming chunks
          });
      }
    } catch {
      // Fail-safe: Never disrupt native application fetch flow
    }

    return response;
  };
});
