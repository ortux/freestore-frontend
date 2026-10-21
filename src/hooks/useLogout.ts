import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../api/user';

/**
 * Logs the user out on the server, clears the React Query cache, then
 * redirects to /login.  Handles the case where the session is already gone
 * on the server (401) gracefully — we still clear the cache and redirect.
 */
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      // Clear all cached queries so no stale auth state leaks to the next user
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}
