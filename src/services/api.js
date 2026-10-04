import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../config/campus';

// NOTE: no default Content-Type. Axios picks application/json for plain objects and
// multipart/form-data (with boundary) for FormData. A hard-coded JSON header would make
// axios serialise FormData to JSON and silently drop the attendance photo.
const api = axios.create({ baseURL: API_BASE_URL, timeout: 20000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.token);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const AUTH_ENDPOINTS = ['/auth/login', '/auth/forgot-password-email', '/auth/reset-password'];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const res = error.response;
    const url = error.config?.url || '';
    const method = (error.config?.method || 'get').toUpperCase();

    // No response at all: offline / server down / CORS / timeout
    if (!res) {
      error.isNetworkError = true;
      return Promise.reject(error);
    }

    // Express answers unknown routes with an HTML "Cannot GET /api/..." page. Many pages in this app
    // were written before their backend endpoint existed; turn that into a readable message
    // (pages read either .message or .error).
    if (res.status === 404 && typeof res.data === 'string') {
      const msg = `This feature isn't available on the server yet (${method} ${url}).`;
      error.notImplemented = true;
      res.data = { message: msg, error: msg };
    }

    // Expired / invalid session -> let AuthProvider clear it (React Router then redirects to /login).
    const serverMsg = res.data?.error || res.data?.message || '';
    const badSession =
      res.status === 401 || (res.status === 403 && /invalid or expired token/i.test(serverMsg));
    if (badSession && !AUTH_ENDPOINTS.some((p) => url.startsWith(p))) {
      window.dispatchEvent(new Event('mtt:unauthorized'));
    }
    return Promise.reject(error);
  }
);

// The backend uses { error } on most routes and { message } on the QR routes.
export function getErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.isNetworkError) return 'Cannot reach the server. Check your connection.';
  return err?.response?.data?.error || err?.response?.data?.message || fallback;
}

export default api;
