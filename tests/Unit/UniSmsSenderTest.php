<?php

use App\Services\Sms\UniSmsSender;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config([
        'services.unisms.key' => 'sk_test_key',
        'services.unisms.sender_id' => 'IoClass',
        'services.unisms.base_url' => 'https://unismsapi.com/api',
    ]);
});

test('it sends sms through the unisms api', function () {
    Http::fake([
        'unismsapi.com/api/sms' => Http::response([
            'message' => [
                'status' => 'sent',
                'reference_id' => 'msg_test_123',
                'recipient' => '+639171234567',
            ],
        ], 201),
    ]);

    app(UniSmsSender::class)->send('09171234567', 'Your IoClass password reset code is 123456.');

    Http::assertSent(function ($request) {
        return $request->url() === 'https://unismsapi.com/api/sms'
            && $request->hasHeader('Authorization')
            && $request['recipient'] === '+639171234567'
            && $request['sender_id'] === 'IoClass'
            && str_contains((string) $request['content'], '123456');
    });
});

test('it throws when the unisms api rejects the request', function () {
    Http::fake([
        'unismsapi.com/api/sms' => Http::response([
            'message' => 'Unauthorized',
        ], 401),
    ]);

    app(UniSmsSender::class)->send('09171234567', 'Test message');
})->throws(RequestException::class);
