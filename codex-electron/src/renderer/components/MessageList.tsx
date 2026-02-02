/**
 * Codex Electron - Message List Component
 */

import React from 'react';
import { Avatar, Space, Typography, Tag, Collapse, Tooltip } from 'antd';
import {
  UserOutlined,
  RobotOutlined,
  CodeOutlined,
  FileOutlined,
  BulbOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ExecOutput } from './ExecOutput';
import { FileChange } from './FileChange';
import type { ThreadItem } from '../../types';

const { Text, Paragraph } = Typography;

interface MessageListProps {
  items: Array<{ turnId: string; item: ThreadItem }>;
  streamingContent: Map<string, string>;
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  items,
  streamingContent,
  isLoading,
}) => {
  const renderItem = (turnId: string, item: ThreadItem) => {
    switch (item.type) {
      case 'userMessage':
        return (
          <div key={item.id} className="message user-message slide-in" style={styles.messageRow}>
            <div style={styles.messageContent}>
              <div style={styles.userBubble}>
                {item.content.map((input, i) => {
                  if (input.type === 'text') {
                    return <Text key={i}>{input.text}</Text>;
                  } else if (input.type === 'image' || input.type === 'localImage') {
                    return (
                      <img
                        key={i}
                        src={input.type === 'image' ? input.url : `file://${input.path}`}
                        alt="User uploaded"
                        style={{ maxWidth: 300, borderRadius: 8 }}
                      />
                    );
                  } else if (input.type === 'skill') {
                    return (
                      <Tag key={i} color="blue">
                        @{input.name}
                      </Tag>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          </div>
        );

      case 'agentMessage': {
        const streamedContent = streamingContent.get(item.id);
        const content = streamedContent !== undefined ? streamedContent : item.content;

        return (
          <div key={item.id} className="message agent-message slide-in" style={styles.messageRow}>
            <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#10a37f' }} />
            <div style={styles.messageContent}>
              <div className="message-content" style={styles.agentBubble}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                >
                  {content || ''}
                </ReactMarkdown>
                {streamedContent !== undefined && (
                  <span className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'plan': {
        const planContent = streamingContent.get(`plan-${item.id}`) ?? item.content;
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <Collapse
              size="small"
              items={[
                {
                  key: '1',
                  label: (
                    <Space>
                      <BulbOutlined />
                      <Text type="secondary">Plan</Text>
                    </Space>
                  ),
                  children: (
                    <div className="message-content">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {planContent}
                      </ReactMarkdown>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        );
      }

      case 'reasoning': {
        const reasoningContent =
          streamingContent.get(`reasoning-${item.id}`) ?? item.summary;
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <Collapse
              size="small"
              items={[
                {
                  key: '1',
                  label: (
                    <Space>
                      <BulbOutlined />
                      <Text type="secondary">Thinking...</Text>
                    </Space>
                  ),
                  children: <Text type="secondary">{reasoningContent}</Text>,
                },
              ]}
            />
          </div>
        );
      }

      case 'commandExecution': {
        const execOutput = streamingContent.get(`exec-${item.id}`) ?? item.output;
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <ExecOutput
              command={item.command}
              cwd={item.cwd}
              output={execOutput}
              exitCode={item.exitCode}
              status={item.status}
            />
          </div>
        );
      }

      case 'fileChange':
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <FileChange path={item.path} diff={item.diff} status={item.status} />
          </div>
        );

      case 'mcpToolCall':
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <Collapse
              size="small"
              items={[
                {
                  key: '1',
                  label: (
                    <Space>
                      <CodeOutlined />
                      <Text type="secondary">
                        MCP: {item.serverName}/{item.toolName}
                      </Text>
                      {item.status === 'running' && <LoadingOutlined />}
                      {item.status === 'completed' && (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      )}
                      {item.status === 'failed' && (
                        <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                      )}
                    </Space>
                  ),
                  children: (
                    <div>
                      <Text type="secondary">Arguments:</Text>
                      <pre style={styles.codeBlock}>
                        {JSON.stringify(item.arguments, null, 2)}
                      </pre>
                      {item.result && (
                        <>
                          <Text type="secondary">Result:</Text>
                          <pre style={styles.codeBlock}>{item.result}</pre>
                        </>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        );

      case 'webSearch':
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <Collapse
              size="small"
              items={[
                {
                  key: '1',
                  label: (
                    <Space>
                      <GlobalOutlined />
                      <Text type="secondary">Web Search: {item.query}</Text>
                    </Space>
                  ),
                  children: (
                    <Space direction="vertical" style={{ width: '100%' }}>
                      {item.results?.map((result, i) => (
                        <div key={i}>
                          <a href={result.url} target="_blank" rel="noopener noreferrer">
                            {result.title}
                          </a>
                          <Paragraph type="secondary" ellipsis={{ rows: 2 }}>
                            {result.snippet}
                          </Paragraph>
                        </div>
                      ))}
                    </Space>
                  ),
                },
              ]}
            />
          </div>
        );

      case 'imageView':
        return (
          <div key={item.id} className="slide-in" style={styles.systemItem}>
            <img
              src={item.url}
              alt="Viewed image"
              style={{ maxWidth: '100%', borderRadius: 8 }}
            />
          </div>
        );

      case 'enteredReviewMode':
        return (
          <div key={item.id} style={styles.systemNotice}>
            <Tag color="blue">Entered Review Mode</Tag>
          </div>
        );

      case 'exitedReviewMode':
        return (
          <div key={item.id} style={styles.systemNotice}>
            <Tag color="default">Exited Review Mode</Tag>
          </div>
        );

      case 'contextCompaction':
        return (
          <div key={item.id} style={styles.systemNotice}>
            <Tooltip title="Context was compacted to save tokens">
              <Tag color="orange">Context Compacted</Tag>
            </Tooltip>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {items.map(({ turnId, item }) => renderItem(turnId, item))}

      {isLoading && items.length > 0 && (
        <div style={styles.loadingIndicator}>
          <LoadingOutlined style={{ marginRight: 8 }} />
          <Text type="secondary">Agent is thinking...</Text>
        </div>
      )}

      {items.length === 0 && !isLoading && (
        <div style={styles.emptyState}>
          <RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />
          <Text type="secondary" style={{ marginTop: 16 }}>
            Start a conversation by typing a message below
          </Text>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    flex: 1,
  },
  messageRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
  },
  messageContent: {
    flex: 1,
    minWidth: 0,
  },
  userBubble: {
    background: '#1890ff',
    color: 'white',
    padding: '10px 14px',
    borderRadius: '12px 12px 4px 12px',
    maxWidth: '80%',
    marginLeft: 'auto',
  },
  agentBubble: {
    background: '#f5f5f5',
    padding: '10px 14px',
    borderRadius: '12px 12px 12px 4px',
    maxWidth: '80%',
  },
  systemItem: {
    marginLeft: 48,
    maxWidth: 'calc(100% - 48px)',
  },
  systemNotice: {
    display: 'flex',
    justifyContent: 'center',
    padding: '8px 0',
  },
  codeBlock: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: 12,
    borderRadius: 6,
    overflow: 'auto',
    fontSize: 12,
    margin: '8px 0',
  },
  loadingIndicator: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minHeight: 200,
  },
};
