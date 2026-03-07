import CommandCenterShell from '@/components/command-center/command-center-shell';
import ZonesPageClient from '@/components/zones/zones-page-client';

export default function ZonesPage() {
  return (
    <CommandCenterShell>
      <ZonesPageClient />
    </CommandCenterShell>
  );
}
