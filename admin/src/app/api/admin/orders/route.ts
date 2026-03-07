import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.OMEGA_API_BASE_URL ?? 'http://127.0.0.1:8000';

export async function GET(request: NextRequest) {
  const upstreamUrl = new URL('/api/admin/orders', apiBaseUrl);

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  const upstreamResponse = await fetch(upstreamUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Cookie: request.headers.get('cookie') ?? '',
    },
    cache: 'no-store',
  });

  const body = await upstreamResponse.text();

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      'content-type': upstreamResponse.headers.get('content-type') ?? 'application/json',
    },
  });
}
