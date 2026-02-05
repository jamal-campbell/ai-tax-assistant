import { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { User, Bot, Loader2, FileText, Sparkles, Shield, Zap } from 'lucide-react';
import type { Message } from '../types';
import { SourcesList } from './SourceCard';

interface MessageBubbleProps {
  message: Message;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                    ${isUser
                      ? 'bg-primary-100 dark:bg-primary-900/30'
                      : 'bg-gray-100 dark:bg-gray-700'
                    }`}
      >
        {isUser ? (
          <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        ) : (
          <Bot className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        )}
      </div>

      <div className={`flex-1 max-w-[80%] ${isUser ? 'text-right' : ''}`}>
        <div
          className={`inline-block p-4 rounded-2xl ${
            isUser
              ? 'bg-primary-600 text-white rounded-tr-sm'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-tl-sm'
          }`}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          ) : (
            <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'dark:prose-invert'}`}>
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && !message.isStreaming && (
          <SourcesList sources={message.sources} />
        )}
      </div>
    </div>
  );
}

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void;
}

function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
  const exampleQuestions = [
    "What are the limits for charitable contributions?",
    "How do I report scholarship income on my taxes?",
    "What education expenses can I deduct?",
    "Can I deduct gambling losses?",
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-2xl">
        {/* Logo/Header */}
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl
                          flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Bot className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Tax Compliance Assistant
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Get instant answers from official IRS publications
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <FileText className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Source Citations</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Every answer backed by IRS docs</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Zap className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Instant Answers</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI-powered responses in seconds</p>
          </div>
          <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <Shield className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Accurate & Reliable</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Based on official IRS sources</p>
          </div>
        </div>

        {/* Example Questions */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            Try asking a question
          </p>
          <div className="grid grid-cols-2 gap-3">
            {exampleQuestions.map((question, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(question)}
                className="p-3 text-left text-sm bg-white dark:bg-gray-800
                           border border-gray-200 dark:border-gray-700 rounded-lg
                           hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20
                           transition-colors group"
              >
                <span className="text-gray-700 dark:text-gray-300 group-hover:text-primary-700 dark:group-hover:text-primary-400">
                  {question}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
          This tool provides general information based on IRS publications.
          Always consult a qualified tax professional for specific tax advice.
        </p>
      </div>
    </div>
  );
}

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage?: (message: string) => void;
}

export function MessageList({ messages, isLoading, onSendMessage }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && onSendMessage) {
    return <WelcomeScreen onSendMessage={onSendMessage} />;
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <Bot className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Start a conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
