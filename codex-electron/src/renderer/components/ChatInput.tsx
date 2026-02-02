/**
 * Codex Electron - Chat Input Component
 */

import React, { useState, useRef, useCallback } from 'react';
import { Input, Button, Space, Upload, Tooltip, Dropdown, Tag } from 'antd';
import {
  SendOutlined,
  PaperClipOutlined,
  PictureOutlined,
  StopOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { UserInput } from '../../types';

const { TextArea } = Input;

interface ChatInputProps {
  onSend: (input: UserInput[]) => void;
  onInterrupt: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onInterrupt,
  isLoading,
  disabled,
}) => {
  const [text, setText] = useState('');
  const [images, setImages] = useState<UploadFile[]>([]);
  const textAreaRef = useRef<any>(null);

  const handleSend = useCallback(() => {
    if (!text.trim() && images.length === 0) return;

    const inputs: UserInput[] = [];

    // Add text input
    if (text.trim()) {
      inputs.push({
        type: 'text',
        text: text.trim(),
        textElements: [],
      });
    }

    // Add image inputs
    for (const image of images) {
      if (image.originFileObj) {
        // Local file
        const path = (image.originFileObj as any).path;
        if (path) {
          inputs.push({
            type: 'localImage',
            path,
          });
        }
      } else if (image.url) {
        // URL image
        inputs.push({
          type: 'image',
          url: image.url,
        });
      }
    }

    onSend(inputs);
    setText('');
    setImages([]);
  }, [text, images, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && !disabled) {
        handleSend();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const uploadFile: UploadFile = {
            uid: Date.now().toString(),
            name: 'pasted-image.png',
            status: 'done',
            originFileObj: file as any,
          };
          setImages((prev) => [...prev, uploadFile]);
        }
        break;
      }
    }
  };

  const slashCommands = [
    { key: 'review', label: '/review', description: 'Start code review mode' },
    { key: 'clear', label: '/clear', description: 'Clear conversation context' },
    { key: 'help', label: '/help', description: 'Show available commands' },
  ];

  const handleSlashCommand = (command: string) => {
    if (command === 'review') {
      // TODO: Trigger review mode
      setText('');
    } else if (command === 'clear') {
      // TODO: Clear context
      setText('');
    } else if (command === 'help') {
      setText('');
    }
  };

  const showSlashMenu = text.startsWith('/') && !text.includes(' ');
  const filteredCommands = slashCommands.filter((cmd) =>
    cmd.key.startsWith(text.slice(1).toLowerCase())
  );

  return (
    <div style={styles.container}>
      {/* Attached images preview */}
      {images.length > 0 && (
        <div style={styles.attachments}>
          {images.map((image) => (
            <Tag
              key={image.uid}
              closable
              onClose={() => setImages((prev) => prev.filter((i) => i.uid !== image.uid))}
              style={styles.imageTag}
            >
              <PictureOutlined style={{ marginRight: 4 }} />
              {image.name}
            </Tag>
          ))}
        </div>
      )}

      {/* Slash command dropdown */}
      <Dropdown
        open={showSlashMenu && filteredCommands.length > 0}
        placement="topLeft"
        menu={{
          items: filteredCommands.map((cmd) => ({
            key: cmd.key,
            label: (
              <Space>
                <span>{cmd.label}</span>
                <span style={{ color: '#999' }}>{cmd.description}</span>
              </Space>
            ),
            onClick: () => handleSlashCommand(cmd.key),
          })),
        }}
      >
        <div style={styles.inputRow}>
          {/* Attachment button */}
          <Upload
            accept="image/*"
            showUploadList={false}
            multiple
            beforeUpload={(file) => {
              const uploadFile: UploadFile = {
                uid: Date.now().toString(),
                name: file.name,
                status: 'done',
                originFileObj: file as any,
              };
              setImages((prev) => [...prev, uploadFile]);
              return false;
            }}
          >
            <Tooltip title="Attach image">
              <Button
                type="text"
                icon={<PaperClipOutlined />}
                disabled={disabled || isLoading}
              />
            </Tooltip>
          </Upload>

          {/* Text input */}
          <TextArea
            ref={textAreaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Type a message... (/ for commands)"
            autoSize={{ minRows: 1, maxRows: 6 }}
            disabled={disabled}
            style={styles.textArea}
          />

          {/* Send/Stop button */}
          {isLoading ? (
            <Tooltip title="Stop generation">
              <Button
                type="primary"
                danger
                icon={<StopOutlined />}
                onClick={onInterrupt}
              />
            </Tooltip>
          ) : (
            <Tooltip title="Send message (Enter)">
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                disabled={disabled || (!text.trim() && images.length === 0)}
              />
            </Tooltip>
          )}
        </div>
      </Dropdown>

      {/* Keyboard hint */}
      <div style={styles.hint}>
        <span>Press Enter to send, Shift+Enter for new line</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  attachments: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  imageTag: {
    display: 'flex',
    alignItems: 'center',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
  },
  textArea: {
    flex: 1,
    resize: 'none',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
};
