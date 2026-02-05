import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { Source } from '../types';

interface SourceCardProps {
  source: Source;
  index: number;
  onSourceClick?: (source: Source) => void;
}

export function SourceCard({ source, index, onSourceClick }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const scorePercent = Math.round(source.score * 100);

  const handleViewDocument = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSourceClick?.(source);
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-left
                   hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
              Source {index + 1}: {source.source}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {source.page ? `Page ${source.page} | ` : ''}
              Relevance: {scorePercent}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onSourceClick && (
            <button
              onClick={handleViewDocument}
              className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
              title="View in document"
            >
              <ExternalLink className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {source.text}
          </p>
          {onSourceClick && (
            <button
              onClick={handleViewDocument}
              className="mt-3 flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400
                       hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              View in document
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface SourcesListProps {
  sources: Source[];
  onSourceClick?: (source: Source) => void;
}

export function SourcesList({ sources, onSourceClick }: SourcesListProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Sources ({sources.length})
      </h4>
      <div className="space-y-2">
        {sources.map((source, i) => (
          <SourceCard
            key={`${source.source}-${i}`}
            source={source}
            index={i}
            onSourceClick={onSourceClick}
          />
        ))}
      </div>
    </div>
  );
}
