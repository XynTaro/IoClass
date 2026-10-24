<?php

return [

    // Fallback "late" cutoff, used only when no class start time is known.
    'late_after' => env('ATTENDANCE_LATE_AFTER', '08:00'),

    // Student is "late" if they tap in after class start + this many minutes.
    'late_grace_minutes' => (int) env('ATTENDANCE_LATE_GRACE_MINUTES', 10),

    // Students may tap in this many minutes BEFORE class starts (0 = strict).
    'tap_in_early_minutes' => (int) env('ATTENDANCE_TAP_IN_EARLY_MINUTES', 0),

    // Tap out is allowed only in the last N minutes of class.
    'tap_out_window_minutes' => (int) env('ATTENDANCE_TAP_OUT_WINDOW_MINUTES', 5),

    // Double-tap guard only (tap out is controlled by the window above).
    'tap_cooldown_seconds' => (int) env('ATTENDANCE_TAP_COOLDOWN_SECONDS', 30),

    // Teacher can tap up to N minutes before the class starts and still
    // match that class schedule.
    'teacher_tap_early_minutes' => (int) env('ATTENDANCE_TEACHER_TAP_EARLY_MINUTES', 10),

];
