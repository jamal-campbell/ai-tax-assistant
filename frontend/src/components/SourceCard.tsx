import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp } from 'lucide-react';
import type { Source } from '../types';

interface SourceCardProps {
  source: Source;
  index: number;
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const scorePercent = Math.round(source.score * 100);

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
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {source.text}
          </p>
        </div>
      )}
    </div>
  );
}

interface SourcesListProps {
  sources: Source[];
}

export function SourcesList({ sources }: SourcesListProps) {
  if (!sources.length) return null;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
        <FileText className="w-4 h-4" />
        Sources ({sources.length})
      </h4>
      <div className="space-y-2">
        {sources.map((source, i) => (
          <SourceCard key={`${source.source}-${i}`} source={source} index={i} />
        ))}
      </div>
    </div>
  );
}
