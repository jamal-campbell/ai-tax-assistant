import { useState, KeyboardEvent, ChangeEvent, useRef } from 'react';
import { Send, Loader2, Paperclip } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  onFileSelect?: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function MessageInput({ onSend, isLoading, disabled, onFileSelect }: MessageInputProps) {
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (input.trim() && !isLoading && !disabled) {
      onSend(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <div className="flex items-end gap-3 max-w-4xl mx-auto">
        {onFileSelect && (
          <>
            <button
              onClick={handleUploadClick}
              disabled={isLoading || disabled}
              className="flex-shrink-0 p-3 rounded-lg border border-gray-300 dark:border-gray-600
                       hover:bg-gray-100 dark:hover:bg-gray-700
                       focus:outline-none focus:ring-2 focus:ring-primary-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors"
              title="Upload PDF"
            >
              <Paperclip className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={onFileSelect}
              className="hidden"
            />
          </>
        )}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a tax question..."
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 dark:border-gray-600
                     bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100
                     placeholder-gray-500 dark:placeholder-gray-400
                     focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     min-h-[48px] max-h-[200px]"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading || disabled}
          className="flex-shrink-0 p-3 rounded-lg bg-primary-600 text-white
                     hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
