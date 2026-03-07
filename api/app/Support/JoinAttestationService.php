<?php

namespace App\Support;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Cookie;
use Symfony\Component\HttpKernel\Exception\HttpException;

class JoinAttestationService
{
    public const COOKIE_NAME = 'omega_join_attestation';
    private const CACHE_PREFIX = 'join_attestation:';
    private const MIN_DWELL_SECONDS = 8;
    private const TTL_MINUTES = 15;

    public function issue(Request $request): Cookie
    {
        $attestationId = (string) str()->uuid();
        $issuedAt = now();
        $expiresAt = $issuedAt->copy()->addMinutes(self::TTL_MINUTES);

        Cache::put($this->cacheKey($attestationId), [
            'issued_at' => $issuedAt->timestamp,
            'expires_at' => $expiresAt->timestamp,
            'ip_hash' => $this->hashContext((string) ($request->ip() ?? '')),
            'ua_hash' => $this->hashContext((string) $request->userAgent()),
            'used' => false,
        ], $expiresAt);

        return Cookie::create(
            self::COOKIE_NAME,
            Crypt::encryptString($attestationId),
            $expiresAt,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            Cookie::SAMESITE_LAX
        );
    }

    public function ensureValid(Request $request): string
    {
        $attestationId = $this->decryptCookie($request);
        $payload = Cache::get($this->cacheKey($attestationId));

        if (! is_array($payload)) {
            throw new HttpException(403, 'Join session is missing or expired. Refresh and try again.');
        }

        if (($payload['used'] ?? false) === true) {
            throw new HttpException(403, 'Join session has already been used. Refresh and try again.');
        }

        if (! hash_equals((string) ($payload['ip_hash'] ?? ''), $this->hashContext((string) ($request->ip() ?? '')))) {
            throw new HttpException(403, 'Join session does not match this connection. Refresh and try again.');
        }

        if (! hash_equals((string) ($payload['ua_hash'] ?? ''), $this->hashContext((string) $request->userAgent()))) {
            throw new HttpException(403, 'Join session does not match this browser. Refresh and try again.');
        }

        if (now()->timestamp - (int) ($payload['issued_at'] ?? 0) < self::MIN_DWELL_SECONDS) {
            throw ValidationException::withMessages([
                'session' => 'Please wait a few more seconds before applying.',
            ]);
        }

        return $attestationId;
    }

    public function markUsed(string $attestationId): void
    {
        $payload = Cache::get($this->cacheKey($attestationId));

        if (! is_array($payload)) {
            return;
        }

        $payload['used'] = true;
        $remainingSeconds = max(1, ((int) ($payload['expires_at'] ?? now()->timestamp)) - now()->timestamp);

        Cache::put($this->cacheKey($attestationId), $payload, now()->addSeconds($remainingSeconds));
    }

    private function decryptCookie(Request $request): string
    {
        $cookieValue = $request->cookie(self::COOKIE_NAME);

        if (! is_string($cookieValue) || $cookieValue === '') {
            throw new HttpException(403, 'Join session is missing or invalid. Refresh and try again.');
        }

        try {
            return Crypt::decryptString($cookieValue);
        } catch (DecryptException) {
            throw new HttpException(403, 'Join session is missing or invalid. Refresh and try again.');
        }
    }

    private function cacheKey(string $attestationId): string
    {
        return self::CACHE_PREFIX.$attestationId;
    }

    private function hashContext(string $value): string
    {
        return hash('sha256', config('app.key').'|'.$value);
    }
}
