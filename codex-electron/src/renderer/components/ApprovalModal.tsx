/**
 * Codex Electron - Approval Modal Component
 */

import React, { useState, useEffect } from 'react';
import { Modal, Button, Space, Typography, Alert, Radio, Tabs, Tag } from 'antd';
import {
  WarningOutlined,
  CodeOutlined,
  FileOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import type { ApprovalRequest, ApprovalDecision } from '../../types';

const { Text, Paragraph } = Typography;

interface ApprovalModalProps {
  request: ApprovalRequest | null;
  onRespond: (decision: ApprovalDecision) => void;
  onCancel: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  request,
  onRespond,
  onCancel,
}) => {
  const [decision, setDecision] = useState<ApprovalDecision>('allow_once');
  const [countdown, setCountdown] = useState<number | null>(null);

  // Reset state when request changes
  useEffect(() => {
    if (request) {
      setDecision('allow_once');
      setCountdown(null);
    }
  }, [request]);

  if (!request) return null;

  const isExec = request.type === 'exec';
  const payload = request.payload;

  const handleApprove = () => {
    onRespond(decision);
  };

  const handleDeny = () => {
    onRespond('deny');
  };

  const renderExecContent = () => {
    if (!isExec) return null;
    const execPayload = payload as {
      command: string[];
      cwd: string;
    };

    return (
      <div>
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          message="Command Execution Request"
          description="The AI agent wants to execute the following command on your system."
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={styles.section}>
          <Text type="secondary">Command:</Text>
          <pre style={styles.commandBlock}>{execPayload.command.join(' ')}</pre>
        </div>

        <div style={styles.section}>
          <Text type="secondary">Working Directory:</Text>
          <Text code>{execPayload.cwd}</Text>
        </div>
      </div>
    );
  };

  const renderPatchContent = () => {
    if (isExec) return null;
    const patchPayload = payload as {
      path: string;
      diff: string;
    };

    // Parse diff for viewer
    const parseDiff = (diffText: string): { oldValue: string; newValue: string } => {
      const lines = diffText.split('\n');
      const oldLines: string[] = [];
      const newLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith('---') || line.startsWith('+++') || line.startsWith('@@')) {
          continue;
        }
        if (line.startsWith('-')) {
          oldLines.push(line.slice(1));
        } else if (line.startsWith('+')) {
          newLines.push(line.slice(1));
        } else if (line.startsWith(' ')) {
          oldLines.push(line.slice(1));
          newLines.push(line.slice(1));
        }
      }

      return {
        oldValue: oldLines.join('\n'),
        newValue: newLines.join('\n'),
      };
    };

    const { oldValue, newValue } = parseDiff(patchPayload.diff);

    return (
      <div>
        <Alert
          type="warning"
          icon={<WarningOutlined />}
          message="File Modification Request"
          description="The AI agent wants to modify the following file."
          showIcon
          style={{ marginBottom: 16 }}
        />

        <div style={styles.section}>
          <Text type="secondary">File:</Text>
          <Text code>{patchPayload.path}</Text>
        </div>

        <div style={styles.section}>
          <Text type="secondary">Changes:</Text>
          <div style={styles.diffContainer}>
            <ReactDiffViewer
              oldValue={oldValue}
              newValue={newValue}
              splitView={false}
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
      </div>
    );
  };

  return (
    <Modal
      title={
        <Space>
          {isExec ? <CodeOutlined /> : <FileOutlined />}
          <span>Approval Required</span>
        </Space>
      }
      open={!!request}
      onCancel={onCancel}
      width={700}
      footer={
        <div style={styles.footer}>
          <Radio.Group
            value={decision}
            onChange={(e) => setDecision(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="allow_once">Allow Once</Radio.Button>
            <Radio.Button value="allow_session">Allow for Session</Radio.Button>
            <Radio.Button value="allow_always">Always Allow</Radio.Button>
          </Radio.Group>

          <Space>
            <Button icon={<CloseOutlined />} onClick={handleDeny}>
              Deny
            </Button>
            <Button type="primary" icon={<CheckOutlined />} onClick={handleApprove}>
              Approve
            </Button>
          </Space>
        </div>
      }
    >
      {isExec ? renderExecContent() : renderPatchContent()}

      <div style={styles.policyHint}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          <strong>Allow Once:</strong> Approve only this request •{' '}
          <strong>Allow for Session:</strong> Approve similar requests in this session •{' '}
          <strong>Always Allow:</strong> Remember this decision permanently
        </Text>
      </div>
    </Modal>
  );
};

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 16,
  },
  commandBlock: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: 12,
    borderRadius: 6,
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace",
    fontSize: 13,
    overflow: 'auto',
    marginTop: 8,
  },
  diffContainer: {
    marginTop: 8,
    maxHeight: 300,
    overflow: 'auto',
    border: '1px solid #d9d9d9',
    borderRadius: 6,
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  policyHint: {
    marginTop: 16,
    padding: 12,
    background: '#f5f5f5',
    borderRadius: 6,
  },
};
