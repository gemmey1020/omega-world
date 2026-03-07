import { NextRequest } from 'next/server';
import { proxyAdminRequest } from '@/lib/server/admin-proxy';

export async function GET(request: NextRequest) {
  return proxyAdminRequest({
    path: '/api/admin/customers',
    request,
    method: 'GET',
  });
}
