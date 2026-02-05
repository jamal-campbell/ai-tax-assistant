import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { DocumentViewer } from './components/DocumentViewer';
import { useChat } from './hooks/useChat';
import { useDocuments } from './hooks/useDocuments';
import type { Source } from './types';

interface ViewerState {
  documentId: string;
  documentName: string;
  highlightChunkIndex?: number;
}

function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [viewerState, setViewerState] = useState<ViewerState | null>(null);

  const {
    messages,
    isLoading: isChatLoading,
    error: chatError,
    sendMessage,
    clearChat,
  } = useChat();

  const {
    documents,
    isLoading: isLoadingDocs,
    isUploading,
    error: docError,
    upload,
    remove,
  } = useDocuments();

  // Apply dark mode class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleDark = () => setIsDark(!isDark);

  const handleUpload = async (file: File) => {
    await upload(file);
  };

  const handleDelete = async (docId: string) => {
    await remove(docId);
  };

  const handleDocumentClick = (docId: string, docName: string) => {
    setViewerState({
      documentId: docId,
      documentName: docName,
    });
  };

  const handleSourceClick = (source: Source) => {
    // Find the document that matches this source
    const doc = documents.find(d => d.filename === source.source);
    if (doc) {
      setViewerState({
        documentId: doc.id,
        documentName: doc.filename,
        highlightChunkIndex: source.chunk_index,
      });
    }
  };

  const handleCloseViewer = () => {
    setViewerState(null);
  };

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar
        documents={documents}
        isLoadingDocs={isLoadingDocs}
        isUploading={isUploading}
        isDark={isDark}
        onToggleDark={toggleDark}
        onUpload={handleUpload}
        onDelete={handleDelete}
        onClearChat={clearChat}
        onDocumentClick={handleDocumentClick}
      />
      <ChatInterface
        messages={messages}
        isLoading={isChatLoading}
        error={chatError || docError}
        hasDocuments={documents.length > 0}
        onSendMessage={sendMessage}
        onSourceClick={handleSourceClick}
        onUpload={handleUpload}
        isUploading={isUploading}
      />

      {viewerState && (
        <DocumentViewer
          documentId={viewerState.documentId}
          documentName={viewerState.documentName}
          highlightChunkIndex={viewerState.highlightChunkIndex}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
}

export default App;
