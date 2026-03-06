<?php

namespace Tests\Feature;

use Illuminate\Routing\Middleware\ThrottleRequests;
use Tests\TestCase;

class CartTokenControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->withoutMiddleware(ThrottleRequests::class);
    }

    public function test_it_issues_a_cart_token_and_resolves_it(): void
    {
        $payload = $this->validPayload();

        $issueResponse = $this->postJson('/api/cart/token', $payload)
            ->assertCreated()
            ->assertJsonStructure([
                'data' => ['token', 'expires_at'],
            ]);

        $token = (string) $issueResponse->json('data.token');

        $this->getJson("/api/cart/token/{$token}")
            ->assertOk()
            ->assertJsonPath('data.vendor_id', $payload['vendor_id'])
            ->assertJsonPath('data.vendor_name', $payload['vendor_name'])
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.product_id', 12)
            ->assertJsonPath('data.items.0.quantity', 2);
    }

    public function test_it_rejects_tampered_tokens(): void
    {
        $issueResponse = $this->postJson('/api/cart/token', $this->validPayload())
            ->assertCreated();

        $token = (string) $issueResponse->json('data.token');
        $tamperedToken = $token.'tampered';

        $this->getJson("/api/cart/token/{$tamperedToken}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Invalid cart token.');
    }

    public function test_it_rejects_expired_tokens(): void
    {
        $issueResponse = $this->postJson('/api/cart/token', $this->validPayload())
            ->assertCreated();

        $token = (string) $issueResponse->json('data.token');

        $this->travel(25)->hours();

        $this->getJson("/api/cart/token/{$token}")
            ->assertStatus(410)
            ->assertJsonPath('message', 'Cart token has expired.');
    }

    public function test_it_validates_required_cart_fields(): void
    {
        $this->postJson('/api/cart/token', [
            'vendor_id' => null,
            'vendor_name' => '',
            'items' => [],
        ])
            ->assertStatus(422)
            ->assertJsonValidationErrors([
                'vendor_id',
                'vendor_name',
                'items',
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(): array
    {
        return [
            'vendor_id' => 5,
            'vendor_name' => "Ahmed's Market",
            'items' => [
                [
                    'product_id' => 12,
                    'title' => 'Tomatoes',
                    'price' => 8.5,
                    'quantity' => 2,
                    'image_url' => null,
                ],
            ],
        ];
    }
}
