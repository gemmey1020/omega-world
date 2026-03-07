<?php

namespace App\Http\Requests\Admin;

use App\Models\Order;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OrderIndexRequest extends FormRequest
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
            'status' => ['sometimes', 'string', Rule::in(Order::allowedStatuses())],
            'kind' => ['sometimes', 'string', Rule::in(Order::allowedKinds())],
            'zone_id' => ['sometimes', 'integer', Rule::exists('zones', 'id')->whereNull('deleted_at')],
            'provider_id' => ['sometimes', 'integer', Rule::exists('providers', 'id')->whereNull('deleted_at')],
            'customer_user_id' => ['sometimes', 'integer', Rule::exists('users', 'id')->whereNull('deleted_at')],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
            'search' => ['sometimes', 'string', 'max:255'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ];
    }
}
