<?php

namespace App\Services\Sms;

use App\Contracts\SmsSender;
use Illuminate\Support\Facades\Log;

/**
 * Temporary SMS driver that logs messages instead of sending them.
 * Replace the binding in AppServiceProvider when a real SMS API is configured.
 */
class LogSmsSender implements SmsSender
{
    public function send(string $to, string $message): void
    {
        Log::info('SMS stub (not delivered — configure a real SmsSender)', [
            'to' => $to,
            'message' => $message,
        ]);
    }
}
