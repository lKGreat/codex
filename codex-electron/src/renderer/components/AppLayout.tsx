/**
 * Codex Electron - App Layout Component
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Space,
  Typography,
  Badge,
  Tabs,
} from 'antd';
import {
  MessageOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { AccountReadResponse, AppSettings } from '../../types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [account, setAccount] = useState<AccountReadResponse | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [tabs, setTabs] = useState<Array<{ threadId: string; title: string }>>([]);

  useEffect(() => {
    // Load account info
    window.codex.accountRead().then(setAccount).catch(console.error);
    window.electron.getSettings().then(setSettings).catch(console.error);

    // Listen for account status updates
    const unsubscribe = window.codex.onNotification((notification) => {
      if (notification.type === 'accountStatus') {
        window.codex.accountRead().then(setAccount).catch(console.error);
      }
    });

    return unsubscribe;
  }, []);

  const handleNewSession = async () => {
    try {
      const result = await window.codex.threadStart({});
      if (settings?.windowMode === 'tabs') {
        navigate(`/session/${result.thread.id}`);
      } else {
        await window.codex.openSessionWindow(result.thread.id);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await window.codex.logout();
      setAccount({ loggedIn: false });
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const userMenuItems = [
    {
      key: 'account',
      label: account?.email || 'Not logged in',
      disabled: true,
    },
    { type: 'divider' as const },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => navigate('/settings'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: handleLogout,
      disabled: !account?.loggedIn,
    },
  ];

  const siderMenuItems = [
    {
      key: '/',
      icon: <MessageOutlined />,
      label: 'Sessions',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  // Check if we're in a session view
  const isSessionView = location.pathname.startsWith('/session/');
  const sessionId = isSessionView ? location.pathname.split('/session/')[1] : null;

  // Add current session to tabs
  useEffect(() => {
    const addTab = async (threadId: string) => {
      if (!threadId || settings?.windowMode !== 'tabs') return;

      setTabs((prev) => {
        if (prev.some((t) => t.threadId === threadId)) {
          return prev;
        }
        return [...prev, { threadId, title: threadId.slice(0, 8) }];
      });

      try {
        const thread = await window.codex.threadRead({ threadId });
        setTabs((prev) =>
          prev.map((t) =>
            t.threadId === threadId
              ? { ...t, title: thread.thread.name || thread.thread.preview || t.title }
              : t
          )
        );
      } catch (error) {
        console.error('Failed to read thread for tab title:', error);
      }
    };

    if (sessionId) {
      addTab(sessionId);
    }
  }, [sessionId, settings?.windowMode]);

  const handleTabChange = (activeKey: string) => {
    navigate(`/session/${activeKey}`);
  };

  const handleTabEdit = (targetKey: string, action: 'add' | 'remove') => {
    if (action === 'remove') {
      setTabs((prev) => prev.filter((t) => t.threadId !== targetKey));
      if (sessionId === targetKey) {
        const remaining = tabs.filter((t) => t.threadId !== targetKey);
        if (remaining.length > 0) {
          navigate(`/session/${remaining[remaining.length - 1].threadId}`);
        } else {
          navigate('/');
        }
      }
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {!isSessionView && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              padding: collapsed ? 0 : '0 16px',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            {!collapsed && (
              <Text strong style={{ fontSize: 16 }}>
                Codex
              </Text>
            )}
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
            />
          </div>

          <div style={{ padding: '12px 8px' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={handleNewSession}
            >
              {!collapsed && 'New Session'}
            </Button>
          </div>

          <Menu
            mode="inline"
            selectedKeys={[location.pathname]}
            items={siderMenuItems}
            onClick={({ key }) => navigate(key)}
            style={{ borderRight: 0 }}
          />
        </Sider>
      )}

      <Layout
        style={{
          marginLeft: isSessionView ? 0 : collapsed ? 80 : 200,
          transition: 'margin-left 0.2s',
        }}
      >
        <Header
          style={{
            padding: '0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            background: 'inherit',
          }}
        >
          <Space>
            {isSessionView && settings?.windowMode !== 'tabs' && (
              <Button type="text" onClick={() => navigate('/')}>
                ← Back to Sessions
              </Button>
            )}
          </Space>

          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Badge dot={account?.loggedIn} color="green" offset={[-4, 4]}>
                <Avatar
                  size="small"
                  src={account?.avatarUrl}
                  icon={<UserOutlined />}
                />
              </Badge>
              <Text>{account?.name || 'Guest'}</Text>
            </Space>
          </Dropdown>
        </Header>

        {isSessionView && settings?.windowMode === 'tabs' && tabs.length > 0 && (
          <div style={{ padding: '0 16px', borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <Tabs
              type="editable-card"
              hideAdd
              activeKey={sessionId || undefined}
              onChange={handleTabChange}
              onEdit={(targetKey, action) => handleTabEdit(targetKey as string, action as 'add' | 'remove')}
              items={tabs.map((tab) => ({
                key: tab.threadId,
                label: tab.title,
              }))}
            />
          </div>
        )}

        <Content
          style={{
            overflow: 'auto',
            height: isSessionView && settings?.windowMode === 'tabs'
              ? 'calc(100vh - 96px)'
              : 'calc(100vh - 48px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
