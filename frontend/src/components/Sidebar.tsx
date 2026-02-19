import { useState } from 'react';
import {
  FileText, Sun, Moon,
  MessageSquare, Loader2, ChevronLeft, ChevronRight,
  CheckCircle, BookOpen
} from 'lucide-react';
import type { Document } from '../types';

interface SidebarProps {
  documents: Document[];
  isLoadingDocs: boolean;
  isDark: boolean;
  onToggleDark: () => void;
  onClearChat: () => void;
  onDocumentClick: (docId: string, docName: string) => void;
}

export function Sidebar({
  documents,
  isLoadingDocs,
  isDark,
  onToggleDark,
  onClearChat,
  onDocumentClick,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const totalChunks = documents.reduce((sum, d) => sum + d.chunk_count, 0);

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
                    flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Tax Assistant</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">IRS Knowledge Base</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleDark}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* New Chat Button */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={onClearChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3
                     bg-primary-600 hover:bg-primary-700 text-white
                     rounded-lg transition-colors font-medium"
        >
          <MessageSquare className="w-5 h-5" />
          New Conversation
        </button>
      </div>

      {/* Knowledge Base Status */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-2 mb-3">
            {isLoadingDocs ? (
              <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
            ) : documents.length > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
            )}
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              Knowledge Base
            </span>
          </div>

          {documents.length > 0 ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Sample Documents</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{documents.length}</span>
              </div>
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600 flex justify-between text-gray-600 dark:text-gray-400">
                <span>Total Knowledge</span>
                <span className="font-medium text-primary-600 dark:text-primary-400">{totalChunks.toLocaleString()} chunks</span>
              </div>
            </div>
          ) : isLoadingDocs ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading documents...
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No documents available. The system will auto-load sample publications on startup.
            </p>
          )}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Documents
        </h3>

        {documents.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            Documents will appear here once loaded.
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center p-2.5 bg-white dark:bg-gray-700
                           rounded-lg border border-gray-200 dark:border-gray-600
                           hover:border-primary-400 dark:hover:border-primary-500
                           hover:shadow-sm cursor-pointer transition-all"
                onClick={() => onDocumentClick(doc.id, doc.filename)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900/30">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {doc.filename}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {doc.chunk_count} chunks · Click to view
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
          Powered by Anthropic Claude & Qdrant
        </p>
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">Developed by</span>
          <a
            href="https://autorithm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1"
          >
            <img
              src="/assets/autorithm_White-Main.jpg"
              alt="Autorithm"
              className="h-4 rounded-sm"
            />
            <span className="text-gray-400 dark:text-gray-500 text-xs">&raquo;</span>
          </a>
        </div>
      </div>
    </div>
  );
}
