<?php

namespace App\Http\Requests\Admin;

use App\Models\Provider;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProviderRequest extends FormRequest
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
            'type' => ['required', 'string', Rule::in(Provider::allowedTypes())],
            'vendor_id' => [
                'nullable',
                'integer',
                Rule::exists('vendors', 'id')->whereNull('deleted_at'),
                Rule::unique('providers', 'vendor_id'),
            ],
            'zone_id' => ['required', 'integer', Rule::exists('zones', 'id')->whereNull('deleted_at')],
            'display_name' => ['required', 'string', 'max:255'],
            'primary_contact_phone' => ['nullable', 'string', 'max:32'],
            'whatsapp_number' => ['nullable', 'string', 'max:32'],
            'status' => ['required', 'string', Rule::in(Provider::allowedStatuses())],
            'coordinates' => ['sometimes', 'nullable', 'array'],
            'coordinates.type' => ['required_with:coordinates', 'string', Rule::in(['Point'])],
            'coordinates.coordinates' => ['required_with:coordinates', 'array', 'size:2'],
            'coordinates.coordinates.0' => ['required_with:coordinates.coordinates', 'numeric', 'between:-180,180'],
            'coordinates.coordinates.1' => ['required_with:coordinates.coordinates', 'numeric', 'between:-90,90'],
            'capabilities_json' => ['sometimes', 'nullable', 'array'],
            'sla_profile_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'escalation_policy_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
            'metadata_json' => ['sometimes', 'nullable', 'array'],
        ];
    }

    public function after(): array
    {
        return [
            function ($validator): void {
                $type = (string) $this->input('type');
                $vendorId = $this->input('vendor_id');

                if ($vendorId !== null && $type !== Provider::TYPE_MERCHANT) {
                    $validator->errors()->add('vendor_id', 'Vendor linkage is only valid for merchant providers.');
                }
            },
        ];
    }
}
