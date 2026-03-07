import CommandCenterShell from '@/components/command-center/command-center-shell';
import OrdersPageClient from '@/components/orders/orders-page-client';

export default function OrdersPage() {
  return (
    <CommandCenterShell>
      <OrdersPageClient />
    </CommandCenterShell>
  );
}
