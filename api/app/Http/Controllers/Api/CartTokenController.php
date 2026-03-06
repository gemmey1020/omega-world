<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CartTokenController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'vendor_id' => ['required', 'integer', 'min:1'],
            'vendor_name' => ['required', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'min:1'],
            'items.*.title' => ['required', 'string', 'max:255'],
            'items.*.price' => ['required', 'numeric', 'min:0'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
            'items.*.image_url' => ['nullable', 'string', 'max:2000'],
        ]);

        $issuedAt = now();
        $expiresAt = $issuedAt->copy()->addDay();

        $payload = [
            'vendor_id' => (int) $validated['vendor_id'],
            'vendor_name' => trim((string) $validated['vendor_name']),
            'items' => array_map(function (array $item): array {
                return [
                    'product_id' => (int) $item['product_id'],
                    'title' => trim((string) $item['title']),
                    'price' => (float) $item['price'],
                    'quantity' => (int) $item['quantity'],
                    'image_url' => isset($item['image_url']) && $item['image_url'] !== ''
                        ? (string) $item['image_url']
                        : null,
                ];
            }, $validated['items']),
            'iat' => $issuedAt->timestamp,
            'exp' => $expiresAt->timestamp,
        ];

        $encryptedPayload = encrypt($payload);
        $token = $this->encodeUrlSafeToken($encryptedPayload);

        return response()->json([
            'data' => [
                'token' => $token,
                'expires_at' => $expiresAt->toISOString(),
            ],
        ], 201);
    }

    public function resolve(string $token): JsonResponse
    {
        $encryptedPayload = $this->decodeUrlSafeToken($token);

        if ($encryptedPayload === null) {
            return response()->json([
                'message' => 'Invalid cart token.',
            ], 422);
        }

        try {
            $decrypted = decrypt($encryptedPayload);
        } catch (DecryptException) {
            return response()->json([
                'message' => 'Invalid cart token.',
            ], 422);
        }

        if (! is_array($decrypted) || ! $this->isValidPayload($decrypted)) {
            return response()->json([
                'message' => 'Invalid cart token.',
            ], 422);
        }

        if ((int) $decrypted['exp'] < now()->timestamp) {
            return response()->json([
                'message' => 'Cart token has expired.',
            ], 410);
        }

        return response()->json([
            'data' => [
                'vendor_id' => (int) $decrypted['vendor_id'],
                'vendor_name' => (string) $decrypted['vendor_name'],
                'items' => array_map(function (array $item): array {
                    return [
                        'product_id' => (int) $item['product_id'],
                        'title' => (string) $item['title'],
                        'price' => (float) $item['price'],
                        'quantity' => (int) $item['quantity'],
                        'image_url' => $item['image_url'] !== null ? (string) $item['image_url'] : null,
                    ];
                }, $decrypted['items']),
            ],
        ]);
    }

    private function encodeUrlSafeToken(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function decodeUrlSafeToken(string $token): ?string
    {
        $normalized = strtr($token, '-_', '+/');
        $paddingLength = (4 - (strlen($normalized) % 4)) % 4;
        $normalized .= str_repeat('=', $paddingLength);

        $decoded = base64_decode($normalized, true);

        return is_string($decoded) ? $decoded : null;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function isValidPayload(array $payload): bool
    {
        if (! isset($payload['vendor_id'], $payload['vendor_name'], $payload['items'], $payload['iat'], $payload['exp'])) {
            return false;
        }

        if (! is_int($payload['vendor_id']) || ! is_string($payload['vendor_name'])) {
            return false;
        }

        if (! is_int($payload['iat']) || ! is_int($payload['exp'])) {
            return false;
        }

        if (! is_array($payload['items']) || $payload['items'] === []) {
            return false;
        }

        foreach ($payload['items'] as $item) {
            if (! is_array($item)) {
                return false;
            }

            if (! array_key_exists('product_id', $item)
                || ! array_key_exists('title', $item)
                || ! array_key_exists('price', $item)
                || ! array_key_exists('quantity', $item)
                || ! array_key_exists('image_url', $item)) {
                return false;
            }

            if (! is_int($item['product_id']) || ! is_string($item['title']) || ! is_numeric($item['price']) || ! is_int($item['quantity'])) {
                return false;
            }

            if (! is_string($item['image_url']) && $item['image_url'] !== null) {
                return false;
            }
        }

        return true;
    }
}
