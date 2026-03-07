import CommandCenterShell from '@/components/command-center/command-center-shell';
import VendorsPageClient from '@/components/vendors/vendors-page-client';

export default function VendorsPage() {
  return (
    <CommandCenterShell>
      <VendorsPageClient />
    </CommandCenterShell>
  );
}
