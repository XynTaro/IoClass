<?php

namespace App\Services;

use App\Models\CalendarEvent;
use App\Models\Teacher;
use App\Models\TeacherAttendance;
use Carbon\Carbon;
use Carbon\CarbonInterface;

class TeacherAttendanceService
{
    /**
     * Record daily attendance for a teacher.
     *
     * @return array{
     *     recorded: bool,
     *     already_checked_in: bool,
     *     status: string,
     *     time_in: string,
     *     non_school_day?: bool,
     *     event_title?: string,
     *     event_type?: string,
     * }
     */
    public function recordForTeacher(Teacher $teacher, ?CarbonInterface $scannedAt = null): array
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

        $existing = TeacherAttendance::query()
            ->where('tch_id', $teacher->tch_id)
            ->whereDate('att_date', $attDate)
            ->first();

        if ($existing !== null) {
            if (in_array($existing->status, ['absent', 'excused'], true)) {
                $status = $this->resolveStatus($scannedAt);
                $existing->update([
                    'time_in' => $scannedAt,
                    'status' => $status,
                ]);

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

        $status = $this->resolveStatus($scannedAt);

        $attendance = TeacherAttendance::create([
            'tch_id' => $teacher->tch_id,
            'att_date' => $attDate,
            'time_in' => $scannedAt,
            'status' => $status,
        ]);

        return [
            'recorded' => true,
            'already_checked_in' => false,
            'status' => $attendance->status,
            'time_in' => $attendance->time_in->toIso8601String(),
        ];
    }

    private function resolveStatus(CarbonInterface $scannedAt): string
    {
        $lateAfter = (string) config('attendance.late_after', '08:00');
        $moment = Carbon::instance($scannedAt);
        $cutoff = $moment->copy()->startOfDay()->setTimeFromTimeString($lateAfter);

        return $moment->greaterThan($cutoff) ? 'late' : 'present';
    }
}
