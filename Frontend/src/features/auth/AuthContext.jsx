import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../../api/endpoints';
import { setAuthLostHandler, tokenStore } from '../../api/http';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(Boolean(tokenStore.get()));

  const reset = useCallback(() => {
    tokenStore.clear();
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  useEffect(() => {
    setAuthLostHandler(reset);
    if (!tokenStore.get()) return;
    authApi
      .me()
      .then(setUser)
      .catch(() => reset())
      .finally(() => setInitialising(false));
  }, [reset]);

  const login = useCallback(
    async (username, password) => {
      const tokens = await authApi.login(username, password);
      queryClient.clear(); // never show another account's cached data
      tokenStore.set({ access: tokens.access, refresh: tokens.refresh });
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    [queryClient],
  );

  const value = useMemo(() => ({ user, initialising, login, logout: reset }), [user, initialising, login, reset]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
