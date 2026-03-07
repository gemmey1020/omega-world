import CommandCenterShell from '@/components/command-center/command-center-shell';
import ReportsPageClient from '@/components/reports/reports-page-client';

export default function ReportsPage() {
  return (
    <CommandCenterShell>
      <ReportsPageClient />
    </CommandCenterShell>
  );
}
