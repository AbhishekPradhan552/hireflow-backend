'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('hireflow_token');
    const storedUser = localStorage.getItem('hireflow_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // ignore parse errors
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/login', { email, password });
    localStorage.setItem('hireflow_token', data.token);
    localStorage.setItem('hireflow_user', JSON.stringify(data.user));
    document.cookie = `hireflow_token=${data.token};path=/;max-age=604800;SameSite=Lax`;
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email, password) => {
    await api.post('/register', { email, password });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('hireflow_token');
    localStorage.removeItem('hireflow_user');
    document.cookie = 'hireflow_token=;path=/;max-age=0';
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
