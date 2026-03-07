<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:rfc', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', 'min:12', 'max:255', 'confirmed'],
            'role' => ['required', 'string', Rule::in(config('admin.roles', []))],
            'phone' => ['nullable', 'string', 'max:32'],
            'zone_id' => [
                'nullable',
                'integer',
                Rule::exists('zones', 'id')->where(static fn ($query) => $query->whereNull('deleted_at')),
            ],
            'device_hash' => ['prohibited'],
            'vendor_id' => ['prohibited'],
            'provider_id' => ['prohibited'],
        ];
    }
}
