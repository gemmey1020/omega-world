import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.OMEGA_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface ProxyAdminRequestOptions {
  path: string;
  request: NextRequest;
  method?: 'GET' | 'POST';
}

export async function proxyAdminRequest({
  path,
  request,
  method = 'GET',
}: ProxyAdminRequestOptions): Promise<NextResponse> {
  const upstreamUrl = new URL(path, apiBaseUrl);

  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.append(key, value);
  });

  const headers = new Headers({
    Accept: 'application/json',
  });

  const cookie = request.headers.get('cookie');
  if (cookie) {
    headers.set('Cookie', cookie);
  }

  const contentType = request.headers.get('content-type');
  if (contentType) {
    headers.set('Content-Type', contentType);
  }

  const xsrfToken = request.headers.get('x-xsrf-token');
  if (xsrfToken) {
    headers.set('X-XSRF-TOKEN', xsrfToken);
  }

  const requestInit: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (method !== 'GET') {
    requestInit.body = await request.text();
  }

  const upstreamResponse = await fetch(upstreamUrl, requestInit);
  const body = await upstreamResponse.text();
  const responseHeaders = new Headers();

  const upstreamContentType = upstreamResponse.headers.get('content-type');
  if (upstreamContentType) {
    responseHeaders.set('content-type', upstreamContentType);
  } else {
    responseHeaders.set('content-type', 'application/json');
  }

  const setCookie = upstreamResponse.headers.get('set-cookie');
  if (setCookie) {
    responseHeaders.set('set-cookie', setCookie);
  }

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}
