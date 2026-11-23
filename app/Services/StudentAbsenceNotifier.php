<?php

namespace App\Services;

use App\Contracts\SmsSender;
use App\Models\CalendarEvent;
use App\Models\Class_Schedule;
use App\Models\ParentGuardian;
use App\Models\Student;
use App\Support\PhoneNumber;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Throwable;

class StudentAbsenceNotifier
{
    public function __construct(private SmsSender $sms) {}

    /**
     * Notify a student's guardian about an absence.
     */
    public function notify(
        Student|int $student,
        ?string $date = null,
        ?string $subjectName = null,
        ?string $sectionName = null,
        bool $force = false,
        ?string $timeRange = null,
    ): bool {
        $studentModel = $student instanceof Student
            ? $student
            : Student::find($student);

        if ($studentModel === null) {
            return false;
        }

        $dateStr = $date ? Carbon::parse($date)->toDateString() : now()->toDateString();

        // Skip notifications on non-school days
        if (CalendarEvent::isNonSchoolDay($dateStr)) {
            return false;
        }

        $cacheKey = "absence_notified:{$studentModel->stu_id}:{$dateStr}:".($subjectName ?? 'daily');

        if (! $force && Cache::has($cacheKey)) {
            return false;
        }

        $phone = $this->guardianPhone($studentModel);

        if ($phone === null) {
            return false;
        }

        $message = $this->formatMessage($studentModel, $dateStr, $subjectName, $sectionName, $timeRange);

        try {
            $this->sms->send($phone, $message);

            Cache::put($cacheKey, true, now()->addDay());

            Log::info('Absence SMS sent to guardian', [
                'stu_id' => $studentModel->stu_id,
                'to' => $phone,
                'date' => $dateStr,
                'subject' => $subjectName,
            ]);

            return true;
        } catch (Throwable $exception) {
            Log::warning('Failed to send absence notification SMS', [
                'stu_id' => $studentModel->stu_id,
                'to' => $phone,
                'date' => $dateStr,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Notify guardians for multiple absent students.
     *
     * @param  array<int, int|Student>  $students
     */
    public function notifyMultiple(
        array $students,
        ?string $date = null,
        ?string $subjectName = null,
        ?string $sectionName = null,
        bool $force = false,
        ?string $timeRange = null,
    ): int {
        $sentCount = 0;

        foreach ($students as $student) {
            if ($this->notify($student, $date, $subjectName, $sectionName, $force, $timeRange)) {
                $sentCount++;
            }
        }

        return $sentCount;
    }

    /**
     * Resolve the guardian phone number for a student.
     * Checks guardian contact number first, then falls back to mother or father.
     */
    public function guardianPhone(Student $student): ?string
    {
        $link = ParentGuardian::query()
            ->with([
                'guardian:guardian_id,contact_number',
                'mother:mother_id,contact_number',
                'father:f_id,contact_number',
            ])
            ->where('stu_par_id', $student->stu_id)
            ->first();

        if ($link === null) {
            return null;
        }

        $raw = $link->resolvePrimaryPhone();

        if (! filled($raw)) {
            return null;
        }

        $normalized = PhoneNumber::normalize((string) $raw);

        return $normalized !== '' ? $normalized : null;
    }

    /**
     * Format a class schedule start/end time pair (e.g. "7:00 AM-8:00 AM").
     */
    public function formatTimeRange(?string $startTime, ?string $endTime): ?string
    {
        if (! filled($startTime) && ! filled($endTime)) {
            return null;
        }

        $start = filled($startTime) ? Carbon::parse($startTime)->format('g:i A') : null;
        $end = filled($endTime) ? Carbon::parse($endTime)->format('g:i A') : null;

        if ($start !== null && $end !== null) {
            return "{$start}-{$end}";
        }

        return $start ?? $end;
    }

    /**
     * Compose the SMS message content with date and class time (or timestamp).
     */
    public function formatMessage(
        Student $student,
        string $date,
        ?string $subjectName = null,
        ?string $sectionName = null,
        ?string $timeRange = null,
    ): string {
        $name = trim(collect([
            $student->stu_fname,
            $student->stu_mname,
            $student->stu_lname,
        ])->filter()->join(' '));

        $formattedDate = Carbon::parse($date)->format('M d, Y');

        if (filled($subjectName)) {
            $context = $subjectName.(filled($sectionName) ? " ({$sectionName})" : '');

            if (filled($timeRange)) {
                return "IoClass Alert: {$name} was marked ABSENT in {$context} on {$formattedDate} ({$timeRange}). Please contact the school for inquiries.";
            }

            $timeNow = now()->format('g:i A');

            return "IoClass Alert: {$name} was marked ABSENT in {$context} on {$formattedDate} at {$timeNow}. Please contact the school for inquiries.";
        }

        $timeLabel = filled($timeRange) ? $timeRange : now()->format('g:i A');

        return "IoClass Alert: {$name} was marked ABSENT on {$formattedDate} at {$timeLabel}. Please contact the school for inquiries.";
    }

    /**
     * Scan class schedules for concluded subjects on $date and notify guardians
     * of students who were absent for each specific subject.
     *
     * @return array{
     *     checked_schedules: int,
     *     absences_found: int,
     *     notified_count: int,
     * }
     */
    public function notifyConcludedSubjectAbsences(
        ?string $date = null,
        ?string $beforeTime = null,
        ?int $sectionId = null,
        ?int $studentId = null,
        bool $force = false,
    ): array {
        $dateStr = $date ? Carbon::parse($date)->toDateString() : now()->toDateString();

        if (CalendarEvent::isNonSchoolDay($dateStr)) {
            return [
                'checked_schedules' => 0,
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        if (! $activeSyId) {
            return [
                'checked_schedules' => 0,
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        $dayName = Carbon::parse($dateStr)->format('l');

        $cutoffTime = $beforeTime;
        if (! filled($cutoffTime)) {
            $cutoffTime = $dateStr === now()->toDateString()
                ? now()->format('H:i:s')
                : '23:59:59';
        } elseif (strlen($cutoffTime) === 5) {
            $cutoffTime .= ':00';
        }

        $schedules = Class_Schedule::query()
            ->where('sy_id', $activeSyId)
            ->where('day_of_week', $dayName)
            ->where('end_time', '<=', $cutoffTime)
            ->when($sectionId, fn ($q) => $q->where('sect_id', $sectionId))
            ->with(['subject:subj_id,subj_name', 'section:sect_id,sect_name'])
            ->get();

        $checkedSchedules = 0;
        $absencesFound = 0;
        $notifiedCount = 0;

        foreach ($schedules as $schedule) {
            if ($schedule->sect_id === null || $schedule->subj_id === null) {
                continue;
            }

            $checkedSchedules++;

            $finalized = $this->finalizeScheduleSession(
                subjId: (int) $schedule->subj_id,
                sectId: (int) $schedule->sect_id,
                scheduleId: (int) $schedule->schedule_id,
                date: $dateStr,
                subjectName: $schedule->subject?->subj_name,
                sectionName: $schedule->section?->sect_name,
                studentId: $studentId,
                force: $force,
                startTime: $schedule->getRawOriginal('start_time') ?? (string) $schedule->start_time,
                endTime: $schedule->getRawOriginal('end_time') ?? (string) $schedule->end_time,
            );

            $absencesFound += $finalized['absences_found'];
            $notifiedCount += $finalized['notified_count'];
        }

        return [
            'checked_schedules' => $checkedSchedules,
            'absences_found' => $absencesFound,
            'notified_count' => $notifiedCount,
        ];
    }

    /**
     * Finalize attendance for a single class schedule/session that has ended:
     * - Marks students who never tapped in as 'absent'
     * - Marks students who tapped in (present/late) but did NOT tap out (time_out is null) as 'absent'
     * - Sends SMS notifications to guardians of all absent students for that subject.
     *
     * @return array{
     *     absences_found: int,
     *     notified_count: int,
     * }
     */
    public function finalizeScheduleSession(
        int $subjId,
        int $sectId,
        ?int $scheduleId = null,
        ?string $date = null,
        ?string $subjectName = null,
        ?string $sectionName = null,
        ?int $studentId = null,
        bool $force = false,
        ?string $startTime = null,
        ?string $endTime = null,
    ): array {
        $dateStr = $date ? Carbon::parse($date)->toDateString() : now()->toDateString();

        if (CalendarEvent::isNonSchoolDay($dateStr)) {
            return [
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        if (! $activeSyId) {
            return [
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        $enrolled = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->where('ss.sect_id', $sectId)
            ->where('ss.sy_id', $activeSyId)
            ->where('s.is_deleted', false)
            ->where('s.status', 'active')
            ->when($studentId, fn ($q) => $q->where('s.stu_id', $studentId))
            ->select('s.stu_id')
            ->get();

        if ($enrolled->isEmpty()) {
            return [
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        $enrolledStuIds = $enrolled->pluck('stu_id')->all();

        // A student has completed attendance only if marked excused,
        // or if marked present/late AND they have tapped out (time_out is not null).
        $attendedStudentIds = DB::table('attendance')
            ->where('subj_id', $subjId)
            ->whereDate('att_date', $dateStr)
            ->whereIn('stu_id', $enrolledStuIds)
            ->where(function ($query): void {
                $query->where('status', 'excused')
                    ->orWhere(function ($q): void {
                        $q->whereIn('status', ['present', 'late'])
                            ->whereNotNull('time_out');
                    });
            })
            ->pluck('stu_id')
            ->all();

        $attendedSet = array_flip($attendedStudentIds);

        $absentStudentIds = array_values(array_filter(
            $enrolledStuIds,
            fn ($id) => ! isset($attendedSet[$id]),
        ));

        if (empty($absentStudentIds)) {
            return [
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        // Students who tapped in (present/late) but did NOT tap out become absent
        DB::table('attendance')
            ->where('subj_id', $subjId)
            ->whereDate('att_date', $dateStr)
            ->whereIn('stu_id', $absentStudentIds)
            ->whereIn('status', ['present', 'late'])
            ->whereNull('time_out')
            ->update(['status' => 'absent']);

        // Ensure an absent attendance record exists in DB for students who never tapped in at all
        $existingRecords = DB::table('attendance')
            ->where('subj_id', $subjId)
            ->whereDate('att_date', $dateStr)
            ->whereIn('stu_id', $absentStudentIds)
            ->pluck('stu_id')
            ->all();
        $existingSet = array_flip($existingRecords);

        $missingRows = [];
        foreach ($absentStudentIds as $absentId) {
            if (! isset($existingSet[$absentId])) {
                $missingRows[] = [
                    'stu_id' => $absentId,
                    'session_id' => null,
                    'subj_id' => $subjId,
                    'sect_id' => $sectId,
                    'sy_id' => $activeSyId,
                    'att_date' => $dateStr,
                    'status' => 'absent',
                    'time_in' => null,
                    'time_out' => null,
                ];
            }
        }

        if (! empty($missingRows)) {
            DB::table('attendance')->insertOrIgnore($missingRows);
        }

        $resolvedSubjectName = $subjectName ?? DB::table('subject')->where('subj_id', $subjId)->value('subj_name');
        $resolvedSectionName = $sectionName ?? DB::table('section')->where('sect_id', $sectId)->value('sect_name');

        if (! filled($startTime) || ! filled($endTime)) {
            $scheduleRow = $scheduleId !== null
                ? DB::table('class_schedule')->where('schedule_id', $scheduleId)->first(['start_time', 'end_time'])
                : DB::table('class_schedule')
                    ->where('subj_id', $subjId)
                    ->where('sect_id', $sectId)
                    ->where('day_of_week', Carbon::parse($dateStr)->format('l'))
                    ->where(function ($query) use ($activeSyId): void {
                        $query->where('sy_id', $activeSyId)->orWhereNull('sy_id');
                    })
                    ->first(['start_time', 'end_time']);

            $startTime ??= $scheduleRow?->start_time;
            $endTime ??= $scheduleRow?->end_time;
        }

        $timeRange = $this->formatTimeRange($startTime, $endTime);

        $notifiedCount = 0;
        foreach ($absentStudentIds as $absentId) {
            $sent = $this->notify(
                student: $absentId,
                date: $dateStr,
                subjectName: $resolvedSubjectName,
                sectionName: $resolvedSectionName,
                force: $force,
                timeRange: $timeRange,
            );

            if ($sent) {
                $notifiedCount++;
            }
        }

        return [
            'absences_found' => count($absentStudentIds),
            'notified_count' => $notifiedCount,
        ];
    }

    /**
     * When a student taps out (or at dismissal), check if they were absent for any earlier
     * scheduled subject today and notify their guardian for those specific subjects.
     */
    public function notifyMissedSubjectsForStudent(Student|int $student, ?CarbonInterface $atTime = null): int
    {
        $studentId = $student instanceof Student ? $student->stu_id : $student;
        $at = $atTime ? Carbon::instance($atTime) : now();

        $result = $this->notifyConcludedSubjectAbsences(
            date: $at->toDateString(),
            beforeTime: $at->format('H:i:s'),
            studentId: $studentId,
        );

        return $result['notified_count'];
    }
}
