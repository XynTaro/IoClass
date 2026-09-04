<?php

namespace App\Console\Commands;

use App\Models\Student;
use App\Services\StudentAbsenceNotifier;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Artisan command that sends SMS notifications to guardians of absent students.
 *
 * Workflow:
 *  1. Resolve the target date (defaults to today).
 *  2. Query all students enrolled in the active school year.
 *  3. Subtract students who have a present/late/excused attendance record.
 *  4. For each remaining (absent) student, dispatch an SMS via the notifier service.
 *
 * Options:
 *  --date      Override the check date (YYYY-MM-DD).
 *  --section   Limit to a specific section ID.
 *  --force     Re-send even if the guardian was already notified today.
 */
class NotifyAbsentStudentsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:notify-absent
                            {--date= : The attendance date to check (defaults to today, YYYY-MM-DD)}
                            {--section= : Optional section ID to filter by}
                            {--force : Send notification even if already notified today}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send SMS notifications to guardians of students who are absent for the date.';

    public function __construct(private StudentAbsenceNotifier $absenceNotifier)
    {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        // ── 1. Resolve the target attendance date ────────────────────────
        $dateInput = $this->option('date');
        $date = is_string($dateInput) && $dateInput !== ''
            ? Carbon::parse($dateInput)->toDateString()
            : now()->toDateString();

        $sectionId = $this->option('section');
        $force = (bool) $this->option('force');

        // ── 2. Look up the active school year ──────────────────────────
        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        if (! $activeSyId) {
            $this->warn('No active school year found. Cannot check student enrollments.');

            return self::FAILURE;
        }

        $this->info("Checking absences for date: {$date} (School Year ID: {$activeSyId})");

        // ── 3. Query enrolled students (optionally filtered by section) ──
        $enrolledQuery = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->where('s.is_deleted', false)
            ->where('sec.is_deleted', false)
            ->where('ss.sy_id', $activeSyId)
            ->when($sectionId, fn ($q) => $q->where('ss.sect_id', (int) $sectionId));

        $allEnrolled = $enrolledQuery->select('s.stu_id', 'sec.sect_name')->get();

        if ($allEnrolled->isEmpty()) {
            $this->info('No enrolled students found matching criteria.');

            return self::SUCCESS;
        }

        // ── 4. Identify who actually attended today ─────────────────────
        $attendedStudentIds = DB::table('attendance')
            ->whereDate('att_date', $date)
            ->whereIn('status', ['present', 'late', 'excused'])
            ->pluck('stu_id')
            ->all();

        // Flip to a hash-set for O(1) lookups when filtering.
        $attendedSet = array_flip($attendedStudentIds);

        // ── 5. Derive absent students (enrolled − attended) ─────────────
        $absentStudents = $allEnrolled->filter(fn ($row) => ! isset($attendedSet[$row->stu_id]))->values();

        if ($absentStudents->isEmpty()) {
            $this->info('All enrolled students have attended. No absent students.');

            return self::SUCCESS;
        }

        // ── 6. Dispatch SMS notifications to guardians ──────────────────
        $this->info("Found {$absentStudents->count()} absent student(s). Sending guardian notifications...");

        $sentCount = 0;
        $failedOrSkipped = 0;

        foreach ($absentStudents as $row) {
            $student = Student::find($row->stu_id);

            if ($student === null) {
                continue;
            }

            $sent = $this->absenceNotifier->notify(
                student: $student,
                date: $date,
                subjectName: null,
                sectionName: $row->sect_name,
                force: $force,
            );

            if ($sent) {
                $sentCount++;
            } else {
                $failedOrSkipped++;
            }
        }

        $this->info("Completed. Notifications sent: {$sentCount}, Skipped/Failed/Already Notified: {$failedOrSkipped}.");

        return self::SUCCESS;
    }
}
