import { useState, useCallback, useEffect } from 'react';
import type { Document } from '../types';
import { listDocuments, uploadDocument, deleteDocument, ingestDocuments } from '../services/api';

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listDocuments();
      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch documents');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(file);
      await fetchDocuments();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload document';
      setError(message);
      throw err;
    } finally {
      setIsUploading(false);
    }
  }, [fetchDocuments]);

  const remove = useCallback(async (docId: string) => {
    setError(null);
    try {
      await deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document');
      throw err;
    }
  }, []);

  const ingest = useCallback(async () => {
    setIsIngesting(true);
    setError(null);
    try {
      const result = await ingestDocuments();
      await fetchDocuments();
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to ingest documents';
      setError(message);
      throw err;
    } finally {
      setIsIngesting(false);
    }
  }, [fetchDocuments]);

  // Fetch documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    documents,
    isLoading,
    isUploading,
    isIngesting,
    error,
    fetchDocuments,
    upload,
    remove,
    ingest,
  };
}
