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

];
