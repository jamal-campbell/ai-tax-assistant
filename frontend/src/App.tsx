import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatInterface } from './components/ChatInterface';
import { useChat } from './hooks/useChat';
import { useDocuments } from './hooks/useDocuments';

function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

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
      />
      <ChatInterface
        messages={messages}
        isLoading={isChatLoading}
        error={chatError || docError}
        hasDocuments={documents.length > 0}
        onSendMessage={sendMessage}
      />
    </div>
  );
}

export default App;
