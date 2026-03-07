'use client';

import React from 'react';
import { TriangleAlert } from '@/lib/icons'; // التأكد من وجودها في ملف الأيقونات

interface OmegaErrorPanelProps {
  message: string;
  status?: number | null;
  title?: string;
  onRetry?: () => void;
  className?: string;
}

/**
 * دالة مساعدة لتحديد العنوان بناءً على حالة الـ API
 */
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

/**
 * المكون البرمجي للوحة أخطاء أوميجا (Red Neon Style)
 */
export const OmegaErrorPanel = React.memo(function OmegaErrorPanel({
  message,
  status,
  title,
  onRetry,
  className = '',
}: OmegaErrorPanelProps) {
  return (
    <div className={`omega-error-panel border border-red/30 bg-red/10 backdrop-blur-md p-5 rounded-[18px] animate-in fade-in slide-in-from-top-2 ${className}`.trim()}>
      <div className="flex items-start gap-4">
        {/* أيقونة التنبيه النيون */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-red/30 bg-red/15 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <TriangleAlert className="h-6 w-6 text-red-500" />
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500/80">
              {title ?? defaultTitle(status)}
            </p>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {message}
            </p>
          </div>

          {/* زر إعادة المحاولة - ميثاق 56px */}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="omega-control inline-flex items-center justify-center border border-red/40 bg-red/20 px-6 text-xs font-bold text-red-400 uppercase tracking-widest transition-all hover:bg-red/30 active:scale-95"
            >
              Retry request
            </button>
          )}
        </div>
      </div>
    </div>
  );
});