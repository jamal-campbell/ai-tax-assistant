import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import type { Message, Source } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  hasDocuments: boolean;
  onSendMessage: (message: string) => void;
  onSourceClick: (source: Source) => void;
}

export function ChatInterface({
  messages,
  isLoading,
  error,
  hasDocuments,
  onSendMessage,
  onSourceClick,
}: ChatInterfaceProps) {
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative">

      {error && (
        <div className="px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm">
          <p className="font-medium">Something went wrong</p>
          <p className="text-xs mt-1 opacity-80">
            Please try again. If the issue persists, try refreshing the page.
          </p>
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
        onSourceClick={onSourceClick}
      />
      <MessageInput
        onSend={onSendMessage}
        isLoading={isLoading}
        disabled={!hasDocuments}
      />
    </div>
  );
}
