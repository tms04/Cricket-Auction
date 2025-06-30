import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthContextType, User } from '../types';
import * as api from '../api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Try to restore session from localStorage
    const savedToken = localStorage.getItem('auction_jwt');
    if (savedToken) {
      setToken(savedToken);
      api.setToken(savedToken);
      api.getMe().then(userData => {
        setUser(userData);
        setIsAuthenticated(true);
      }).catch(() => {
        setUser(null);
        setIsAuthenticated(false);
        setToken(null);
        api.setToken(null);
        localStorage.removeItem('auction_jwt');
      });
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login(email, password);
      setToken(res.token);
      api.setToken(res.token);
      localStorage.setItem('auction_jwt', res.token);
      setUser(res.user);
      setIsAuthenticated(true);
      return true;
    } catch (err) {
      setUser(null);
      setIsAuthenticated(false);
      setToken(null);
      api.setToken(null);
      localStorage.removeItem('auction_jwt');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setToken(null);
    api.setToken(null);
    localStorage.removeItem('auction_jwt');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};