'use client';

import { useState } from 'react';
import {
  BarChart3,
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Map,
  MapPinned,
  Package,
  Settings2,
  Users,
} from '@/lib/icons';
import NavLink from './nav-link';

const navSections = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Real-time Map', icon: Map, href: '/map' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Orders', icon: Package, href: '/orders' },
      { label: 'Zones', icon: MapPinned, href: '/zones' },
      { label: 'Vendors', icon: Building2, href: '/vendors' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users', icon: Users, href: '/users' },
      { label: 'Reports', icon: BarChart3, href: '/reports' },
      { label: 'Settings', icon: Settings2, href: '/settings' },
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
            className="omega-control inline-flex w-full items-center justify-center border border-border text-slate hover:text-foreground hover:bg-surface transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Placeholder */}
      <div className="md:hidden h-16" />
    </>
  );
}
