/**
 * Codex Electron - Session List Page
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Button,
  Space,
  Input,
  Tag,
  Dropdown,
  Modal,
  Typography,
  Empty,
  Tooltip,
  Segmented,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  MoreOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  EditOutlined,
  BranchesOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ThreadMetadata } from '../../types';

const { Text, Paragraph } = Typography;

export const SessionList: React.FC = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<ThreadMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [searchText, setSearchText] = useState('');
  const [showArchived, setShowArchived] = useState<'active' | 'archived' | 'all'>('active');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.codex.threadList({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        includeArchived: showArchived !== 'active',
      });

      let filtered = result.threads;
      
      // Client-side filtering for archived status
      if (showArchived === 'archived') {
        filtered = filtered.filter((s) => s.archivedAt);
      } else if (showArchived === 'active') {
        filtered = filtered.filter((s) => !s.archivedAt);
      }

      // Client-side search filtering
      if (searchText) {
        const search = searchText.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.preview.toLowerCase().includes(search) ||
            s.name?.toLowerCase().includes(search) ||
            s.cwd.toLowerCase().includes(search)
        );
      }

      setSessions(filtered);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, showArchived, searchText]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleNewSession = async () => {
    try {
      const result = await window.codex.threadStart({});
      navigate(`/session/${result.thread.id}`);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const handleOpenSession = (threadId: string) => {
    navigate(`/session/${threadId}`);
  };

  const handleOpenInNewWindow = async (threadId: string) => {
    await window.codex.openSessionWindowForce(threadId);
  };

  const handleArchive = async (threadId: string) => {
    try {
      await window.codex.threadArchive({ threadId });
      loadSessions();
    } catch (error) {
      console.error('Failed to archive session:', error);
    }
  };

  const handleUnarchive = async (threadId: string) => {
    try {
      await window.codex.threadUnarchive({ threadId });
      loadSessions();
    } catch (error) {
      console.error('Failed to unarchive session:', error);
    }
  };

  const handleBranch = async (threadId: string) => {
    try {
      const result = await window.codex.threadBranch({ threadId });
      navigate(`/session/${result.thread.id}`);
    } catch (error) {
      console.error('Failed to branch session:', error);
    }
  };

  const handleRename = async (threadId: string) => {
    if (!newName.trim()) return;
    try {
      await window.codex.threadSetName({ threadId, name: newName });
      setEditingName(null);
      setNewName('');
      loadSessions();
    } catch (error) {
      console.error('Failed to rename session:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getActionItems = (record: ThreadMetadata) => [
    {
      key: 'open',
      icon: <FolderOpenOutlined />,
      label: 'Open',
      onClick: () => handleOpenSession(record.id),
    },
    {
      key: 'openWindow',
      icon: <ExportOutlined />,
      label: 'Open in New Window',
      onClick: () => handleOpenInNewWindow(record.id),
    },
    {
      key: 'branch',
      icon: <BranchesOutlined />,
      label: 'Branch',
      onClick: () => handleBranch(record.id),
    },
    {
      key: 'rename',
      icon: <EditOutlined />,
      label: 'Rename',
      onClick: () => {
        setEditingName(record.id);
        setNewName(record.name || '');
      },
    },
    { type: 'divider' as const },
    record.archivedAt
      ? {
          key: 'unarchive',
          icon: <FolderOutlined />,
          label: 'Unarchive',
          onClick: () => handleUnarchive(record.id),
        }
      : {
          key: 'archive',
          icon: <DeleteOutlined />,
          label: 'Archive',
          onClick: () => handleArchive(record.id),
        },
  ];

  const columns: ColumnsType<ThreadMetadata> = [
    {
      title: 'Session',
      key: 'session',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>
            {record.name || record.preview.slice(0, 50) + (record.preview.length > 50 ? '...' : '')}
          </Text>
          {record.name && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.preview.slice(0, 60)}...
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Directory',
      dataIndex: 'cwd',
      key: 'cwd',
      width: 200,
      render: (cwd: string) => (
        <Tooltip title={cwd}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {cwd.split(/[/\\]/).slice(-2).join('/')}
          </Text>
        </Tooltip>
      ),
    },
    {
      title: 'Model',
      dataIndex: 'modelProvider',
      key: 'modelProvider',
      width: 100,
      render: (provider: string) => <Tag>{provider}</Tag>,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 120,
      render: (timestamp: number) => (
        <Text type="secondary">{formatDate(timestamp)}</Text>
      ),
      sorter: (a, b) => b.updatedAt - a.updatedAt,
      defaultSortOrder: 'descend',
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) =>
        record.archivedAt ? (
          <Tag color="default">Archived</Tag>
        ) : (
          <Tag color="green">Active</Tag>
        ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
      render: (_, record) => (
        <Dropdown menu={{ items: getActionItems(record) }} trigger={['click']}>
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}
      >
        <Space>
          <Input
            placeholder="Search sessions..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Segmented
            options={[
              { label: 'Active', value: 'active' },
              { label: 'Archived', value: 'archived' },
              { label: 'All', value: 'all' },
            ]}
            value={showArchived}
            onChange={(value) => setShowArchived(value as typeof showArchived)}
          />
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleNewSession}>
          New Session
        </Button>
      </div>

      {/* Sessions Table */}
      <Table
        columns={columns}
        dataSource={sessions}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
          showSizeChanger: false,
        }}
        onRow={(record) => ({
          onDoubleClick: () => handleOpenSession(record.id),
          style: { cursor: 'pointer' },
        })}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                showArchived === 'archived'
                  ? 'No archived sessions'
                  : 'No sessions yet'
              }
            >
              {showArchived !== 'archived' && (
                <Button type="primary" onClick={handleNewSession}>
                  Start your first session
                </Button>
              )}
            </Empty>
          ),
        }}
      />

      {/* Rename Modal */}
      <Modal
        title="Rename Session"
        open={!!editingName}
        onOk={() => editingName && handleRename(editingName)}
        onCancel={() => {
          setEditingName(null);
          setNewName('');
        }}
      >
        <Input
          placeholder="Enter session name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onPressEnter={() => editingName && handleRename(editingName)}
          autoFocus
        />
      </Modal>
    </div>
  );
};
