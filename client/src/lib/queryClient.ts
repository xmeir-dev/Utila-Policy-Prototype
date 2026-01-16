/**
 * queryClient.ts
 * 
 * Configures TanStack Query for data fetching throughout the app.
 * Provides a centralized API request helper and default query behavior.
 * 
 * Key design decisions:
 * - staleTime: Infinity prevents automatic refetching (data managed via invalidation)
 * - retry: false avoids hammering the server on transient errors
 * - credentials: "include" ensures auth cookies are sent with requests
 */

import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Converts non-OK responses into thrown errors for consistent error handling.
 * This allows mutations and queries to use try/catch or .onError callbacks.
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Centralized API request helper for mutations.
 * Handles JSON serialization and error checking consistently.
 * Returns the raw Response for flexibility (caller can .json() if needed).
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Factory for creating query functions with configurable 401 handling.
 * Uses queryKey as the URL - enables automatic cache invalidation by key.
 */
type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    // Allow graceful handling of auth errors where needed
    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Global query client with conservative defaults.
 * Disables automatic refetching to give full control over cache invalidation.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
