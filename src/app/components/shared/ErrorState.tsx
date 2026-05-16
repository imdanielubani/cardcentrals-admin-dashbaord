import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

/**
 * Shown when an API call fails — displays the error message and a retry button.
 */
export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-7 h-7 text-red-400" />
      </div>
      <p className="text-[#272936] mb-1" style={{ fontSize: 15, fontWeight: 600 }}>
        Failed to load data
      </p>
      <p className="text-[#9CA3AF] max-w-xs mb-5" style={{ fontSize: 13 }}>
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 bg-[#0159C7] text-white rounded-xl hover:bg-[#014BA8] transition-colors"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      )}
    </div>
  );
}
