/**
 * Codex Electron - Main App Component
 */

import React, { useEffect, useState, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp, Spin } from 'antd';
import { SessionList } from './pages/SessionList';
import { ChatSession } from './pages/ChatSession';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { WorkbookSelector } from './pages/WorkbookSelector';
import { AppLayout } from './components/AppLayout';
import type { AppSettings, AccountReadResponse } from '../types';

// Auth context for global auth state
interface AuthContextType {
  account: AccountReadResponse | null;
  loading: boolean;
  refreshAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  account: null,
  loading: true,
  refreshAccount: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Auth guard component
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { account, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!account?.loggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Logged in but no workbook selected - redirect to workbook selector
  if (!account.currentWorkbook) {
    return <Navigate to="/select-workbook" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Listen for navigation events from main process
    const unsubscribe = window.electron.onNavigate((path) => {
      navigate(path);
    });
    return unsubscribe;
  }, [navigate]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/select-workbook" element={<WorkbookSelector />} />
      
      {/* Protected routes */}
      <Route path="/" element={
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      }>
        <Route index element={<SessionList />} />
        <Route path="session/:threadId" element={<ChatSession />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [account, setAccount] = useState<AccountReadResponse | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Load account info
  const refreshAccount = async () => {
    try {
      const accountInfo = await window.codex.accountRead();
      setAccount(accountInfo);
    } catch (err) {
      console.error('Failed to load account:', err);
      setAccount({ loggedIn: false });
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    // Load settings
    window.electron.getSettings().then(setSettings);

    // Load account info
    refreshAccount();

    // Listen for account status updates
    const unsubscribe = window.codex.onNotification((notification) => {
      if (notification.type === 'accountStatus' || notification.type === 'loginCompleted') {
        refreshAccount();
      }
    });

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (settings?.theme === 'system') {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      unsubscribe();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (settings) {
      if (settings.theme === 'system') {
        setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
      } else {
        setIsDark(settings.theme === 'dark');
      }
    }
  }, [settings?.theme]);

  // Apply dark class to body
  useEffect(() => {
    document.body.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#10a37f', // OpenAI green
          borderRadius: 6,
        },
      }}
    >
      <AntApp>
        <AuthContext.Provider value={{ account, loading: authLoading, refreshAccount }}>
          <HashRouter>
            <AppRoutes />
          </HashRouter>
        </AuthContext.Provider>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
