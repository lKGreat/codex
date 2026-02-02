/**
 * Codex Electron - Settings Page
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  Switch,
  Button,
  Space,
  Typography,
  Divider,
  Table,
  Modal,
  Input,
  message,
  Segmented,
  Alert,
} from 'antd';
import {
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type {
  CodexConfig,
  ModelInfo,
  McpServerConfig,
  AppSettings,
  ApprovalPolicy,
  SandboxPolicy,
} from '../../types';

const { Title, Text, Paragraph } = Typography;

export const Settings: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CodexConfig | null>(null);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [mcpServers, setMcpServers] = useState<McpServerConfig[]>([]);
  const [mcpModalOpen, setMcpModalOpen] = useState(false);
  const [editingMcp, setEditingMcp] = useState<McpServerConfig | null>(null);
  const [mcpForm] = Form.useForm();

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);

        // Load app settings
        const settings = await window.electron.getSettings();
        setAppSettings(settings);

        // Load codex config
        const configResult = await window.codex.configRead();
        setConfig(configResult.config);
        setMcpServers(configResult.config.mcpServers || []);

        // Load available models
        const modelsResult = await window.codex.modelsList();
        setModels(modelsResult.models);

        // Set form values
        form.setFieldsValue({
          model: configResult.config.model,
          approvalPolicy: configResult.config.approvalPolicy || 'suggest',
          sandboxPolicy: configResult.config.sandboxPolicy || 'strict',
          windowMode: settings.windowMode,
          theme: settings.theme,
          minimizeToTray: settings.minimizeToTray,
          showNotifications: settings.showNotifications,
        });
      } catch (err) {
        console.error('Failed to load settings:', err);
        message.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [form]);

  // Save settings
  const handleSave = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue();

      // Save codex config
      await window.codex.configWriteBatch({
        updates: [
          { key: 'model', value: values.model },
          { key: 'approvalPolicy', value: values.approvalPolicy },
          { key: 'sandboxPolicy', value: values.sandboxPolicy },
          { key: 'mcpServers', value: mcpServers },
        ],
      });

      // Save app settings
      await window.electron.updateSettings({
        windowMode: values.windowMode,
        theme: values.theme,
        minimizeToTray: values.minimizeToTray,
        showNotifications: values.showNotifications,
      });

      message.success('Settings saved');
    } catch (err) {
      console.error('Failed to save settings:', err);
      message.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // MCP Server CRUD
  const handleAddMcp = () => {
    setEditingMcp(null);
    mcpForm.resetFields();
    setMcpModalOpen(true);
  };

  const handleEditMcp = (server: McpServerConfig) => {
    setEditingMcp(server);
    mcpForm.setFieldsValue({
      name: server.name,
      command: server.command,
      args: server.args?.join(' '),
    });
    setMcpModalOpen(true);
  };

  const handleDeleteMcp = (name: string) => {
    setMcpServers((prev) => prev.filter((s) => s.name !== name));
  };

  const handleSaveMcp = () => {
    mcpForm.validateFields().then((values) => {
      const server: McpServerConfig = {
        name: values.name,
        command: values.command,
        args: values.args ? values.args.split(' ').filter(Boolean) : undefined,
      };

      if (editingMcp) {
        setMcpServers((prev) =>
          prev.map((s) => (s.name === editingMcp.name ? server : s))
        );
      } else {
        setMcpServers((prev) => [...prev, server]);
      }

      setMcpModalOpen(false);
    });
  };

  const mcpColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Command',
      dataIndex: 'command',
      key: 'command',
    },
    {
      title: 'Arguments',
      dataIndex: 'args',
      key: 'args',
      render: (args: string[] | undefined) => args?.join(' ') || '-',
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_: any, record: McpServerConfig) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditMcp(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteMcp(record.name)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Title level={3}>Settings</Title>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={saving}
        >
          Save Changes
        </Button>
      </div>

      <Form form={form} layout="vertical" disabled={loading}>
        {/* Model Settings */}
        <Card title="Model" style={styles.card}>
          <Form.Item
            name="model"
            label="Default Model"
            tooltip="The AI model to use for conversations"
          >
            <Select
              placeholder="Select a model"
              options={models.map((m) => ({
                value: m.id,
                label: `${m.name} (${m.provider})`,
              }))}
              loading={loading}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Card>

        {/* Approval Settings */}
        <Card title="Approval Policy" style={styles.card}>
          <Alert
            type="info"
            message="Approval policy determines how the agent handles potentially dangerous operations."
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="approvalPolicy">
            <Segmented
              options={[
                {
                  value: 'suggest',
                  label: (
                    <div style={styles.segmentLabel}>
                      <Text strong>Suggest</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Ask for approval on all actions
                      </Text>
                    </div>
                  ),
                },
                {
                  value: 'autoEdit',
                  label: (
                    <div style={styles.segmentLabel}>
                      <Text strong>Auto Edit</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Auto-approve file edits, ask for commands
                      </Text>
                    </div>
                  ),
                },
                {
                  value: 'fullAuto',
                  label: (
                    <div style={styles.segmentLabel}>
                      <Text strong>Full Auto</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Auto-approve all actions
                      </Text>
                    </div>
                  ),
                },
              ]}
              block
            />
          </Form.Item>
        </Card>

        {/* Sandbox Settings */}
        <Card title="Sandbox Policy" style={styles.card}>
          <Alert
            type="warning"
            message="Sandbox policy controls the security restrictions on command execution."
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="sandboxPolicy">
            <Segmented
              options={[
                {
                  value: 'strict',
                  label: (
                    <div style={styles.segmentLabel}>
                      <Text strong>Strict</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Full sandboxing, limited access
                      </Text>
                    </div>
                  ),
                },
                {
                  value: 'permissive',
                  label: (
                    <div style={styles.segmentLabel}>
                      <Text strong>Permissive</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Some restrictions lifted
                      </Text>
                    </div>
                  ),
                },
                {
                  value: 'disabled',
                  label: (
                    <div style={styles.segmentLabel}>
                      <Text strong>Disabled</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        No sandboxing (dangerous)
                      </Text>
                    </div>
                  ),
                },
              ]}
              block
            />
          </Form.Item>
        </Card>

        {/* MCP Servers */}
        <Card
          title="MCP Servers"
          style={styles.card}
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddMcp}>
              Add Server
            </Button>
          }
        >
          <Paragraph type="secondary">
            Model Context Protocol (MCP) servers extend the agent's capabilities with
            custom tools and integrations.
          </Paragraph>
          <Table
            dataSource={mcpServers}
            columns={mcpColumns}
            rowKey="name"
            pagination={false}
            size="small"
            locale={{ emptyText: 'No MCP servers configured' }}
          />
        </Card>

        <Divider />

        {/* App Settings */}
        <Card title="Application" style={styles.card}>
          <Form.Item
            name="windowMode"
            label="Window Mode"
            tooltip="How to handle multiple sessions"
          >
            <Segmented
              options={[
                { value: 'multi', label: 'Multiple Windows' },
                { value: 'tabs', label: 'Tabs in Single Window' },
              ]}
            />
          </Form.Item>

          <Form.Item name="theme" label="Theme">
            <Segmented
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="minimizeToTray"
            label="Minimize to Tray"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="showNotifications"
            label="Show Notifications"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Card>
      </Form>

      {/* MCP Server Modal */}
      <Modal
        title={editingMcp ? 'Edit MCP Server' : 'Add MCP Server'}
        open={mcpModalOpen}
        onOk={handleSaveMcp}
        onCancel={() => setMcpModalOpen(false)}
      >
        <Form form={mcpForm} layout="vertical">
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true, message: 'Please enter a name' }]}
          >
            <Input placeholder="my-mcp-server" disabled={!!editingMcp} />
          </Form.Item>
          <Form.Item
            name="command"
            label="Command"
            rules={[{ required: true, message: 'Please enter the command' }]}
          >
            <Input placeholder="npx @my-org/mcp-server" />
          </Form.Item>
          <Form.Item name="args" label="Arguments">
            <Input placeholder="--option value" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 24,
    maxWidth: 800,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
  },
  segmentLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '4px 0',
  },
};
