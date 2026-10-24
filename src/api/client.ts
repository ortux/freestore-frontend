import axios from 'axios';
import { config } from '../config';

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export const authApi = axios.create({
  baseURL: config.authBaseUrl,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Redirect to /login on 401, but only when we are not already on the login
 * page.  Without this guard, the auth-check that LoginPage itself triggers
 * (to decide whether to redirect to /dashboard) would fire a 401, the
 * interceptor would push /login again, and the whole page would reload in an
 * infinite loop.
 */
function redirectToLoginIfNeeded(): void {
  if (window.location.pathname !== '/login' && window.location.pathname !== '/auth/callback') {
    window.location.href = '/login';
  }
}

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      redirectToLoginIfNeeded();
    }
    return Promise.reject(err);
  }
);

authApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      redirectToLoginIfNeeded();
    }
    return Promise.reject(err);
  }
);
