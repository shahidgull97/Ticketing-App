import axios from 'axios';

const TOKEN_KEY = 'ticketing.tokens';
const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const tokenStore = {
  get() {
    try {
      return JSON.parse(localStorage.getItem(TOKEN_KEY));
    } catch {
      return null;
    }
  },
  set(tokens) {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
  },
};

let onAuthLost = () => {};
export const setAuthLostHandler = (fn) => {
  onAuthLost = fn;
};

export const http = axios.create({ baseURL: BASE_URL });

http.interceptors.request.use((config) => {
  const tokens = tokenStore.get();
  if (tokens?.access) config.headers.Authorization = `Bearer ${tokens.access}`;
  return config;
});

let refreshing = null;

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthCall = config?.url?.startsWith('/auth/');
    if (response?.status === 401 && config && !config._retried && !isAuthCall) {
      config._retried = true;
      const tokens = tokenStore.get();
      if (tokens?.refresh) {
        try {
          refreshing ??= axios
            .post(`${BASE_URL}/auth/refresh/`, { refresh: tokens.refresh })
            .finally(() => {
              refreshing = null;
            });
          const { data } = await refreshing;
          tokenStore.set({ access: data.access, refresh: data.refresh || tokens.refresh });
          return http(config);
        } catch {
          /* fall through to logout */
        }
      }
      tokenStore.clear();
      onAuthLost();
    }
    throw error;
  },
);

/** Normalises any thrown error into { status, code, message, details } using the API's error envelope. */
export function parseApiError(error) {
  if (!error?.response) {
    return {
      status: 0,
      code: 'network_error',
      message: 'Cannot reach the server. Check your connection and try again.',
      details: {},
    };
  }
  const { status, data } = error.response;
  const body = data?.error;
  return {
    status,
    code: body?.code || 'error',
    message: body?.message || 'Something unexpected happened. Please try again.',
    details: body?.details || {},
  };
}

