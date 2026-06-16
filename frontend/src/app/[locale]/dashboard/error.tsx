'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard Error Caught:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
      <p className="text-gray-600 mb-6 max-w-lg overflow-auto">
        {error.message || 'An unknown error occurred.'}
      </p>
      <div className="bg-red-50 p-4 rounded-lg text-left text-sm text-red-800 font-mono w-full max-w-2xl overflow-auto mb-6">
        {error.stack}
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
