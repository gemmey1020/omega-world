<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StaffIndexRequest;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class StaffController extends Controller
{
    public function index(StaffIndexRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $perPage = (int) ($validated['per_page'] ?? 50);
        $adminRoles = $this->adminRoles();

        $query = User::query()
            ->select('users.*')
            ->selectSub(
                DB::table('sessions')
                    ->selectRaw('MAX(last_activity)')
                    ->whereColumn('sessions.user_id', 'users.id'),
                'last_seen_at_unix'
            )
            ->with([
                'zone:id,name',
                'roles:id,name,guard_name',
            ])
            ->whereHas('roles', function ($builder) use ($adminRoles, $validated): void {
                $builder
                    ->where('guard_name', 'admin')
                    ->whereIn('name', $adminRoles);

                if (isset($validated['role'])) {
                    $builder->where('name', $validated['role']);
                }
            });

        if (isset($validated['zone_id'])) {
            $query->where('zone_id', (int) $validated['zone_id']);
        }

        if (! empty($validated['search'])) {
            $search = trim((string) $validated['search']);

            $query->where(function ($builder) use ($search): void {
                $builder
                    ->where('name', 'ilike', "%{$search}%")
                    ->orWhere('email', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'ilike', "%{$search}%");
            });
        }

        $staff = $query
            ->orderByDesc('last_seen_at_unix')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return response()->json([
            'data' => $staff->getCollection()->map(fn (User $user): array => $this->transformStaff($user))->values()->all(),
            'meta' => $this->buildPaginatorMeta($staff),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function transformStaff(User $user): array
    {
        $lastSeenAtUnix = $this->resolveUnixTimestamp($user->getAttribute('last_seen_at_unix'));
        $roles = $user->getRoleNames()->values()->all();

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'zone_id' => $user->zone_id,
            'zone' => $user->zone ? [
                'id' => $user->zone->id,
                'name' => $user->zone->name,
            ] : null,
            'roles' => $roles,
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'last_seen_at' => $lastSeenAtUnix !== null ? Carbon::createFromTimestamp($lastSeenAtUnix)->toISOString() : null,
            'status' => $lastSeenAtUnix !== null && $lastSeenAtUnix >= now()->subMinutes(15)->timestamp ? 'active' : 'inactive',
            'created_at' => $user->created_at?->toISOString(),
            'updated_at' => $user->updated_at?->toISOString(),
        ];
    }

    /**
     * @return array<string, int|null>
     */
    private function buildPaginatorMeta(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
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

    private function resolveUnixTimestamp(mixed $value): ?int
    {
        if ($value === null) {
            return null;
        }

        if (is_numeric($value)) {
            return (int) $value;
        }

        return null;
    }
}
