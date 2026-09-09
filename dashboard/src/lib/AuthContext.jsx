import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

// Simplified for Basic Auth: no Base44 "app public settings" step, no token
// bootstrap, no separate login page. GET /api/me either succeeds (browser has
// a cached admin credential for this origin) or 401s — the browser's native
// prompt is what actually gates access; this just tracks the result for the UI.
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    checkUserAuth();
  }, [checkUserAuth]);

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      authChecked,
      logout,
      checkUserAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
