export interface Source {
  text: string;
  source: string;
  chunk_index: number;
  score: number;
  page?: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  isStreaming?: boolean;
}

export interface ChatResponse {
  response: string;
  sources: Source[];
  session_id: string;
}

export interface StreamEvent {
  type: 'sources' | 'chunk' | 'done' | 'error';
  sources?: Source[];
  session_id?: string;
  content?: string;
  message?: string;
}

export interface Document {
  id: string;
  filename: string;
  source_type: 'irs' | 'user';
  chunk_count: number;
  uploaded_at: string;
}

export interface DocumentChunk {
  text: string;
  page?: number;
  chunk_index: number;
}

export interface DocumentContent {
  id: string;
  filename: string;
  source_type: string;
  chunks: DocumentChunk[];
  total_chunks: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded';
  services: {
    qdrant: boolean;
    redis: boolean;
    claude: boolean;
  };
}
