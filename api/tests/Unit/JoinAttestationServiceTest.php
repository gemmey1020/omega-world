<?php

namespace Tests\Unit;

use App\Support\JoinAttestationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class JoinAttestationServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config()->set('cache.default', 'array');
        config()->set('app.key', 'base64:'.base64_encode(random_bytes(32)));
    }

    public function test_issue_sets_a_signed_http_only_cookie(): void
    {
        $service = new JoinAttestationService();
        $request = Request::create('/api/join/session', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'OMEGA Test Browser',
        ]);

        $cookie = $service->issue($request);

        $this->assertSame('omega_join_attestation', $cookie->getName());
        $this->assertTrue($cookie->isHttpOnly());
        $this->assertSame('lax', $cookie->getSameSite());
    }

    public function test_ensure_valid_enforces_the_minimum_dwell_time(): void
    {
        $service = new JoinAttestationService();
        $request = Request::create('/api/join/session', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'OMEGA Test Browser',
        ]);

        $cookie = $service->issue($request);
        $request->cookies->set($cookie->getName(), (string) $cookie->getValue());

        $this->expectException(ValidationException::class);

        $service->ensureValid($request);
    }

    public function test_mark_used_blocks_attestation_reuse_after_a_valid_dwell_time(): void
    {
        Cache::flush();

        $service = new JoinAttestationService();
        $request = Request::create('/api/join/session', 'GET', server: [
            'REMOTE_ADDR' => '127.0.0.1',
            'HTTP_USER_AGENT' => 'OMEGA Test Browser',
        ]);

        $cookie = $service->issue($request);
        $request->cookies->set($cookie->getName(), (string) $cookie->getValue());

        $this->travel(8)->seconds();

        $attestationId = $service->ensureValid($request);
        $service->markUsed($attestationId);

        $this->expectException(HttpException::class);
        $this->expectExceptionMessage('Join session has already been used. Refresh and try again.');

        $service->ensureValid($request);
    }
}
