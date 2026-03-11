import { useState, useCallback, useEffect } from 'react';
import { api } from '../utils/api';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}

interface LoginResponse {
  token: string;
}

interface RegisterResponse {
  id: string;
  email: string;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(() => {
    const token = localStorage.getItem('token');
    return { token, isAuthenticated: !!token };
  });

  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem('token');
      setAuth({ token, isAuthenticated: !!token });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/api/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setAuth({ token: data.token, isAuthenticated: true });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    return api.post<RegisterResponse>('/api/auth/register', { email, password });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuth({ token: null, isAuthenticated: false });
  }, []);

  return { ...auth, login, register, logout };
}
