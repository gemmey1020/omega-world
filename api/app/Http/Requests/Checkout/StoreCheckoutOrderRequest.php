<?php

namespace App\Http\Requests\Checkout;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCheckoutOrderRequest extends FormRequest
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
            'vendor_id' => ['required', 'integer', Rule::exists('vendors', 'id')->whereNull('deleted_at')],
            'device_hash' => ['required', 'uuid'],
            'source_channel' => ['sometimes', 'string', 'max:50'],
            'share_cart_url' => ['sometimes', 'nullable', 'url', 'max:2000'],
            'delivery_point' => ['sometimes', 'nullable', 'array'],
            'delivery_point.type' => ['required_with:delivery_point', 'string', Rule::in(['Point'])],
            'delivery_point.coordinates' => ['required_with:delivery_point', 'array', 'size:2'],
            'delivery_point.coordinates.0' => ['required_with:delivery_point.coordinates', 'numeric', 'between:-180,180'],
            'delivery_point.coordinates.1' => ['required_with:delivery_point.coordinates', 'numeric', 'between:-90,90'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', 'integer', 'distinct', Rule::exists('products', 'id')->whereNull('deleted_at')],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.title' => ['sometimes', 'string', 'max:255'],
            'items.*.price' => ['sometimes', 'numeric', 'min:0'],
            'items.*.image_url' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}
