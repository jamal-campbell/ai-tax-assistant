import { useCallback, useState } from 'react';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DocumentUploadProps {
  onUpload: (file: File) => Promise<void>;
  isUploading: boolean;
}

export function DocumentUpload({ onUpload, isUploading }: DocumentUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setUploadStatus('idle');
      setErrorMessage('');
    } else {
      setErrorMessage('Please drop a PDF file');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadStatus('idle');
      setErrorMessage('');
    }
  }, []);

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile);
      setUploadStatus('success');
      setTimeout(() => {
        setSelectedFile(null);
        setUploadStatus('idle');
      }, 2000);
    } catch (err) {
      setUploadStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        Upload Document
      </h3>

      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
                      ${isDragOver
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                      }`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Drag and drop a PDF file, or
          </p>
          <label className="cursor-pointer">
            <span className="text-sm text-primary-600 dark:text-primary-400 hover:underline">
              browse to upload
            </span>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <File className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              disabled={isUploading}
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {uploadStatus === 'success' ? (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Upload successful!</span>
            </div>
          ) : uploadStatus === 'error' ? (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{errorMessage}</span>
            </div>
          ) : (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg
                         hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-2 text-sm font-medium"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload & Process
                </>
              )}
            </button>
          )}
        </div>
      )}

      {errorMessage && !selectedFile && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}
    </div>
  );
}
