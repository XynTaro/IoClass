<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use App\Support\PhoneNumber;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class UniSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        $apiKey = (string) config('services.unisms.key');
        $senderId = (string) config('services.unisms.sender_id');
        $baseUrl = rtrim((string) config('services.unisms.base_url'), '/');

        if ($apiKey === '' || $senderId === '') {
            throw new RuntimeException('UniSMS is not configured. Set UNISMS_API_KEY and UNISMS_SENDER_ID.');
        }

        $recipient = PhoneNumber::toE164($to);

        try {
            $response = Http::baseUrl($baseUrl)
                ->withBasicAuth($apiKey, '')
                ->acceptJson()
                ->asJson()
                ->timeout(10)
                ->connectTimeout(3)
                ->retry(2, 200, fn ($exception): bool => $exception instanceof ConnectionException
                    || ($exception instanceof RequestException && $exception->response?->serverError()))
                ->post('/sms', [
                    'recipient' => $recipient,
                    'content' => $message,
                    'sender_id' => $senderId,
                    'metadata' => [
                        'source' => 'password_reset',
                    ],
                ])
                ->throw();
        } catch (RequestException $exception) {
            $body = $exception->response?->json() ?? $exception->response?->body();

            Log::error('UniSMS send failed', [
                'to' => $recipient,
                'sender_id' => $senderId,
                'status' => $exception->response?->status(),
                'body' => $body,
            ]);

            $senderErrors = data_get($body, 'errors.sender_id');

            if (is_array($senderErrors) && $senderErrors !== []) {
                throw new RuntimeException(
                    "UniSMS sender_id [{$senderId}] is invalid. Set UNISMS_SENDER_ID in .env to the Sender ID from your UniSMS dashboard.",
                    previous: $exception,
                );
            }

            throw $exception;
        }

        Log::info('UniSMS message queued', [
            'to' => $recipient,
            'reference_id' => $response->json('message.reference_id'),
            'status' => $response->json('message.status'),
        ]);
    }
}
