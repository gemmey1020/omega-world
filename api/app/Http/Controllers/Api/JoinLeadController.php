<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use App\Support\JoinAttestationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class JoinLeadController extends Controller
{
    private const EGYPT_MOBILE_PATTERN = '/^\+20(?:10|11|12|15)\d{8}$/';

    public function session(Request $request, JoinAttestationService $attestationService): Response
    {
        return response()
            ->noContent()
            ->withCookie($attestationService->issue($request));
    }

    public function store(Request $request, JoinAttestationService $attestationService): Response
    {
        $validated = $request->validate([
            'business_name' => ['required', 'string', 'max:120'],
            'owner_name' => ['required', 'string', 'max:120'],
            'whatsapp_number' => ['required', 'string', 'regex:'.self::EGYPT_MOBILE_PATTERN],
            'zone_id' => [
                'required',
                'integer',
                Rule::exists('zones', 'id')->whereNull('deleted_at'),
            ],
            'device_hash' => ['required', 'uuid'],
            'company_website' => ['nullable', 'string', 'max:255'],
        ]);

        if (trim((string) ($validated['company_website'] ?? '')) !== '') {
            throw ValidationException::withMessages([
                'company_website' => 'Join request could not be verified.',
            ]);
        }

        $attestationId = $attestationService->ensureValid($request);
        $zone = $this->resolveActiveZone((int) $validated['zone_id']);

        if ($zone === null) {
            throw ValidationException::withMessages([
                'zone_id' => 'Selected zone is not accepting join requests.',
            ]);
        }

        $redirectUrl = $this->buildJoinRedirectUrl(
            businessName: trim($validated['business_name']),
            ownerName: trim($validated['owner_name']),
            whatsappNumber: trim($validated['whatsapp_number']),
            zoneName: $zone->name,
        );

        $attestationService->markUsed($attestationId);

        return response()->json([
            'data' => [
                'redirect_url' => $redirectUrl,
            ],
        ], 201);
    }

    private function resolveActiveZone(int $zoneId): ?Zone
    {
        return Zone::query()
            ->select(['id', 'name'])
            ->whereKey($zoneId)
            ->whereNull('deleted_at')
            ->whereHas('vendors', function (Builder $vendorQuery): void {
                $vendorQuery
                    ->where('is_active', true)
                    ->whereHas('subscription', function (Builder $subscriptionQuery): void {
                        $subscriptionQuery
                            ->where('status', 'active')
                            ->where(function (Builder $expiresQuery): void {
                                $expiresQuery
                                    ->whereNull('expires_at')
                                    ->orWhere('expires_at', '>', now());
                            });
                    });
            })
            ->first();
    }

    private function buildJoinRedirectUrl(
        string $businessName,
        string $ownerName,
        string $whatsappNumber,
        string $zoneName,
    ): string {
        $targetNumber = preg_replace('/\D+/', '', (string) config('services.omega.join_whatsapp_number'));

        if (! is_string($targetNumber) || $targetNumber === '') {
            throw new HttpException(503, 'Join destination is not configured. Please contact support.');
        }

        $message = implode("\n", [
            'OMEGA Join Request',
            "Business: {$businessName}",
            "Owner: {$ownerName}",
            "Phone: {$whatsappNumber}",
            "Zone: {$zoneName}",
        ]);

        return sprintf(
            'https://wa.me/%s?text=%s',
            $targetNumber,
            rawurlencode($message)
        );
    }
}
