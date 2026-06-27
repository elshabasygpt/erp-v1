import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

/**
 * Thin wrapper around useQuery that unifies the call signature to key + fetcher.
 * Inherits staleTime/retry defaults from QueryProvider.
 */
export function useApiQuery<T>(
    key: readonly unknown[],
    fetcher: () => Promise<T>,
    options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>,
) {
    return useQuery<T>({ queryKey: key, queryFn: fetcher, ...options });
}
