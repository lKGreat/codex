/**
 * Codex Electron - Chat Session Page
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Layout, Spin, Typography, Alert } from 'antd';
import { MessageList } from '../components/MessageList';
import { ChatInput } from '../components/ChatInput';
import { ApprovalModal } from '../components/ApprovalModal';
import type {
  Thread,
  Turn,
  ThreadItem,
  UserInput,
  ServerNotification,
  ApprovalRequest,
  TurnStatus,
} from '../../types';

const { Content, Footer } = Layout;
const { Text } = Typography;

export const ChatSession: React.FC = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const [thread, setThread] = useState<Thread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTurnStatus, setCurrentTurnStatus] = useState<TurnStatus | null>(null);
  const [streamingContent, setStreamingContent] = useState<Map<string, string>>(new Map());
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequest | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load thread data
  const loadThread = useCallback(async () => {
    if (!threadId) return;

    try {
      setLoading(true);
      const result = await window.codex.threadRead({ threadId });
      setThread(result.thread);
      setError(null);
    } catch (err) {
      console.error('Failed to load thread:', err);
      setError('Failed to load session');
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  // Subscribe to notifications
  useEffect(() => {
    if (!threadId) return;

    const unsubscribeNotification = window.codex.onNotification((notification: ServerNotification) => {
      // Only handle notifications for this thread
      const payload = notification.payload as any;
      if (payload?.threadId !== threadId && payload?.thread?.id !== threadId) {
        return;
      }

      switch (notification.type) {
        case 'threadStarted':
          setThread(payload.thread);
          break;

        case 'threadNameUpdated':
          setThread((prev) =>
            prev ? { ...prev, name: payload.name } : prev
          );
          break;

        case 'turnStarted':
          setCurrentTurnStatus('inProgress');
          setThread((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              turns: [...prev.turns, payload.turn],
            };
          });
          break;

        case 'turnCompleted':
          setCurrentTurnStatus(payload.status);
          setThread((prev) => {
            if (!prev) return prev;
            const turns = prev.turns.map((turn) =>
              turn.id === payload.turnId
                ? { ...turn, status: payload.status, error: payload.error }
                : turn
            );
            return { ...prev, turns };
          });
          // Clear streaming content
          setStreamingContent(new Map());
          break;

        case 'itemStarted':
          setThread((prev) => {
            if (!prev) return prev;
            const turns = prev.turns.map((turn) =>
              turn.id === payload.turnId
                ? { ...turn, items: [...turn.items, payload.item] }
                : turn
            );
            return { ...prev, turns };
          });
          break;

        case 'itemCompleted':
          // Item completed, could update status
          break;

        case 'agentMessageDelta':
          setStreamingContent((prev) => {
            const next = new Map(prev);
            const current = next.get(payload.itemId) || '';
            next.set(payload.itemId, current + payload.delta);
            return next;
          });
          break;

        case 'execCommandOutputDelta':
          setStreamingContent((prev) => {
            const next = new Map(prev);
            const key = `exec-${payload.itemId}`;
            const current = next.get(key) || '';
            next.set(key, current + payload.delta);
            return next;
          });
          break;

        case 'planDelta':
          setStreamingContent((prev) => {
            const next = new Map(prev);
            const key = `plan-${payload.itemId}`;
            const current = next.get(key) || '';
            next.set(key, current + payload.delta);
            return next;
          });
          break;

        case 'reasoningSummaryDelta':
          setStreamingContent((prev) => {
            const next = new Map(prev);
            const key = `reasoning-${payload.itemId}`;
            const current = next.get(key) || '';
            next.set(key, current + payload.delta);
            return next;
          });
          break;

        case 'error':
          setError(payload.message);
          break;
      }
    });

    const unsubscribeApproval = window.codex.onApprovalRequest((request: ApprovalRequest) => {
      if (request.payload.threadId === threadId) {
        setPendingApproval(request);
      }
    });

    return () => {
      unsubscribeNotification();
      unsubscribeApproval();
    };
  }, [threadId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.turns, streamingContent]);

  // Send message
  const handleSendMessage = async (input: UserInput[]) => {
    if (!threadId) return;

    try {
      await window.codex.turnStart({
        threadId,
        input,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    }
  };

  // Interrupt current turn
  const handleInterrupt = async () => {
    if (!threadId) return;

    try {
      await window.codex.turnInterrupt({ threadId });
    } catch (err) {
      console.error('Failed to interrupt:', err);
    }
  };

  // Handle approval response
  const handleApprovalResponse = async (
    decision: 'allow_once' | 'allow_session' | 'allow_always' | 'deny'
  ) => {
    if (!pendingApproval) return;

    try {
      if (pendingApproval.type === 'exec') {
        await window.codex.respondToExecApproval(pendingApproval.payload.requestId, {
          decision,
        });
      } else {
        await window.codex.respondToApplyPatchApproval(pendingApproval.payload.requestId, {
          decision,
        });
      }
    } catch (err) {
      console.error('Failed to respond to approval:', err);
    } finally {
      setPendingApproval(null);
    }
  };

  // Get all items from all turns
  const getAllItems = (): Array<{ turnId: string; item: ThreadItem }> => {
    if (!thread) return [];

    const items: Array<{ turnId: string; item: ThreadItem }> = [];
    for (const turn of thread.turns) {
      for (const item of turn.items) {
        items.push({ turnId: turn.id, item });
      }
    }
    return items;
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div style={{ padding: 24 }}>
        <Alert type="error" message={error} showIcon />
      </div>
    );
  }

  return (
    <Layout style={{ height: '100%' }}>
      <Content
        style={{
          overflow: 'auto',
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {error && (
          <Alert
            type="error"
            message={error}
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 16 }}
          />
        )}

        <MessageList
          items={getAllItems()}
          streamingContent={streamingContent}
          isLoading={currentTurnStatus === 'inProgress'}
        />
        <div ref={messagesEndRef} />
      </Content>

      <Footer
        style={{
          padding: '12px 24px',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <ChatInput
          onSend={handleSendMessage}
          onInterrupt={handleInterrupt}
          isLoading={currentTurnStatus === 'inProgress'}
          disabled={!thread}
        />
      </Footer>

      <ApprovalModal
        request={pendingApproval}
        onRespond={handleApprovalResponse}
        onCancel={() => handleApprovalResponse('deny')}
      />
    </Layout>
  );
};
