/**
 * Codex Electron - Command Execution Output Component
 */

import React, { useState } from 'react';
import { Collapse, Space, Typography, Tag, Button, Tooltip } from 'antd';
import {
  CodeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  CopyOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ExecOutputProps {
  command: string[];
  cwd: string;
  output: string;
  exitCode?: number;
  status: 'running' | 'completed' | 'failed' | 'approved' | 'rejected';
}

export const ExecOutput: React.FC<ExecOutputProps> = ({
  command,
  cwd,
  output,
  exitCode,
  status,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'approved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <CodeOutlined />;
    }
  };

  const getStatusTag = () => {
    switch (status) {
      case 'running':
        return <Tag color="processing">Running</Tag>;
      case 'completed':
        return <Tag color="success">Exit: {exitCode ?? 0}</Tag>;
      case 'failed':
        return <Tag color="error">Exit: {exitCode ?? 1}</Tag>;
      case 'approved':
        return <Tag color="success">Approved</Tag>;
      case 'rejected':
        return <Tag color="error">Rejected</Tag>;
      default:
        return null;
    }
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(command.join(' '));
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output);
  };

  const commandStr = command.join(' ');
  const truncatedCommand =
    commandStr.length > 60 ? commandStr.slice(0, 60) + '...' : commandStr;

  return (
    <Collapse
      size="small"
      defaultActiveKey={status === 'running' ? ['1'] : []}
      items={[
        {
          key: '1',
          label: (
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                {getStatusIcon()}
                <Tooltip title={commandStr}>
                  <Text code style={{ maxWidth: 400 }}>
                    {truncatedCommand}
                  </Text>
                </Tooltip>
              </Space>
              <Space>
                {getStatusTag()}
                <Tooltip title="Copy command">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopyCommand();
                    }}
                  />
                </Tooltip>
              </Space>
            </Space>
          ),
          children: (
            <div>
              {/* Working directory */}
              <div style={styles.cwdRow}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Working directory: {cwd}
                </Text>
              </div>

              {/* Output */}
              <div style={styles.outputContainer}>
                <div style={styles.outputHeader}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Output
                  </Text>
                  <Space>
                    <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
                      <Button
                        type="text"
                        size="small"
                        icon={expanded ? <CompressOutlined /> : <ExpandOutlined />}
                        onClick={() => setExpanded(!expanded)}
                      />
                    </Tooltip>
                    <Tooltip title="Copy output">
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={handleCopyOutput}
                      />
                    </Tooltip>
                  </Space>
                </div>
                <pre
                  className="terminal-output"
                  style={{
                    ...styles.output,
                    maxHeight: expanded ? 'none' : 200,
                  }}
                >
                  {output || '(no output)'}
                  {status === 'running' && (
                    <span className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                  )}
                </pre>
              </div>
            </div>
          ),
        },
      ]}
    />
  );
};

const styles: Record<string, React.CSSProperties> = {
  cwdRow: {
    marginBottom: 8,
  },
  outputContainer: {
    marginTop: 8,
  },
  outputHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  output: {
    margin: 0,
    overflow: 'auto',
  },
};
