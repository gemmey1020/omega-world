import CommandCenterShell from '@/components/command-center/command-center-shell';
import UsersPageClient from '@/components/users/users-page-client';

export default function UsersPage() {
  return (
    <CommandCenterShell>
      <UsersPageClient />
    </CommandCenterShell>
  );
}
