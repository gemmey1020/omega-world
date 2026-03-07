'use client';

import { Bell, Search, Settings2 } from '@/lib/icons';

export default function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-surface border-b border-border h-16">
      <div className="flex items-center justify-between h-full px-6 gap-4">
        {/* Logo/Branding */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-emerald flex items-center justify-center flex-shrink-0">
            <span className="text-navy font-bold text-sm">Ω</span>
          </div>
          <h1 className="text-sm font-semibold text-foreground hidden sm:block">
            OMEGA Command Center
          </h1>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-xs mx-auto hidden md:flex">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate pointer-events-none" />
            <input
              type="text"
              placeholder="Search operations..."
              className="omega-control w-full border border-border bg-navy pl-11 pr-4 text-sm text-foreground placeholder-slate focus:outline-none focus:border-emerald focus:ring-1 focus:ring-emerald/50"
              aria-label="Search operations"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            className="omega-control inline-flex min-w-[56px] items-center justify-center border border-border bg-navy text-slate transition-colors hover:text-foreground hover:bg-navy/80"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            className="omega-control inline-flex min-w-[56px] items-center justify-center border border-border bg-navy text-slate transition-colors hover:text-foreground hover:bg-navy/80"
            aria-label="Settings"
          >
            <Settings2 className="h-5 w-5" />
          </button>
          <div className="omega-control flex min-w-[56px] items-center justify-center bg-gradient-to-br from-emerald to-slate flex-shrink-0">
            <span className="text-navy font-semibold text-xs">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
