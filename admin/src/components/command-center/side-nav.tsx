'use client';

import { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import NavLink from './nav-link';

const navSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: '📊', href: '/' },
      { label: 'Real-time Map', icon: '🗺️', href: '/map' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Orders', icon: '📦', href: '/orders' },
      { label: 'Zones', icon: '🔲', href: '/zones' },
      { label: 'Vendors', icon: '🏢', href: '/vendors' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', icon: '👥', href: '/users' },
      { label: 'Reports', icon: '📈', href: '/reports' },
      { label: 'Settings', icon: '⚙️', href: '/settings' },
    ],
  },
];

export default function SideNav() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Desktop Navigation */}
      <aside
        className={`fixed left-0 top-16 bottom-0 border-r border-border bg-navy transition-all duration-300 z-30 hidden md:flex flex-col ${
          isCollapsed ? 'w-20' : 'w-60'
        }`}
      >
        {/* Nav Content */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {!isCollapsed && (
                <h3 className="px-4 text-xs font-semibold text-slate uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isCollapsed={isCollapsed}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full h-10 rounded-[10px] flex items-center justify-center text-slate hover:text-foreground hover:bg-surface transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRightIcon className="w-4 h-4" />
            ) : (
              <ChevronLeftIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Placeholder */}
      <div className="md:hidden h-16" />
    </>
  );
}
