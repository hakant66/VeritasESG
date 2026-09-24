/**
 * Spinner component shown during validation
 */

import React from 'react';

interface ValidationSpinnerProps {
  message?: string;
  visible: boolean;
}

export const ValidationSpinner: React.FC<ValidationSpinnerProps> = ({
  message = 'Doğrulama çalışıyor…',
  visible,
}) => {
  if (!visible) return null;

  return (
    <div className="flex items-center justify-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-blue-700">{message}</span>
      </div>
    </div>
  );
};
