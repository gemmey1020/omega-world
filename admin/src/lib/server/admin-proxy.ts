import { NextRequest, NextResponse } from 'next/server';

const apiBaseUrl = process.env.OMEGA_API_BASE_URL ?? 'http://127.0.0.1:8000';

interface ProxyAdminRequestOptions {
  path: string;
  request: NextRequest;
  method?: 'GET' | 'POST';
  bootstrapCsrf?: boolean;
}

export async function proxyAdminRequest({
  path,
  request,
  method = 'GET',
  bootstrapCsrf = false,
}: ProxyAdminRequestOptions): Promise<NextResponse> {
  const upstreamUrl = new URL(path, apiBaseUrl);
  const requestOrigin = request.headers.get('origin') ?? request.nextUrl.origin;
  const requestReferer = request.headers.get('referer') ?? `${request.nextUrl.origin}/login`;

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

  headers.set('Origin', requestOrigin);
  headers.set('Referer', requestReferer);

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

  let forwardedCookies = cookie;
  const responseCookies: string[] = [];

  if (bootstrapCsrf) {
    const csrfResponse = await fetch(new URL('/sanctum/csrf-cookie', apiBaseUrl), {
      method: 'GET',
      headers: new Headers({
        Accept: 'application/json',
        Origin: requestOrigin,
        Referer: requestReferer,
      }),
      cache: 'no-store',
    });

    const csrfSetCookies = getSetCookies(csrfResponse);
    responseCookies.push(...csrfSetCookies);

    const csrfCookieHeader = buildCookieHeader(csrfSetCookies);
    forwardedCookies = [forwardedCookies, csrfCookieHeader].filter(Boolean).join('; ');

    const bootstrapXsrfToken = extractXsrfToken(csrfSetCookies);
    if (bootstrapXsrfToken !== null) {
      headers.set('X-XSRF-TOKEN', bootstrapXsrfToken);
    }
  }

  if (forwardedCookies) {
    headers.set('Cookie', forwardedCookies);
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

  const upstreamSetCookies = getSetCookies(upstreamResponse);
  responseCookies.push(...upstreamSetCookies);

  for (const setCookie of responseCookies) {
    responseHeaders.append('set-cookie', setCookie);
  }

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: responseHeaders,
  });
}

function getSetCookies(response: Response): string[] {
  const cookieCapableHeaders = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof cookieCapableHeaders.getSetCookie === 'function') {
    return cookieCapableHeaders.getSetCookie();
  }

  const singleHeader = response.headers.get('set-cookie');

  return singleHeader ? [singleHeader] : [];
}

function buildCookieHeader(setCookies: string[]): string {
  return setCookies
    .map((setCookie) => setCookie.split(';', 1)[0]?.trim() ?? '')
    .filter((cookiePart) => cookiePart !== '')
    .join('; ');
}

function extractXsrfToken(setCookies: string[]): string | null {
  for (const setCookie of setCookies) {
    const match = setCookie.match(/(?:^|,\s*)XSRF-TOKEN=([^;]+)/);

    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return null;
}
