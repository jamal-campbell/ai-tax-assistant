import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  hasDocuments: boolean;
  onSendMessage: (message: string) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  error,
  hasDocuments,
  onSendMessage,
}: ChatInterfaceProps) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
      {error && (
        <div className="px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {!hasDocuments && (
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-sm text-center">
          Loading knowledge base... This may take a moment on first startup.
        </div>
      )}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        onSendMessage={hasDocuments ? onSendMessage : undefined}
      />
      <MessageInput
        onSend={onSendMessage}
        isLoading={isLoading}
        disabled={!hasDocuments}
      />
    </div>
  );
}
