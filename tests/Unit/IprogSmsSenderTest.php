<?php

use App\Services\Sms\IprogSmsSender;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

uses(TestCase::class);

beforeEach(function () {
    config([
        'services.iprogsms.token' => 'test_token_123',
        'services.iprogsms.base_url' => 'https://www.iprogsms.com',
    ]);
});

test('it sends sms through the iprog sms api', function () {
    Http::fake([
        'www.iprogsms.com/api/v1/sms_messages' => Http::response([
            'status' => 200,
            'message' => 'Your SMS message has been successfully added to the queue and will be processed shortly.',
            'message_id' => 'iSms-XHYBk',
        ], 200),
    ]);

    app(IprogSmsSender::class)->send('09171234567', 'Your IoClass password reset code is 123456.');

    Http::assertSent(function ($request) {
        return str_contains($request->url(), 'iprogsms.com/api/v1/sms_messages')
            && $request['api_token'] === 'test_token_123'
            && $request['phone_number'] === '639171234567'
            && str_contains((string) $request['message'], '123456');
    });
});

test('it throws when the iprog sms api rejects the request', function () {
    Http::fake([
        'www.iprogsms.com/api/v1/sms_messages' => Http::response([
            'error' => 'Unauthorized',
        ], 401),
    ]);

    app(IprogSmsSender::class)->send('09171234567', 'Test message');
})->throws(RequestException::class);

test('it throws a runtime exception when the api token is not configured', function () {
    config(['services.iprogsms.token' => '']);

    app(IprogSmsSender::class)->send('09171234567', 'Test message');
})->throws(RuntimeException::class, 'IPROG SMS is not configured');
