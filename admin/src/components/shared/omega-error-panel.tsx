'use client';

import React from 'react';
import { TriangleAlert } from '@/lib/icons';

interface OmegaErrorPanelProps {
  message: string;
  status?: number | null;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

function defaultTitle(status?: number | null): string {
  switch (status) {
    case 401:
      return 'Admin session expired';
    case 403:
      return 'Access denied';
    case 409:
      return 'Conflict detected';
    case 422:
      return 'Validation failed';
    default:
      return 'System fault';
  }
}

function OmegaErrorPanelImpl({
  message,
  status,
  title,
  onRetry,
  className = '',
}: OmegaErrorPanelProps) {
  return (
    <div className={`omega-error-panel ${className}`.trim()}>
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-secondary)] border border-red/30 bg-red/10">
          <TriangleAlert className="h-5 w-5 text-red" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red/80">
              {title ?? defaultTitle(status)}
            </p>
            <p className="text-sm text-foreground">{message}</p>
          </div>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="omega-control inline-flex items-center justify-center border border-red/40 bg-red/10 px-5 text-sm font-semibold text-red transition-colors hover:bg-red/15"
            >
              Retry request
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const OmegaErrorPanel = React.memo(OmegaErrorPanelImpl);

export default OmegaErrorPanel;
