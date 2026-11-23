<?php

namespace App\Console\Commands;

use App\Models\School_Year;
use Illuminate\Console\Command;

class SyncActiveSchoolYearCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'school-year:sync-active {--date= : Reference date (YYYY-MM-DD) to evaluate against}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Synchronize the active school year based on the current date';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $dateOption = $this->option('date');
        $date = is_string($dateOption) && $dateOption !== '' ? $dateOption : null;

        $active = School_Year::syncActiveForDate($date);

        if ($active) {
            $this->info("Active school year synced: {$active->sy_label} ({$active->start_date?->format('Y-m-d')} to {$active->end_date?->format('Y-m-d')}).");
        } else {
            $this->info('No school year covers the target date; ended and upcoming school years have been deactivated.');
        }

        return self::SUCCESS;
    }
}
