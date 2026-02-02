/**
 * Codex Electron - Login Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Input,
  Form,
  Typography,
  Space,
  Divider,
  Alert,
  Spin,
  Progress,
} from 'antd';
import {
  LoginOutlined,
  KeyOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import type { AccountReadResponse, RateLimitsReadResponse } from '../../types';

const { Title, Text, Paragraph } = Typography;

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountReadResponse | null>(null);
  const [rateLimits, setRateLimits] = useState<RateLimitsReadResponse | null>(null);
  const [loginMethod, setLoginMethod] = useState<'oauth' | 'apiKey'>('oauth');
  const [waitingForOAuth, setWaitingForOAuth] = useState(false);

  // Check current account status
  useEffect(() => {
    const checkAccount = async () => {
      try {
        const accountInfo = await window.codex.accountRead();
        setAccount(accountInfo);

        if (accountInfo.loggedIn) {
          const limits = await window.codex.rateLimitsRead();
          setRateLimits(limits);
          
          // If logged in and has workbook, redirect to home
          // If logged in but no workbook, redirect to workbook selector
          if (accountInfo.currentWorkbook) {
            navigate('/');
          } else {
            navigate('/select-workbook');
          }
        }
      } catch (err) {
        console.error('Failed to check account:', err);
      }
    };

    checkAccount();

    // Listen for login completion
    const unsubscribe = window.codex.onNotification((notification) => {
      if (notification.type === 'loginCompleted') {
        setWaitingForOAuth(false);
        if (notification.payload.success) {
          checkAccount();
        } else {
          setError(notification.payload.error || 'Login failed');
        }
      } else if (notification.type === 'accountStatus') {
        checkAccount();
      }
    });

    return unsubscribe;
  }, [navigate]);

  const handleOAuthLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.codex.loginStart({ type: 'chatgpt' });
      if (result.type === 'chatgpt' && result.authUrl) {
        setWaitingForOAuth(true);
        // Browser will be opened automatically by main process
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start login');
    } finally {
      setLoading(false);
    }
  };

  const handleApiKeyLogin = async (values: { apiKey: string }) => {
    setLoading(true);
    setError(null);

    try {
      await window.codex.loginStart({
        type: 'apiKey',
        apiKey: values.apiKey,
      });

      // Refresh account info
      const accountInfo = await window.codex.accountRead();
      setAccount(accountInfo);

      if (accountInfo.loggedIn) {
        const limits = await window.codex.rateLimitsRead();
        setRateLimits(limits);
        
        // Redirect to workbook selector after successful login
        navigate('/select-workbook');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid API key');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await window.codex.logout();
      setAccount({ loggedIn: false });
      setRateLimits(null);
    } catch (err: any) {
      setError(err.message || 'Failed to logout');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOAuth = async () => {
    try {
      await window.codex.loginCancel();
    } catch (err) {
      console.error('Failed to cancel login:', err);
    } finally {
      setWaitingForOAuth(false);
    }
  };

  // Logged in view
  if (account?.loggedIn) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <div style={styles.header}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <Title level={3} style={{ marginTop: 16 }}>
              已登录
            </Title>
          </div>

          <div style={styles.accountInfo}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div style={styles.infoRow}>
                <UserOutlined />
                <div>
                  <Text strong>{account.name || '用户'}</Text>
                  <br />
                  <Text type="secondary">{account.email}</Text>
                </div>
              </div>

              {rateLimits && rateLimits.limits.length > 0 && (
                <div style={styles.rateLimits}>
                  <Text type="secondary">使用情况</Text>
                  {rateLimits.limits.map((limit) => (
                    <div key={limit.name} style={styles.limitRow}>
                      <Text style={{ fontSize: 12 }}>{limit.name}</Text>
                      <Progress
                        percent={Math.round((limit.used / limit.limit) * 100)}
                        size="small"
                        status={
                          limit.used >= limit.limit ? 'exception' : 'normal'
                        }
                        format={() => `${limit.used}/${limit.limit}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </Space>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button block type="primary" onClick={() => navigate('/select-workbook')}>
              选择工作簿
            </Button>
            <Button block onClick={() => navigate('/')}>
              进入会话
            </Button>
            <Button block danger onClick={handleLogout} loading={loading}>
              退出登录
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Waiting for OAuth view
  if (waitingForOAuth) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <div style={styles.header}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Title level={3} style={{ marginTop: 16 }}>
              等待登录
            </Title>
            <Paragraph type="secondary">
              请在浏览器中完成登录，然后返回此处。
            </Paragraph>
          </div>

          <Button block onClick={handleCancelOAuth}>
            取消
          </Button>
        </Card>
      </div>
    );
  }

  // Login form view
  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        <div style={styles.header}>
          <img
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2310a37f'%3E%3Cpath d='M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z'/%3E%3C/svg%3E"
            alt="OpenAI"
            style={{ width: 48, height: 48 }}
          />
          <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
            登录 Codex
          </Title>
          <Text type="secondary">选择登录方式</Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* OAuth Login */}
        <Button
          type="primary"
          size="large"
          icon={<LoginOutlined />}
          block
          onClick={handleOAuthLogin}
          loading={loading && loginMethod === 'oauth'}
          style={{ marginBottom: 16 }}
        >
          使用 ChatGPT 登录
        </Button>

        <Divider>或</Divider>

        {/* API Key Login */}
        <Form onFinish={handleApiKeyLogin} layout="vertical">
          <Form.Item
            name="apiKey"
            rules={[{ required: true, message: '请输入您的 API 密钥' }]}
          >
            <Input.Password
              prefix={<KeyOutlined />}
              placeholder="输入您的 OpenAI API 密钥"
              size="large"
            />
          </Form.Item>
          <Form.Item>
            <Button
              type="default"
              htmlType="submit"
              size="large"
              block
              loading={loading && loginMethod === 'apiKey'}
              onClick={() => setLoginMethod('apiKey')}
            >
              使用 API 密钥登录
            </Button>
          </Form.Item>
        </Form>

        <Paragraph type="secondary" style={{ fontSize: 12, textAlign: 'center' }}>
          登录即表示您同意{' '}
          <a
            href="https://openai.com/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            服务条款
          </a>{' '}
          和{' '}
          <a
            href="https://openai.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            隐私政策
          </a>
        </Paragraph>
      </Card>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100%',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 400,
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  accountInfo: {
    marginBottom: 24,
    padding: 16,
    background: '#f5f5f5',
    borderRadius: 8,
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  rateLimits: {
    marginTop: 8,
  },
  limitRow: {
    marginTop: 8,
  },
};
