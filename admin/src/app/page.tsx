import CommandCenterShell from '@/components/command-center/command-center-shell';
import DashboardOverview from '@/components/command-center/dashboard-overview';

export default function CommandCenterPage() {
  return (
    <CommandCenterShell>
      <DashboardOverview />
    </CommandCenterShell>
  );
}
