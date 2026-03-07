<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ResolveSessionCookieName
{
    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        config([
            'session.cookie' => $this->shouldUseAdminSessionCookie($request)
                ? (string) config('session.admin_cookie', 'omega_admin_session')
                : (string) config('session.public_cookie', 'omega_session'),
        ]);

        return $next($request);
    }

    private function shouldUseAdminSessionCookie(Request $request): bool
    {
        if ($request->is('api/admin/*')) {
            return true;
        }

        if (! $request->is('sanctum/csrf-cookie')) {
            return false;
        }

        $requestOrigin = $this->extractRequestOrigin($request);

        if ($requestOrigin === null) {
            return false;
        }

        /** @var array<int, string> $adminOrigins */
        $adminOrigins = config('session.admin_origins', []);

        $normalizedAdminOrigins = array_values(array_filter(array_map(
            fn (string $origin): ?string => $this->normalizeOrigin($origin),
            $adminOrigins
        )));

        return in_array($requestOrigin, $normalizedAdminOrigins, true);
    }

    private function extractRequestOrigin(Request $request): ?string
    {
        $origin = $this->normalizeOrigin((string) $request->headers->get('Origin', ''));

        if ($origin !== null) {
            return $origin;
        }

        return $this->normalizeOrigin((string) $request->headers->get('Referer', ''));
    }

    private function normalizeOrigin(string $value): ?string
    {
        $trimmed = trim($value);

        if ($trimmed === '') {
            return null;
        }

        $parts = parse_url($trimmed);

        if ($parts === false || ! isset($parts['scheme'], $parts['host'])) {
            return null;
        }

        $origin = strtolower($parts['scheme']).'://'.strtolower($parts['host']);

        if (isset($parts['port'])) {
            $origin .= ':'.$parts['port'];
        }

        return $origin;
    }
}
