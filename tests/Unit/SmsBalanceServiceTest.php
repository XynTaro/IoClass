<?php

use App\Services\Sms\SmsBalanceService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

test('returns null when no SMS service is configured', function () {
    Config::set('services.iprogsms.token', '');
    Config::set('services.unisms.key', '');

    $service = new SmsBalanceService;

    expect($service->fetchFromProvider())->toBeNull();
});

test('fetches and converts IPROG SMS load balance correctly', function () {
    Config::set('services.iprogsms.token', 'test-token');
    Config::set('services.iprogsms.base_url', 'https://www.iprogsms.com');
    Config::set('services.unisms.key', '');

    Http::fake([
        'www.iprogsms.com/api/v1/account/sms_credits*' => Http::response([
            'status' => 'success',
            'message' => 'Account found.',
            'data' => [
                'load_balance' => '486.0',
            ],
        ], 200),
    ]);

    $service = new SmsBalanceService;

    expect($service->fetchFromProvider())->toBe(486);
});

test('fetches UniSMS credit balance correctly', function () {
    Config::set('services.iprogsms.token', '');
    Config::set('services.unisms.key', 'test-unisms-key');
    Config::set('services.unisms.base_url', 'https://unismsapi.com/api');

    Http::fake([
        'unismsapi.com/api/account*' => Http::response([
            'status' => 'active',
            'email' => 'admin@example.com',
            'sid_tokens' => 2,
            'sms_credits' => 150,
        ], 200),
    ]);

    $service = new SmsBalanceService;

    expect($service->fetchFromProvider())->toBe(150);
});

test('caches remaining messages balance', function () {
    Config::set('services.iprogsms.token', 'test-token');
    Config::set('services.iprogsms.base_url', 'https://www.iprogsms.com');

    Cache::put('sms_remaining_balance', 320, now()->addMinutes(5));

    Http::fake([
        '*' => Http::response([], 500),
    ]);

    $service = new SmsBalanceService;

    expect($service->getRemainingMessages())->toBe(320);
});

test('handles provider network failures gracefully without throwing', function () {
    Config::set('services.iprogsms.token', 'test-token');
    Config::set('services.iprogsms.base_url', 'https://www.iprogsms.com');

    Http::fake([
        '*' => Http::response('Server error', 500),
    ]);

    $service = new SmsBalanceService;

    expect($service->fetchFromProvider())->toBeNull();
});
