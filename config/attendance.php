<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Late cutoff
    |--------------------------------------------------------------------------
    |
    | Students who tap in after this time (app timezone) are marked "late".
    | Format: H:i (24-hour).
    |
    */

    'late_after' => env('ATTENDANCE_LATE_AFTER', '08:00'),

    /*
    |--------------------------------------------------------------------------
    | Tap out cooldown (seconds)
    |--------------------------------------------------------------------------
    |
    | Minimum seconds required between time_in and time_out to prevent
    | accidental immediate double-taps on the RFID scanner.
    |
    */

    'tap_cooldown_seconds' => (int) env('ATTENDANCE_TAP_COOLDOWN_SECONDS', 120),

];
