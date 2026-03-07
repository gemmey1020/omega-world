'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavLinkProps {
  href: string;
  icon: string;
  label: string;
  isCollapsed: boolean;
}

export default function NavLink({
  href,
  icon,
  label,
  isCollapsed,
}: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-[10px] transition-colors ${
        isActive
          ? 'bg-emerald/10 text-emerald border border-emerald/30'
          : 'text-slate hover:text-foreground hover:bg-surface'
      }`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      {!isCollapsed && <span className="text-sm font-medium">{label}</span>}
    </Link>
  );
}
