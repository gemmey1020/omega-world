<?php

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

    'allowed_methods' => ['GET'],

    'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Accept', 'Content-Type'],

    'exposed_headers' => [],

    'max_age' => 3600,

    'supports_credentials' => false,

];
