import type { ChatResponse, StreamEvent, Document, HealthStatus } from '../types';

const API_BASE = '/api';

export async function sendMessage(
  query: string,
  sessionId?: string
): Promise<ChatResponse> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }

  return response.json();
}

export async function* streamMessage(
  query: string,
  sessionId?: string
): AsyncGenerator<StreamEvent> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, session_id: sessionId }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to send message');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event: StreamEvent = JSON.parse(line.slice(6));
          yield event;
        } catch {
          // Ignore parse errors
        }
      }
    }
  }
}

export async function uploadDocument(file: File): Promise<{
  message: string;
  document_id: string;
  filename: string;
  chunk_count: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to upload document');
  }

  return response.json();
}

export async function listDocuments(): Promise<{ documents: Document[]; total: number }> {
  const response = await fetch(`${API_BASE}/documents`);

  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }

  return response.json();
}

export async function deleteDocument(docId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/documents/${docId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}

export async function ingestDocuments(): Promise<{
  message: string;
  documents_processed: number;
  total_chunks: number;
}> {
  const response = await fetch(`${API_BASE}/documents/ingest`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to ingest documents');
  }

  return response.json();
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`);

  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}

export async function clearChatHistory(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/history/${sessionId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error('Failed to clear chat history');
  }
}
