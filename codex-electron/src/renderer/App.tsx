/**
 * Codex Electron - Main App Component
 */

import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import { SessionList } from './pages/SessionList';
import { ChatSession } from './pages/ChatSession';
import { Login } from './pages/Login';
import { Settings } from './pages/Settings';
import { AppLayout } from './components/AppLayout';
import type { AppSettings } from '../types';

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
      <Route path="/" element={<AppLayout />}>
        <Route index element={<SessionList />} />
        <Route path="session/:threadId" element={<ChatSession />} />
        <Route path="login" element={<Login />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load settings
    window.electron.getSettings().then(setSettings);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (settings?.theme === 'system') {
        setIsDark(e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
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
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </AntApp>
    </ConfigProvider>
  );
};

export default App;
