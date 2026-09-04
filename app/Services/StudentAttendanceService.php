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
    /**
     * Record attendance for a student, scoped per-subject when a session with a
     * subject is active, or as a whole-day record when no subject is known.
     *
     * @param  array{
     *     tch_id: int,
     *     tch_name: string,
     *     sect_id: int|null,
     *     sect_name: string|null,
     *     subj_id: int|null,
     *     subj_name: string|null,
     *     schedule_id: int|null,
     *     started_at: int,
     * }|null $session
     * @return array{
     *     recorded: bool,
     *     already_checked_in: bool,
     *     status: string,
     *     time_in: string,
     * }
     */
    public function recordForStudent(Student $student, ?CarbonInterface $scannedAt = null, ?array $session = null): array
    {
        $scannedAt = Carbon::instance($scannedAt ?? now());
        $attDate = $scannedAt->toDateString();

        // Block attendance on non-school days (holidays, breaks, suspensions)
        $nonSchoolDay = CalendarEvent::nonSchoolDayInfo($attDate);
        if ($nonSchoolDay !== null) {
            return [
                'recorded' => false,
                'already_checked_in' => false,
                'non_school_day' => true,
                'event_title' => $nonSchoolDay['title'],
                'event_type' => $nonSchoolDay['type'],
                'status' => 'no_class',
                'time_in' => $scannedAt->toIso8601String(),
            ];
        }

        $subjId = ($session !== null && isset($session['subj_id'])) ? (int) $session['subj_id'] : null;

        $query = Attendance::query()
            ->where('stu_id', $student->stu_id)
            ->whereDate('att_date', $attDate);

        // When a subject is active scope to that subject; otherwise whole-day record.
        if ($subjId !== null) {
            $query->where('subj_id', $subjId);
        } else {
            $query->whereNull('subj_id');
        }

        $existing = $query->first();

        if ($existing !== null) {
            if (in_array($existing->status, ['absent', 'excused'], true)) {
                $existing->forceFill([
                    'time_in' => $scannedAt,
                    'status' => $this->resolveStatus($scannedAt),
                ])->save();

                return [
                    'recorded' => false,
                    'already_checked_in' => false,
                    'status' => $existing->status,
                    'time_in' => $existing->time_in?->toIso8601String() ?? $scannedAt->toIso8601String(),
                ];
            }

            return [
                'recorded' => false,
                'already_checked_in' => true,
                'status' => $existing->status,
                'time_in' => $existing->time_in?->toIso8601String() ?? $scannedAt->toIso8601String(),
            ];
        }

        // Resolve section and school year — prefer session data when available
        if ($session !== null && $session['sect_id'] !== null) {
            $sectId = $session['sect_id'];
            $syId = $this->resolveActiveSyId();
            $sessionId = $session['schedule_id'];
        } else {
            [$sectId, $syId] = $this->resolveEnrollment($student->stu_id);
            $sessionId = null;
        }

        $attendance = Attendance::create([
            'stu_id' => $student->stu_id,
            'session_id' => $sessionId,
            'subj_id' => $subjId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => $attDate,
            'time_in' => $scannedAt,
            'status' => $this->resolveStatus($scannedAt),
        ]);

        return [
            'recorded' => true,
            'already_checked_in' => false,
            'status' => $attendance->status,
            'time_in' => $attendance->time_in->toIso8601String(),
        ];
    }

    /**
     * Auto-transfer present/late students from the previous period into a new
     * subject attendance record when a teacher opens a new session.
     *
     * Only students enrolled in $sectId who were present or late for $prevSubjId
     * today and do NOT yet have a record for $newSubjId are inserted.
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

        // Find students in this section who were present/late for any subject today
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

    /**
     * @return array{0: ?int, 1: ?int}
     */
    private function resolveEnrollment(int $studentId): array
    {
        $activeSyId = $this->resolveActiveSyId();

        if (! $activeSyId) {
            return [null, null];
        }

        $enrollment = DB::table('student_section')
            ->where('stu_id', $studentId)
            ->where('sy_id', $activeSyId)
            ->orderBy('stu_sect_id')
            ->first(['sect_id', 'sy_id']);

        if ($enrollment === null) {
            return [null, (int) $activeSyId];
        }

        return [(int) $enrollment->sect_id, (int) $enrollment->sy_id];
    }

    public function resolveActiveSyIdPublic(): ?int
    {
        return $this->resolveActiveSyId();
    }

    private function resolveActiveSyId(): ?int
    {
        $id = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        return $id !== null ? (int) $id : null;
    }

    private function resolveStatus(CarbonInterface $scannedAt): string
    {
        $lateAfter = (string) config('attendance.late_after', '08:00');
        $moment = Carbon::instance($scannedAt);
        $cutoff = $moment->copy()->startOfDay()->setTimeFromTimeString($lateAfter);

        return $moment->greaterThan($cutoff) ? 'late' : 'present';
    }
}
