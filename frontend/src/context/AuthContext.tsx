// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  loginDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize user profile if token exists or set up default demo candidate
  useEffect(() => {
    let isMounted = true;

    async function loadUser() {
      const storedToken = localStorage.getItem('token');
      if (storedToken && !storedToken.startsWith('demo_')) {
        try {
          const me = await api.getMe();
          if (isMounted) setUser(me);
        } catch {
          // If token expired, clear invalid token
          localStorage.removeItem('token');
          if (isMounted) {
            setUser(null);
            setToken(null);
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
          setToken(null);
          localStorage.removeItem('token');
        }
      }
      if (isMounted) setIsLoading(false);
    }

    loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('token', res.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const res = await api.register({ email, password, full_name: fullName });
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('token', res.token);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
  }, []);

  const loginDemo = useCallback(() => {
    const demoUser: User = {
      id: 'usr_candidate_demo',
      email: 'alex.johnson@example.com',
      full_name: 'Alex Johnson',
    };
    setUser(demoUser);
    setToken('demo_token_mock_2026');
    localStorage.setItem('token', 'demo_token_mock_2026');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        register,
        logout,
        loginDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
