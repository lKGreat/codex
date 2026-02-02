/**
 * Codex Electron - Workbook Selector Page
 * Displays available workbooks for user selection after login
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Typography,
  Space,
  Alert,
  Spin,
  List,
  Radio,
} from 'antd';
import {
  BookOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import type { Workbook, AccountReadResponse } from '../../types';

const { Title, Text, Paragraph } = Typography;

export const WorkbookSelector: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workbooks, setWorkbooks] = useState<Workbook[]>([]);
  const [selectedWorkbook, setSelectedWorkbook] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountReadResponse | null>(null);

  // Check login status and load workbooks
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First check if user is logged in
        const accountInfo = await window.codex.accountRead();
        setAccount(accountInfo);

        if (!accountInfo.loggedIn) {
          // Not logged in, redirect to login page
          navigate('/login');
          return;
        }

        // If user already has a workbook selected, go to home
        if (accountInfo.currentWorkbook) {
          navigate('/');
          return;
        }

        // Load available workbooks
        const result = await window.codex.workbookList();
        setWorkbooks(result.workbooks);

        // Auto-select default workbook if available
        const defaultWorkbook = result.workbooks.find((w) => w.isDefault);
        if (defaultWorkbook) {
          setSelectedWorkbook(defaultWorkbook.id);
        } else if (result.workbooks.length === 1) {
          // Auto-select if only one workbook
          setSelectedWorkbook(result.workbooks[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load workbooks:', err);
        setError(err.message || '加载工作簿列表失败');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleSelectWorkbook = async () => {
    if (!selectedWorkbook) {
      setError('请选择一个工作簿');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await window.codex.workbookSelect({ workbookId: selectedWorkbook });
      navigate('/');
    } catch (err: any) {
      console.error('Failed to select workbook:', err);
      setError(err.message || '选择工作簿失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.codex.logout();
      navigate('/login');
    } catch (err: any) {
      console.error('Failed to logout:', err);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <div style={styles.header}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
            <Title level={3} style={{ marginTop: 16 }}>
              加载工作簿...
            </Title>
          </div>
        </Card>
      </div>
    );
  }

  // No workbooks available
  if (workbooks.length === 0) {
    return (
      <div style={styles.container}>
        <Card style={styles.card}>
          <div style={styles.header}>
            <FolderOutlined style={{ fontSize: 48, color: '#faad14' }} />
            <Title level={3} style={{ marginTop: 16 }}>
              暂无可用工作簿
            </Title>
            <Paragraph type="secondary">
              您的账户下没有可用的工作簿，请联系管理员添加工作簿。
            </Paragraph>
          </div>

          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Button block onClick={() => window.location.reload()}>
              刷新
            </Button>
            <Button block danger onClick={handleLogout}>
              退出登录
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Workbook selection view
  return (
    <div style={styles.container}>
      <Card style={styles.card}>
        <div style={styles.header}>
          <BookOutlined style={{ fontSize: 48, color: '#10a37f' }} />
          <Title level={3} style={{ marginTop: 16, marginBottom: 8 }}>
            选择工作簿
          </Title>
          {account && (
            <Text type="secondary">
              欢迎回来，{account.name || account.email}
            </Text>
          )}
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

        <div style={styles.workbookList}>
          <Radio.Group
            value={selectedWorkbook}
            onChange={(e) => setSelectedWorkbook(e.target.value)}
            style={{ width: '100%' }}
          >
            <List
              dataSource={workbooks}
              renderItem={(workbook) => (
                <List.Item
                  style={{
                    ...styles.workbookItem,
                    borderColor: selectedWorkbook === workbook.id ? '#10a37f' : '#f0f0f0',
                    backgroundColor: selectedWorkbook === workbook.id ? '#f6ffed' : '#fff',
                  }}
                  onClick={() => setSelectedWorkbook(workbook.id)}
                >
                  <Radio value={workbook.id} style={{ marginRight: 12 }} />
                  <div style={{ flex: 1 }}>
                    <div style={styles.workbookName}>
                      {workbook.name}
                      {workbook.isDefault && (
                        <CheckCircleOutlined
                          style={{ marginLeft: 8, color: '#10a37f', fontSize: 14 }}
                        />
                      )}
                    </div>
                    {workbook.description && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {workbook.description}
                      </Text>
                    )}
                  </div>
                </List.Item>
              )}
            />
          </Radio.Group>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Button
            type="primary"
            size="large"
            block
            onClick={handleSelectWorkbook}
            loading={submitting}
            disabled={!selectedWorkbook}
          >
            进入工作簿
          </Button>
          <Button block onClick={handleLogout}>
            切换账户
          </Button>
        </Space>
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
    maxWidth: 480,
  },
  header: {
    textAlign: 'center',
    marginBottom: 24,
  },
  workbookList: {
    marginBottom: 24,
    maxHeight: 300,
    overflow: 'auto',
  },
  workbookItem: {
    cursor: 'pointer',
    padding: '12px 16px',
    border: '2px solid #f0f0f0',
    borderRadius: 8,
    marginBottom: 8,
    transition: 'all 0.2s',
  },
  workbookName: {
    fontWeight: 500,
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
  },
};
