<?php

namespace App\Console\Commands;

use App\Services\StudentAbsenceNotifier;
use Illuminate\Console\Command;

/**
 * Artisan command that scans concluded class schedules and sends SMS
 * notifications to guardians of students who were absent for each specific subject.
 *
 * Typically run at midday (12:00 PM) for morning subjects and late afternoon
 * (4:00 PM / 5:00 PM) for afternoon subjects.
 */
class NotifySubjectAbsencesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:notify-subject-absences
                            {--date= : The date to check (defaults to today, YYYY-MM-DD)}
                            {--before= : Only check schedules ending at or before time (HH:MM)}
                            {--section= : Optional section ID to filter by}
                            {--force : Send notification even if already notified today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send SMS notifications to guardians of students who missed specific subjects that have concluded.';

    public function __construct(private StudentAbsenceNotifier $absenceNotifier)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $date = $this->option('date');
        $before = $this->option('before');
        $sectionId = $this->option('section') ? (int) $this->option('section') : null;
        $force = (bool) $this->option('force');

        $this->info('Scanning concluded subjects for absences...');

        $result = $this->absenceNotifier->notifyConcludedSubjectAbsences(
            date: is_string($date) ? $date : null,
            beforeTime: is_string($before) ? $before : null,
            sectionId: $sectionId,
            force: $force,
        );

        $this->info(sprintf(
            'Scanned %d schedule(s), found %d subject absence(s), sent %d notification(s).',
            $result['checked_schedules'],
            $result['absences_found'],
            $result['notified_count'],
        ));

        return self::SUCCESS;
    }
}
