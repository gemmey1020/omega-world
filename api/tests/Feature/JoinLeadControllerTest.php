<?php

namespace Tests\Feature;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class JoinLeadControllerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        if (! extension_loaded('pdo_sqlite')) {
            $this->markTestSkipped('pdo_sqlite is not available in this environment.');
        }

        $this->withoutMiddleware(ThrottleRequests::class);
        config()->set('services.omega.join_whatsapp_number', '201000000000');

        Schema::create('zones', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->timestamp('deleted_at')->nullable();
        });

        Schema::create('vendors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('zone_id');
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->timestamp('deleted_at')->nullable();
        });

        Schema::create('vendor_subscriptions', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('vendor_id');
            $table->string('status');
            $table->timestamp('expires_at')->nullable();
        });

        $this->seedActiveZone();
    }

    protected function tearDown(): void
    {
        if (! extension_loaded('pdo_sqlite')) {
            parent::tearDown();
            return;
        }

        Schema::dropIfExists('vendor_subscriptions');
        Schema::dropIfExists('vendors');
        Schema::dropIfExists('zones');

        parent::tearDown();
    }

    public function test_join_session_sets_attestation_cookie(): void
    {
        $this->getJson('/api/join/session')
            ->assertNoContent()
            ->assertCookie('omega_join_attestation');
    }

    public function test_join_lead_requires_minimum_dwell_time(): void
    {
        $this->getJson('/api/join/session')->assertNoContent();

        $this->postJson('/api/join/lead', $this->validPayload())
            ->assertStatus(422)
            ->assertJsonValidationErrors(['session']);
    }

    public function test_join_lead_returns_redirect_url_after_valid_attestation(): void
    {
        $this->getJson('/api/join/session')->assertNoContent();
        $this->travel(8)->seconds();

        $this->postJson('/api/join/lead', $this->validPayload())
            ->assertCreated()
            ->assertJsonPath('data.redirect_url', 'https://wa.me/201000000000?text=OMEGA%20Join%20Request%0ABusiness%3A%20Test%20Market%0AOwner%3A%20Owner%20Name%0APhone%3A%20%2B201001234567%0AZone%3A%20Heliopolis');
    }

    public function test_join_lead_rejects_reused_attestation(): void
    {
        $this->getJson('/api/join/session')->assertNoContent();
        $this->travel(8)->seconds();

        $this->postJson('/api/join/lead', $this->validPayload())->assertCreated();

        $this->postJson('/api/join/lead', $this->validPayload())
            ->assertForbidden()
            ->assertJsonPath('message', 'Join session has already been used. Refresh and try again.');
    }

    public function test_join_lead_rejects_honeypot_payloads(): void
    {
        $this->getJson('/api/join/session')->assertNoContent();
        $this->travel(8)->seconds();

        $payload = $this->validPayload();
        $payload['company_website'] = 'https://spam.example';

        $this->postJson('/api/join/lead', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['company_website']);
    }

    public function test_join_lead_rejects_invalid_mobile_prefixes(): void
    {
        $this->getJson('/api/join/session')->assertNoContent();
        $this->travel(8)->seconds();

        $payload = $this->validPayload();
        $payload['whatsapp_number'] = '+201301234567';

        $this->postJson('/api/join/lead', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['whatsapp_number']);
    }

    private function seedActiveZone(): void
    {
        $zoneId = DB::table('zones')->insertGetId([
            'name' => 'Heliopolis',
            'deleted_at' => null,
        ]);

        $vendorId = DB::table('vendors')->insertGetId([
            'zone_id' => $zoneId,
            'name' => 'Active Vendor',
            'is_active' => true,
            'deleted_at' => null,
        ]);

        DB::table('vendor_subscriptions')->insert([
            'vendor_id' => $vendorId,
            'status' => 'active',
            'expires_at' => now()->addDay(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validPayload(): array
    {
        return [
            'business_name' => 'Test Market',
            'owner_name' => 'Owner Name',
            'whatsapp_number' => '+201001234567',
            'zone_id' => 1,
            'device_hash' => '11111111-1111-4111-8111-111111111111',
            'company_website' => '',
        ];
    }
}
