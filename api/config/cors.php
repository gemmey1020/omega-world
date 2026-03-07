<?php

$allowedOrigins = array_values(array_unique(array_filter(array_map(
    static fn (string $origin): string => trim($origin),
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000'))
), static fn (string $origin): bool => $origin !== '')));

return [

    /*
    |--------------------------------------------------------------------------
    | OMEGA CORS Configuration
    |--------------------------------------------------------------------------
    |
    | Strict Zero-Trust policy: Only the Next.js frontend origin is allowed.
    | All other origins are rejected.
    |
    */

    'paths' => ['api/*'],

    // Direct browser access stays read-only. Write traffic should use the same-origin Next.js proxy.
    'allowed_methods' => ['GET'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Content-Type'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
