import { NextRequest } from 'next/server';
import { proxyAdminRequest } from '@/lib/server/admin-proxy';

export async function POST(request: NextRequest) {
  return proxyAdminRequest({
    path: '/api/admin/auth/register',
    request,
    method: 'POST',
  });
}
