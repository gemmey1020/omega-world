<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StaffIndexRequest extends FormRequest
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
            'search' => ['sometimes', 'string', 'max:255'],
            'role' => ['sometimes', 'string', Rule::in(config('admin.roles', []))],
            'zone_id' => ['sometimes', 'integer', Rule::exists('zones', 'id')->whereNull('deleted_at')],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
