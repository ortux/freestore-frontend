import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Shield } from 'lucide-react';
import { authApi } from '../api/client';
import type { UserProfile } from '../api/user';

/**
 * Handles the OAuth handoff token exchange.
 *
 * Flow:
 *   1. Backend redirects here after GitHub OAuth with ?token=<one-time-token>
 *   2. We POST the token to /auth/exchange on the configured API service
 *   3. The backend validates the token, calls req.logIn(), and sets the session
 *      cookie for the API service
 *   4. We prime the React Query cache with the returned user profile and
 *      navigate to /dashboard without any extra round-trips
 *
 * Error cases:
 *   - No token in URL         → redirect to /login?error=no_token
 *   - Token expired / invalid → redirect to /login?error=token_expired
 *   - Network / server error  → redirect to /login?error=exchange_failed
 */
export default function AuthCallbackPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  // useRef guard prevents the exchange being called twice in React StrictMode
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');

    // Keep one-time credentials out of browser history and later referrers.
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      navigate('/login?error=no_token', { replace: true });
      return;
    }

    authApi
      .post<{ success: boolean; data: UserProfile }>('/auth/exchange', { token })
      .then(({ data }) => {
        // Prime the user cache so ProtectedRoute resolves immediately —
        // no extra GET /api/v1/user round-trip needed.
        queryClient.setQueryData(['user'], data.data);
        navigate('/dashboard', { replace: true });
      })
      .catch((err) => {
        const status = err?.response?.status;
        if (!status) {
          // The exchange may have succeeded while its response was lost.
          // Check whether the session cookie was established before failing.
          authApi.get<{ success: boolean; data: UserProfile }>('/auth/me')
            .then(({ data }) => {
              queryClient.setQueryData(['user'], data.data);
              navigate('/dashboard', { replace: true });
            })
            .catch(() => navigate('/login?error=exchange_failed', { replace: true }));
          return;
        }
        const code   = status === 401 ? 'token_expired' : 'exchange_failed';
        navigate(`/login?error=${code}`, { replace: true });
      });
  }, [navigate, queryClient]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
          <Shield className="w-5 h-5 text-black" />
        </div>
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#555]">Completing sign-in…</p>
      </div>
    </div>
  );
}
