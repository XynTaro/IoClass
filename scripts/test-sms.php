<?php

use App\Services\Sms\IprogSmsSender;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\Http;

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$apiToken = config('services.iprogsms.token');
$baseUrl = config('services.iprogsms.base_url');

// Check credits first
$creditResponse = Http::get("{$baseUrl}/api/v1/account/sms_credits", ['api_token' => $apiToken]);
$balance = $creditResponse->json('data.load_balance');
echo "Credits remaining: {$balance}\n\n";

if ((float) $balance < 1) {
    echo "ERROR: Insufficient credits. Please top up at iprogsms.com\n";
    exit(1);
}

// Send the teacher credential SMS (fixed message — no 'IoClass: ' prefix)
try {
    $sender = app(IprogSmsSender::class);
    $sender->send('09345730859', 'Your teacher account login code is TestPass12, please log in and change your password.');
    echo "SUCCESS: SMS sent to 09345730859\n";
} catch (Throwable $e) {
    echo 'ERROR: '.$e->getMessage()."\n";
    echo get_class($e)."\n";
}
