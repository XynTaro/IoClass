<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\CalendarEvent;
use App\Models\Student;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class StudentAttendanceService
{
    private StudentAbsenceNotifier $absenceNotifier;

    public function __construct(?StudentAbsenceNotifier $absenceNotifier = null)
    {
        $this->absenceNotifier = $absenceNotifier ?? app(StudentAbsenceNotifier::class);
    }

    /**
     * Record attendance for a student.
     *
     * Rules:
     *  - Teacher must have an active session with a matched class schedule.
     *  - Student must be enrolled in the session's section.
     *  - Tap in is only allowed between class start (minus optional early
     *    minutes) and class end.
     *  - Tap out is only allowed in the last N minutes of class.
     *
     * Blocked actions returned: blocked (non-school day), no_session,
     * not_your_class, outside_class_time, too_early_out, cooldown,
     * already_timed_out.
     *
     * @param  array{
     *     tch_id: int,
     *     tch_name: string,
     *     sect_id: int|null,
     *     sect_name: string|null,
     *     subj_id: int|null,
     *     subj_name: string|null,
     *     schedule_id: int|null,
     *     start_time: string|null,
     *     end_time: string|null,
     *     started_at: int,
     * }|null $session
     */
    public function recordForStudent(Student $student, ?CarbonInterface $scannedAt = null, ?array $session = null): array
    {
        $scannedAt = Carbon::instance($scannedAt ?? now());
        $attDate = $scannedAt->toDateString();

        // ── Block attendance on non-school days (holidays, breaks, suspensions) ──
        $nonSchoolDay = CalendarEvent::nonSchoolDayInfo($attDate);
        if ($nonSchoolDay !== null) {
            return [
                'recorded' => false,
                'already_checked_in' => false,
                'action' => 'blocked',
                'non_school_day' => true,
                'event_title' => $nonSchoolDay['title'],
                'event_type' => $nonSchoolDay['type'],
                'status' => 'no_class',
                'time_in' => $scannedAt->toIso8601String(),
                'time_out' => null,
            ];
        }

        // ── Class-window rules ────────────────────────────────────────────────
        if (
            $session === null
            || empty($session['schedule_id'])
            || empty($session['sect_id'])
            || empty($session['start_time'])
            || empty($session['end_time'])
        ) {
            return $this->blocked('no_session', 'No active class. Teacher must tap first.', $scannedAt);
        }

        if (! $this->isEnrolledInSection((int) $student->stu_id, (int) $session['sect_id'])) {
            return $this->blocked('not_your_class', 'You are not enrolled in this class.', $scannedAt);
        }

        $tz = $scannedAt->getTimezone();
        $start = Carbon::parse($attDate.' '.$session['start_time'], $tz);
        $end = Carbon::parse($attDate.' '.$session['end_time'], $tz);
        $tapInOpens = $start->copy()->subMinutes((int) config('attendance.tap_in_early_minutes', 0));
        $tapOutOpens = $end->copy()->subMinutes((int) config('attendance.tap_out_window_minutes', 5));

        if ($scannedAt->lt($tapInOpens) || $scannedAt->gt($end)) {
            return $this->blocked('outside_class_time', 'Outside class time.', $scannedAt);
        }

        $subjId = isset($session['subj_id']) ? (int) $session['subj_id'] : null;

        $query = Attendance::query()
            ->where('stu_id', $student->stu_id)
            ->whereDate('att_date', $attDate);

        if ($subjId !== null) {
            $query->where('subj_id', $subjId);
        } else {
            $query->whereNull('subj_id');
        }

        $existing = $query->first();

        if ($existing !== null) {
            // Pre-marked absent/excused → a tap counts as time in.
            if (in_array($existing->status, ['absent', 'excused'], true)) {
                $existing->forceFill([
                    'time_in' => $scannedAt,
                    'status' => $this->resolveStatus($scannedAt, $start),
                ])->save();

                return [
                    'recorded' => true,
                    'action' => 'time_in',
                    'already_checked_in' => false,
                    'status' => $existing->status,
                    'time_in' => $existing->time_in?->toIso8601String() ?? $scannedAt->toIso8601String(),
                    'time_out' => $existing->time_out?->toIso8601String(),
                ];
            }

            // Already timed out
            if ($existing->time_out !== null) {
                return [
                    'recorded' => false,
                    'action' => 'already_timed_out',
                    'already_checked_in' => false,
                    'already_timed_out' => true,
                    'status' => $existing->status,
                    'time_in' => $existing->time_in?->toIso8601String() ?? $scannedAt->toIso8601String(),
                    'time_out' => $existing->time_out->toIso8601String(),
                    'message' => 'Already timed out for this session.',
                ];
            }

            // Too early to tap out
            if ($scannedAt->lt($tapOutOpens)) {
                return [
                    'recorded' => false,
                    'action' => 'too_early_out',
                    'already_checked_in' => true,
                    'already_timed_out' => false,
                    'status' => $existing->status,
                    'tap_out_opens_at' => $tapOutOpens->format('H:i'),
                    'time_in' => $existing->time_in?->toIso8601String() ?? $scannedAt->toIso8601String(),
                    'time_out' => null,
                    'message' => 'Tap out opens at '.$tapOutOpens->format('h:i A').'.',
                ];
            }

            // Double-tap guard (e.g. student timed in during the last minutes)
            $cooldown = (int) config('attendance.tap_cooldown_seconds', 30);
            if ($existing->time_in && abs($scannedAt->diffInSeconds($existing->time_in)) < $cooldown) {
                return [
                    'recorded' => false,
                    'action' => 'cooldown',
                    'already_checked_in' => true,
                    'already_timed_out' => false,
                    'status' => $existing->status,
                    'time_in' => $existing->time_in->toIso8601String(),
                    'time_out' => null,
                    'message' => 'Please wait before tapping out.',
                ];
            }

            // ── Time out ──
            $existing->forceFill(['time_out' => $scannedAt])->save();

            // Check if the student missed any earlier subjects today
            $this->absenceNotifier->notifyMissedSubjectsForStudent($student, $scannedAt);

            return [
                'recorded' => true,
                'action' => 'time_out',
                'already_checked_in' => false,
                'already_timed_out' => false,
                'status' => $existing->status,
                'time_in' => $existing->time_in?->toIso8601String() ?? $scannedAt->toIso8601String(),
                'time_out' => $existing->time_out->toIso8601String(),
            ];
        }

        // ── First tap: time in ────────────────────────────────────────────────
        $attendance = Attendance::create([
            'stu_id' => $student->stu_id,
            'session_id' => $session['schedule_id'],
            'subj_id' => $subjId,
            'sect_id' => (int) $session['sect_id'],
            'sy_id' => $this->resolveActiveSyId(),
            'att_date' => $attDate,
            'time_in' => $scannedAt,
            'time_out' => null,
            'status' => $this->resolveStatus($scannedAt, $start),
        ]);

        return [
            'recorded' => true,
            'action' => 'time_in',
            'already_checked_in' => false,
            'status' => $attendance->status,
            'time_in' => $attendance->time_in->toIso8601String(),
            'time_out' => null,
        ];
    }

    /**
     * Auto-transfer present/late students from the previous period into a new
     * subject attendance record when a teacher opens a new session.
     *
     * NOTE: Not called anywhere. With tap-in-only-in-class rules, calling this
     * would mark students present without a tap.
     *
     * @return int Number of students auto-transferred
     */
    public function transferFromPreviousSubject(
        int $sectId,
        int $newSubjId,
        int $newSessionId,
        int $newSyId,
    ): int {
        $today = now()->toDateString();

        $transferred = DB::table('attendance as a')
            ->join('student_section as ss', function ($join) use ($sectId, $newSyId) {
                $join->on('ss.stu_id', '=', 'a.stu_id')
                    ->where('ss.sect_id', $sectId)
                    ->where('ss.sy_id', $newSyId);
            })
            ->whereDate('a.att_date', $today)
            ->whereIn('a.status', ['present', 'late'])
            ->whereNotNull('a.subj_id')
            ->where('a.subj_id', '!=', $newSubjId)
            ->whereNotExists(function ($sub) use ($today, $newSubjId) {
                $sub->from('attendance')
                    ->whereColumn('attendance.stu_id', 'a.stu_id')
                    ->whereDate('attendance.att_date', $today)
                    ->where('attendance.subj_id', $newSubjId);
            })
            ->select('a.stu_id')
            ->distinct()
            ->pluck('stu_id');

        if ($transferred->isEmpty()) {
            return 0;
        }

        $rows = $transferred->map(fn ($stuId) => [
            'stu_id' => $stuId,
            'session_id' => $newSessionId,
            'subj_id' => $newSubjId,
            'sect_id' => $sectId,
            'sy_id' => $newSyId,
            'att_date' => $today,
            'time_in' => now(),
            'status' => 'present',
        ])->all();

        DB::table('attendance')->insertOrIgnore($rows);

        return count($rows);
    }

    public function resolveActiveSyIdPublic(): ?int
    {
        return $this->resolveActiveSyId();
    }

    private function blocked(string $action, string $message, CarbonInterface $at): array
    {
        return [
            'recorded' => false,
            'action' => $action,
            'already_checked_in' => false,
            'status' => 'blocked',
            'time_in' => $at->toIso8601String(),
            'time_out' => null,
            'message' => $message,
        ];
    }

    private function isEnrolledInSection(int $stuId, int $sectId): bool
    {
        $syId = $this->resolveActiveSyId();

        return $syId !== null && DB::table('student_section')
            ->where('stu_id', $stuId)
            ->where('sect_id', $sectId)
            ->where('sy_id', $syId)
            ->exists();
    }

    private function resolveActiveSyId(): ?int
    {
        $id = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        return $id !== null ? (int) $id : null;
    }

    /**
     * Late = after (class start + grace minutes). Falls back to the fixed
     * daily cutoff when no class start is known.
     */
    private function resolveStatus(CarbonInterface $scannedAt, ?CarbonInterface $classStart = null): string
    {
        $moment = Carbon::instance($scannedAt);

        if ($classStart !== null) {
            $cutoff = Carbon::instance($classStart)
                ->addMinutes((int) config('attendance.late_grace_minutes', 10));
        } else {
            $cutoff = $moment->copy()->startOfDay()
                ->setTimeFromTimeString((string) config('attendance.late_after', '08:00'));
        }

        return $moment->greaterThan($cutoff) ? 'late' : 'present';
    }
}
