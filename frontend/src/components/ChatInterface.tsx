import { useState, useCallback } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Upload, Loader2 } from 'lucide-react';
import type { Message, Source } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  hasDocuments: boolean;
  onSendMessage: (message: string) => void;
  onSourceClick: (source: Source) => void;
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export function ChatInterface({
  messages,
  isLoading,
  error,
  hasDocuments,
  onSendMessage,
  onSourceClick,
  onUpload,
  isUploading,
}: ChatInterfaceProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));

    if (pdfFile) {
      await onUpload(pdfFile);
    }
  }, [onUpload]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await onUpload(file);
    }
    e.target.value = '';
  };

  return (
    <div
      className={`flex-1 flex flex-col bg-white dark:bg-gray-900 overflow-hidden relative
                  ${isDragOver ? 'ring-4 ring-primary-500 ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-primary-500/10 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-2xl border-2 border-dashed border-primary-500">
            <Upload className="w-12 h-12 text-primary-500 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Drop PDF to upload
            </p>
          </div>
        </div>
      )}

      {/* Upload indicator */}
      {isUploading && (
        <div className="absolute top-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
          <span className="text-sm text-gray-700 dark:text-gray-300">Processing document...</span>
        </div>
      )}

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
        onSourceClick={onSourceClick}
      />
      <MessageInput
        onSend={onSendMessage}
        isLoading={isLoading}
        disabled={!hasDocuments}
        onFileSelect={handleFileSelect}
      />
    </div>
  );
}
