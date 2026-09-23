<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apiToken = config('services.iprogsms.token');
$baseUrl = config('services.iprogsms.base_url');

// Check SMS credit balance
echo "=== Checking SMS Credits ===\n";
$creditResponse = Http::get("{$baseUrl}/api/v1/account/sms_credits", [
    'api_token' => $apiToken,
]);
echo 'Status: '.$creditResponse->status()."\n";
echo 'Response: '.$creditResponse->body()."\n\n";

// Check delivery status of last message
echo "=== Checking Delivery Status (iSms-07tHCs) ===\n";
$statusResponse = Http::get("{$baseUrl}/api/v1/sms_messages/status", [
    'api_token' => $apiToken,
    'message_id' => 'iSms-07tHCs',
]);
echo 'Status: '.$statusResponse->status()."\n";
echo 'Response: '.$statusResponse->body()."\n\n";

// Check recent SMS activity
echo "=== Recent SMS Activity ===\n";
$recentResponse = Http::get("{$baseUrl}/api/v1/account/recent_sms", [
    'api_token' => $apiToken,
    'limit' => 5,
]);
echo 'Status: '.$recentResponse->status()."\n";
echo 'Response: '.$recentResponse->body()."\n";
