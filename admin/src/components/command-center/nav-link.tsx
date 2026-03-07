'use client';

import type { LucideIcon } from '@/lib/icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  icon: LucideIcon;
  label: string;
  isCollapsed: boolean;
}

export default function NavLink({
  href,
  icon: Icon,
  label,
  isCollapsed,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`omega-control flex items-center gap-3 px-4 py-3 transition-colors ${
        isActive
          ? 'bg-emerald/10 text-emerald border border-emerald/30'
          : 'text-slate hover:text-foreground hover:bg-surface'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}
