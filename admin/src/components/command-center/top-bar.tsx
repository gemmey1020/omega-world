'use client';

import { MagnifyingGlassIcon, BellIcon, GearIcon } from '@radix-ui/react-icons';

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
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate pointer-events-none" />
            <input
              type="text"
              placeholder="Search operations..."
              className="w-full pl-10 pr-4 h-10 rounded-[10px] bg-navy border border-border text-foreground placeholder-slate text-sm focus:outline-none focus:border-emerald focus:ring-1 focus:ring-emerald/50"
              aria-label="Search operations"
            />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-slate hover:text-foreground hover:bg-navy transition-colors"
            aria-label="Notifications"
          >
            <BellIcon className="w-5 h-5" />
          </button>
          <button
            className="w-10 h-10 rounded-[10px] flex items-center justify-center text-slate hover:text-foreground hover:bg-navy transition-colors"
            aria-label="Settings"
          >
            <GearIcon className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-emerald to-slate flex items-center justify-center flex-shrink-0">
            <span className="text-navy font-semibold text-xs">AD</span>
          </div>
        </div>
      </div>
    </header>
  );
}
