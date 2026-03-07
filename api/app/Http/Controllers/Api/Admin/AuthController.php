<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\LoginRequest;
use App\Http\Requests\Admin\RegisterAdminRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
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

        if (! $user || ! $user->hasAnyRole($this->adminRoles())) {
            Auth::guard('admin')->logout();

            if ($request->hasSession()) {
                $request->session()->invalidate();
                $request->session()->regenerateToken();
            }

            abort(403, 'This account does not have Command Center access.');
        }

        return response()->json([
            'data' => $this->serializeAdminUser($user),
        ]);
    }

    public function register(RegisterAdminRequest $request): JsonResponse
    {
        $validated = $request->validated();

        /** @var User $user */
        $user = DB::transaction(function () use ($validated): User {
            $user = User::query()->create([
                'name' => trim((string) $validated['name']),
                'email' => strtolower(trim((string) $validated['email'])),
                'password' => (string) $validated['password'],
                'phone' => isset($validated['phone']) ? trim((string) $validated['phone']) : null,
                'zone_id' => $validated['zone_id'] ?? null,
                'device_hash' => null,
            ]);

            $user->syncRoles([(string) $validated['role']]);

            return $user->fresh();
        });

        return response()->json([
            'data' => $this->serializeAdminUser($user),
        ], 201);
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
        $user = $request->user('admin');

        return response()->json([
            'data' => $this->serializeAdminUser($user),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAdminUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'zone_id' => $user->zone_id,
            'roles' => $user->getRoleNames()->values()->all(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
        ];
    }

    /**
     * @return list<string>
     */
    private function adminRoles(): array
    {
        return array_values(array_filter(
            (array) config('admin.roles', []),
            static fn (mixed $role): bool => is_string($role) && $role !== ''
        ));
    }
}
