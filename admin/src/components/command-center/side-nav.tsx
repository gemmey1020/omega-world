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
      <aside
        className={`fixed left-0 top-16 bottom-0 border-r border-slate-800/50 bg-[#020617] transition-all duration-300 z-30 hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'
          }`}
      >
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-8 custom-scrollbar">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-2">
              {!isCollapsed && (
                <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="omega-control flex w-full items-center justify-center border border-teal-500/20 text-slate-400 hover:text-teal-400 hover:bg-teal-500/5 transition-all duration-200"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </aside>
    </>
  );
}