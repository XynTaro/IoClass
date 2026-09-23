<?php

require __DIR__ . '/../vendor/autoload.php';

$app = require_once __DIR__ . '/../bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

try {
    $sender = app(\App\Services\Sms\IprogSmsSender::class);
    $sender->send('09171254376', 'IoClass SMS test from teacher flow - debug script');
    echo "SUCCESS: SMS sent\n";
} catch (\Throwable $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
    echo get_class($e) . "\n";
}
