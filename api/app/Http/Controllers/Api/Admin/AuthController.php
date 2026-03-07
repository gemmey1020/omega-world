<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * @var list<string>
     */
    private const ADMIN_ROLES = [
        'super_admin',
        'ops_dispatcher',
        'support_analyst',
        'catalog_manager',
        'merchant_success',
    ];

    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $credentials = [
            'email' => strtolower(trim((string) $validated['email'])),
            'password' => (string) $validated['password'],
        ];
        $remember = (bool) ($validated['remember'] ?? false);

        if (! Auth::guard('admin')->attempt($credentials, $remember)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        if ($request->hasSession()) {
            $request->session()->regenerate();
        }

        /** @var User|null $user */
        $user = Auth::guard('admin')->user();

        if (! $user || ! $user->hasAnyRole(self::ADMIN_ROLES)) {
            Auth::guard('admin')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            abort(403, 'This account does not have Command Center access.');
        }

        return response()->json([
            'data' => $this->serializeUser($user),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('admin')->logout();

        if ($request->hasSession()) {
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json([], 204);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        return response()->json([
            'data' => $this->serializeUser($user),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'zone_id' => $user->zone_id,
            'roles' => $user->getRoleNames()->values()->all(),
        ];
    }
}
