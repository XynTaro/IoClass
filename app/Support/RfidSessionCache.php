<?php

namespace App\Support;

use Illuminate\Support\Facades\Cache;

/**
 * Stores an active teaching session per ESP32 device.
 *
 * When a teacher taps their card, a session is opened and cached here.
 * When a student taps next, the session is read so attendance is linked
 * to the correct section and class schedule.
 *
 * Session TTL defaults to 4 hours (covers a full school-day period).
 */
class RfidSessionCache
{
    private const TTL_SECONDS = 14_400; // 4 hours

    /**
     * @param  array{
     *     tch_id: int,
     *     tch_name: string,
     *     sect_id: int|null,
     *     sect_name: string|null,
     *     subj_id: int|null,
     *     subj_name: string|null,
     *     schedule_id: int|null,
     *     started_at: int,
     * } $session
     */
    public static function open(string $deviceKey, array $session): void
    {
        Cache::put(self::cacheKey($deviceKey), $session, self::TTL_SECONDS);
    }

    /**
     * @return array{
     *     tch_id: int,
     *     tch_name: string,
     *     sect_id: int|null,
     *     sect_name: string|null,
     *     subj_id: int|null,
     *     subj_name: string|null,
     *     schedule_id: int|null,
     *     started_at: int,
     * }|null
     */
    public static function get(string $deviceKey): ?array
    {
        $payload = Cache::get(self::cacheKey($deviceKey));

        return is_array($payload) ? $payload : null;
    }

    public static function close(string $deviceKey): void
    {
        Cache::forget(self::cacheKey($deviceKey));
    }

    private static function cacheKey(string $deviceKey): string
    {
        return 'rfid.session.'.hash('sha256', $deviceKey);
    }
}
