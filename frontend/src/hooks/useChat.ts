import { useState, useCallback } from 'react';
import type { Message, Source, StreamEvent } from '../types';
import { streamMessage, clearChatHistory } from '../services/api';

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [currentSources, setCurrentSources] = useState<Source[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Add placeholder for assistant message
    const assistantId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      let fullContent = '';
      let sources: Source[] = [];

      for await (const event of streamMessage(content, sessionId)) {
        switch (event.type) {
          case 'sources':
            sources = event.sources || [];
            setCurrentSources(sources);
            if (event.session_id) {
              setSessionId(event.session_id);
            }
            break;

          case 'chunk':
            fullContent += event.content || '';
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, content: fullContent }
                  : msg
              )
            );
            break;

          case 'done':
            setMessages(prev =>
              prev.map(msg =>
                msg.id === assistantId
                  ? { ...msg, isStreaming: false, sources }
                  : msg
              )
            );
            break;

          case 'error':
            throw new Error(event.message || 'Unknown error');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantId
            ? { ...msg, content: `Error: ${errorMessage}`, isStreaming: false }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading]);

  const clearChat = useCallback(async () => {
    if (sessionId) {
      try {
        await clearChatHistory(sessionId);
      } catch {
        // Ignore errors when clearing
      }
    }
    setMessages([]);
    setCurrentSources([]);
    setSessionId(undefined);
    setError(null);
  }, [sessionId]);

  return {
    messages,
    isLoading,
    sessionId,
    currentSources,
    error,
    sendMessage,
    clearChat,
  };
}
