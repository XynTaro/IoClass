<?php

return [

    /*
    |--------------------------------------------------------------------------
    | RFID Device Token
    |--------------------------------------------------------------------------
    |
    | When set, ESP32 devices must send this value in the X-Device-Token header.
    | Leave empty to allow unauthenticated device access (local/dev only).
    |
    */

    'device_token' => env('RFID_DEVICE_TOKEN'),

    /*
    |--------------------------------------------------------------------------
    | Multiple RFID Device Tokens
    |--------------------------------------------------------------------------
    |
    | Comma-separated list of allowed device tokens when using multiple ESP32s.
    | Takes precedence over device_token when set.
    | Example: RFID_DEVICE_TOKENS=esp32-room-a,esp32-room-b
    |
    */

    'device_tokens' => env('RFID_DEVICE_TOKENS'),

    /*
    |--------------------------------------------------------------------------
    | Wireless capture TTL (seconds)
    |--------------------------------------------------------------------------
    |
    | ESP32 scans are cached briefly so admin modals can poll and fill RFID UIDs.
    |
    */

    'capture_ttl' => (int) env('RFID_CAPTURE_TTL', 120),

    /*
    |--------------------------------------------------------------------------
    | ESP32 HTTP timeout
    |--------------------------------------------------------------------------
    |
    | Laravel on Windows/OneDrive can be slow on first request. Set the ESP32
    | HTTPClient timeout to at least 30000 ms and use GET /api/rfid/ping to
    | test connectivity before scan/register.
    |
    */

];
