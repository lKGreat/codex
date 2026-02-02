/**
 * Codex Electron - File Change Component
 */

import React, { useState } from 'react';
import { Collapse, Space, Typography, Tag, Button, Tooltip } from 'antd';
import {
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  ExpandOutlined,
  CompressOutlined,
} from '@ant-design/icons';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

const { Text } = Typography;

interface FileChangeProps {
  path: string;
  diff: string;
  status: 'pending' | 'applied' | 'rejected';
}

export const FileChange: React.FC<FileChangeProps> = ({ path, diff, status }) => {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'unified' | 'split'>('unified');

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'applied':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <FileOutlined />;
    }
  };

  const getStatusTag = () => {
    switch (status) {
      case 'pending':
        return <Tag color="warning">Pending</Tag>;
      case 'applied':
        return <Tag color="success">Applied</Tag>;
      case 'rejected':
        return <Tag color="error">Rejected</Tag>;
      default:
        return null;
    }
  };

  const handleCopyDiff = () => {
    navigator.clipboard.writeText(diff);
  };

  // Parse unified diff to get old and new content
  const parseDiff = (diffText: string): { oldValue: string; newValue: string } => {
    const lines = diffText.split('\n');
    const oldLines: string[] = [];
    const newLines: string[] = [];

    let inHunk = false;

    for (const line of lines) {
      // Skip diff headers
      if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
        inHunk = line.startsWith('@@');
        continue;
      }
      if (line.startsWith('diff ') || line.startsWith('index ')) {
        continue;
      }

      if (inHunk || !line.startsWith('diff ')) {
        if (line.startsWith('-')) {
          oldLines.push(line.slice(1));
        } else if (line.startsWith('+')) {
          newLines.push(line.slice(1));
        } else if (line.startsWith(' ')) {
          oldLines.push(line.slice(1));
          newLines.push(line.slice(1));
        } else {
          oldLines.push(line);
          newLines.push(line);
        }
      }
    }

    return {
      oldValue: oldLines.join('\n'),
      newValue: newLines.join('\n'),
    };
  };

  const { oldValue, newValue } = parseDiff(diff);

  // Get file extension for syntax highlighting
  const getLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      h: 'cpp',
      css: 'css',
      scss: 'scss',
      html: 'html',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
    };
    return langMap[ext || ''] || 'text';
  };

  // Count additions and deletions
  const additions = (diff.match(/^\+[^+]/gm) || []).length;
  const deletions = (diff.match(/^-[^-]/gm) || []).length;

  return (
    <Collapse
      size="small"
      defaultActiveKey={status === 'pending' ? ['1'] : []}
      items={[
        {
          key: '1',
          label: (
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Space>
                {getStatusIcon()}
                <Text strong>{path.split('/').pop()}</Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {path}
                </Text>
              </Space>
              <Space>
                <Text type="success" style={{ fontSize: 12 }}>
                  +{additions}
                </Text>
                <Text type="danger" style={{ fontSize: 12 }}>
                  -{deletions}
                </Text>
                {getStatusTag()}
              </Space>
            </Space>
          ),
          children: (
            <div>
              {/* Toolbar */}
              <div style={styles.toolbar}>
                <Space>
                  <Button
                    size="small"
                    type={viewMode === 'unified' ? 'primary' : 'default'}
                    onClick={() => setViewMode('unified')}
                  >
                    Unified
                  </Button>
                  <Button
                    size="small"
                    type={viewMode === 'split' ? 'primary' : 'default'}
                    onClick={() => setViewMode('split')}
                  >
                    Split
                  </Button>
                </Space>
                <Space>
                  <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
                    <Button
                      type="text"
                      size="small"
                      icon={expanded ? <CompressOutlined /> : <ExpandOutlined />}
                      onClick={() => setExpanded(!expanded)}
                    />
                  </Tooltip>
                  <Tooltip title="Copy diff">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined />}
                      onClick={handleCopyDiff}
                    />
                  </Tooltip>
                </Space>
              </div>

              {/* Diff viewer */}
              <div
                className="diff-viewer"
                style={{
                  maxHeight: expanded ? 'none' : 400,
                  overflow: 'auto',
                }}
              >
                <ReactDiffViewer
                  oldValue={oldValue}
                  newValue={newValue}
                  splitView={viewMode === 'split'}
                  compareMethod={DiffMethod.WORDS}
                  useDarkTheme={document.body.classList.contains('dark')}
                  styles={{
                    contentText: {
                      fontFamily:
                        "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
                      fontSize: 12,
                    },
                  }}
                />
              </div>
            </div>
          ),
        },
      ]}
    />
  );
};

const styles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
};
