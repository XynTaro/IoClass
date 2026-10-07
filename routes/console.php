<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Notify guardians of students absent for concluded morning subjects
Schedule::command('attendance:notify-subject-absences --before=12:00')
    ->weekdays()
    ->at('12:00')
    ->description('Notify guardians of morning subject absences at 12:00 PM');

// Notify guardians of students absent for concluded afternoon subjects
Schedule::command('attendance:notify-subject-absences --before=16:00')
    ->weekdays()
    ->at('16:00')
    ->description('Notify guardians of afternoon subject absences at 4:00 PM');

// Final end-of-day check for any remaining late afternoon subjects
Schedule::command('attendance:notify-subject-absences --before=17:00')
    ->weekdays()
    ->at('17:00')
    ->description('Notify guardians of late afternoon subject absences at 5:00 PM');
