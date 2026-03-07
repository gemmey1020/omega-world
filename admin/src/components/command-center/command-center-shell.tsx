'use client';

import TopBar from './top-bar';
import SideNav from './side-nav';

interface CommandCenterShellProps {
  children: React.ReactNode;
}

export default function CommandCenterShell({
  children,
}: CommandCenterShellProps) {
  return (
    <div className="bg-navy min-h-screen">
      <TopBar />
      <SideNav />

      {/* Main Content Area */}
      <main className="pt-16 md:pl-60 transition-all duration-300">
        <div className="p-6 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
