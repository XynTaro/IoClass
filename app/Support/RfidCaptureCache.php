<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

class RfidCaptureCache
{
    /**
     * Resolve all allowed device tokens configured in .env / config.
     *
     * @return list<string>
     */
    public static function allowedDeviceTokens(): array
    {
        $tokens = [];

        $multiRaw = config('rfid.device_tokens');
        if (is_string($multiRaw) && $multiRaw !== '') {
            $tokens = array_merge($tokens, array_filter(array_map('trim', explode(',', $multiRaw))));
        }

        $single = config('rfid.device_token');
        if (is_string($single) && $single !== '') {
            $tokens[] = trim($single);
        }

        return array_values(array_unique(array_filter($tokens)));
    }

    /**
     * Retrieve the latest scanned RFID UID across the specified device key(s) or globally.
     *
     * @param  string|list<string>  $deviceKeys
     * @return array{uid: string, captured_at: int}|null
     */
    public static function latest(string|array $deviceKeys, int $since): ?array
    {
        $keys = is_array($deviceKeys) ? $deviceKeys : [$deviceKeys];
        $latestCapture = null;

        // Also check the global capture key so any registered device scan is captured
        $keys[] = '__global__';

        foreach (array_unique($keys) as $key) {
            $payload = Cache::get(self::cacheKey($key));

            if (! is_array($payload)) {
                continue;
            }

            $uid = $payload['uid'] ?? null;
            $capturedAt = $payload['captured_at'] ?? null;

            if (! is_string($uid) || $uid === '' || ! is_int($capturedAt) || $capturedAt <= $since) {
                continue;
            }

            if ($latestCapture === null || $capturedAt > $latestCapture['captured_at']) {
                $latestCapture = [
                    'uid' => $uid,
                    'captured_at' => $capturedAt,
                ];
            }
        }

        return $latestCapture;
    }

    public static function store(string $deviceKey, string $uid): void
    {
        $normalized = RfidUid::normalize($uid);

        if ($normalized === null) {
            return;
        }

        $payload = [
            'uid' => $normalized,
            'captured_at' => now()->timestamp,
            'device_key' => $deviceKey,
        ];

        $ttl = now()->addSeconds((int) config('rfid.capture_ttl', 120));

        Cache::put(self::cacheKey($deviceKey), $payload, $ttl);
        Cache::put(self::cacheKey('__global__'), $payload, $ttl);
    }

    public static function deviceKeyFromRequest(?string $deviceToken): string
    {
        if (is_string($deviceToken) && $deviceToken !== '') {
            return $deviceToken;
        }

        return 'default';
    }

    private static function cacheKey(string $deviceKey): string
    {
        return 'rfid.capture.'.hash('sha256', $deviceKey);
    }
}
