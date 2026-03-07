<?php

namespace App\Http\Requests\Admin;

use App\Models\Provider;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProviderIndexRequest extends FormRequest
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
            'type' => ['sometimes', 'string', Rule::in(Provider::allowedTypes())],
            'status' => ['sometimes', 'string', Rule::in(Provider::allowedStatuses())],
            'zone_id' => ['sometimes', 'integer', Rule::exists('zones', 'id')->whereNull('deleted_at')],
            'vendor_id' => ['sometimes', 'integer', Rule::exists('vendors', 'id')->whereNull('deleted_at')],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
