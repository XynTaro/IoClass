<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Automatically mark students who did not tap in or tap out as absent
// and notify guardians as soon as each subject's scheduled end_time concludes
Schedule::command('attendance:notify-subject-absences')
    ->weekdays()
    ->everyMinute()
    ->withoutOverlapping()
    ->description('Finalize concluded subjects and notify guardians of absent students immediately after class ends');
