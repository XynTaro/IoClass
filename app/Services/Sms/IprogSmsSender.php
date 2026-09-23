<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use App\Support\PhoneNumber;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class IprogSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        $apiToken = (string) config('services.iprogsms.token');
        $baseUrl = rtrim((string) config('services.iprogsms.base_url'), '/');

        if ($apiToken === '') {
            throw new RuntimeException('IPROG SMS is not configured. Set IPROGSMS_API_TOKEN in .env.');
        }

        $recipient = PhoneNumber::toE164($to);

        // IPROG SMS accepts the local format (09xxxxxxxxx) or E.164 without the leading +
        // Strip the leading + so the number is in the 639xxxxxxxxx format the API expects.
        $phoneNumber = ltrim($recipient, '+');

        try {
            $response = Http::baseUrl($baseUrl)
                ->acceptJson()
                ->asJson()
                ->timeout(10)
                ->connectTimeout(3)
                ->retry(2, 200, fn ($exception): bool => $exception instanceof ConnectionException
                    || ($exception instanceof RequestException && $exception->response?->serverError()))
                ->post('/api/v1/sms_messages', [
                    'api_token' => $apiToken,
                    'phone_number' => $phoneNumber,
                    'message' => $message,
                ])
                ->throw();
        } catch (RequestException $exception) {
            $body = $exception->response?->json() ?? $exception->response?->body();

            Log::error('IPROG SMS send failed', [
                'to' => $recipient,
                'status' => $exception->response?->status(),
                'body' => $body,
            ]);

            throw $exception;
        }

        Log::info('IPROG SMS message queued', [
            'to' => $recipient,
            'message_id' => $response->json('message_id'),
            'status' => $response->json('status'),
        ]);
    }
}
