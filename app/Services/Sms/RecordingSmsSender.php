<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;

/**
 * In-memory SMS sender for feature tests.
 */
class RecordingSmsSender implements SmsSender
{
    /**
     * @var list<array{to: string, message: string}>
     */
    public array $messages = [];

    public function send(string $to, string $message): void
    {
        $this->messages[] = [
            'to' => $to,
            'message' => $message,
        ];
    }

    public function lastCode(): ?string
    {
        $last = end($this->messages);

        if ($last === false) {
            return null;
        }

        if (preg_match('/\b(\d{6})\b/', $last['message'], $matches) !== 1) {
            return null;
        }

        return $matches[1];
    }
}
