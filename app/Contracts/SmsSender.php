<?php

namespace App\Contracts;

interface SmsSender
{
    /**
     * Send an SMS message. Swap the bound implementation when a real SMS API is ready.
     */
    public function send(string $to, string $message): void;
}
