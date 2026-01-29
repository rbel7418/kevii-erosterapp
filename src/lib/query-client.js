import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new Proxy(new QueryClient({
        defaultOptions: {
                queries: {
                        refetchOnWindowFocus: false,
                        retry: 1,
                },
        },
}), {
  get: (target, prop) => {
    if (prop === 'fetchQuery' || prop === 'prefetchQuery') {
      return () => Promise.resolve([]);
    }
    return target[prop];
  }
});

export const queryClient = queryClientInstance;
