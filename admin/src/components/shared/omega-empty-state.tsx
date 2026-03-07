'use client';

import React from 'react';
import { Activity } from '@/lib/icons';

interface OmegaEmptyStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

function OmegaEmptyStateImpl({
  title,
  message,
  actionLabel,
  onAction,
}: OmegaEmptyStateProps) {
  return (
    <div className="rounded-[18px] border border-border bg-surface/80 px-6 py-10 text-center shadow-[0_0_0_1px_rgba(51,65,85,0.35)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[var(--radius-secondary)] border border-teal/20 bg-teal/10">
        <Activity className="h-5 w-5 text-teal" />
      </div>
      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="mx-auto max-w-xl text-sm text-slate">{message}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="omega-control mt-6 inline-flex items-center justify-center border border-teal/30 bg-teal/10 px-5 text-sm font-semibold text-teal transition-colors hover:bg-teal/15"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

const OmegaEmptyState = React.memo(OmegaEmptyStateImpl);

export default OmegaEmptyState;
