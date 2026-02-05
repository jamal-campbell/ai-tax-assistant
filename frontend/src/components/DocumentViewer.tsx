import { useState, useEffect, useRef } from 'react';
import { X, FileText, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import type { DocumentContent, DocumentChunk } from '../types';
import { getDocumentContent } from '../services/api';

interface DocumentViewerProps {
  documentId: string;
  documentName: string;
  highlightChunkIndex?: number;
  onClose: () => void;
}

export function DocumentViewer({
  documentId,
  documentName,
  highlightChunkIndex,
  onClose,
}: DocumentViewerProps) {
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getDocumentContent(documentId);
        setContent(data);
        // Expand the highlighted chunk by default
        if (highlightChunkIndex !== undefined) {
          setExpandedChunks(new Set([highlightChunkIndex]));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [documentId, highlightChunkIndex]);

  useEffect(() => {
    // Scroll to highlighted chunk after content loads
    if (highlightRef.current && !isLoading) {
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isLoading, highlightChunkIndex]);

  const toggleChunk = (index: number) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedChunks(newExpanded);
  };

  const expandAll = () => {
    if (content) {
      setExpandedChunks(new Set(content.chunks.map((_, i) => i)));
    }
  };

  const collapseAll = () => {
    setExpandedChunks(new Set());
  };

  // Group chunks by page
  const chunksByPage = content?.chunks.reduce((acc, chunk, index) => {
    const page = chunk.page || 1;
    if (!acc[page]) {
      acc[page] = [];
    }
    acc[page].push({ ...chunk, originalIndex: index });
    return acc;
  }, {} as Record<number, (DocumentChunk & { originalIndex: number })[]>) || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {documentName}
              </h2>
              {content && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {content.total_chunks} sections · {Object.keys(chunksByPage).length} pages
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {content && content.chunks.length > 0 && (
              <>
                <button
                  onClick={expandAll}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Expand All
                </button>
                <button
                  onClick={collapseAll}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400
                           hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Collapse All
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-red-500">{error}</p>
            </div>
          ) : content && content.chunks.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(chunksByPage).map(([page, chunks]) => (
                <div key={page} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 sticky top-0 bg-white dark:bg-gray-800 py-1">
                    Page {page}
                  </h3>
                  {chunks.map((chunk) => {
                    const isHighlighted = chunk.originalIndex === highlightChunkIndex;
                    const isExpanded = expandedChunks.has(chunk.originalIndex);

                    return (
                      <div
                        key={chunk.originalIndex}
                        ref={isHighlighted ? highlightRef : undefined}
                        className={`border rounded-lg overflow-hidden transition-all ${
                          isHighlighted
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 ring-2 ring-primary-500/50'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <button
                          onClick={() => toggleChunk(chunk.originalIndex)}
                          className="w-full flex items-center justify-between p-3 text-left
                                   hover:bg-gray-50 dark:hover:bg-gray-700/50"
                        >
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Section {chunk.chunk_index + 1}
                            {isHighlighted && (
                              <span className="ml-2 text-xs text-primary-600 dark:text-primary-400 font-normal">
                                (Referenced in response)
                              </span>
                            )}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-3">
                            <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                              {chunk.text}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 dark:text-gray-400">No content available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
