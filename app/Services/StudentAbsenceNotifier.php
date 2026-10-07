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

        $message = $this->formatMessage($studentModel, $dateStr, $subjectName, $sectionName);

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
    ): int {
        $sentCount = 0;

        foreach ($students as $student) {
            if ($this->notify($student, $date, $subjectName, $sectionName, $force)) {
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

        $raw = $link->guardian?->contact_number
            ?? $link->mother?->contact_number
            ?? $link->father?->contact_number;

        if (! filled($raw)) {
            return null;
        }

        $normalized = PhoneNumber::normalize((string) $raw);

        return $normalized !== '' ? $normalized : null;
    }

    /**
     * Compose the SMS message content.
     */
    public function formatMessage(
        Student $student,
        string $date,
        ?string $subjectName = null,
        ?string $sectionName = null,
    ): string {
        $name = trim(collect([
            $student->stu_fname,
            $student->stu_mname,
            $student->stu_lname,
        ])->filter()->join(' '));

        $formattedDate = Carbon::parse($date)->format('M d, Y');

        if (filled($subjectName)) {
            $context = $subjectName.(filled($sectionName) ? " ({$sectionName})" : '');

            return "IoClass Alert: {$name} was marked ABSENT in {$context} on {$formattedDate}. Please contact the school if you have any questions.";
        }

        return "IoClass Alert: {$name} was marked ABSENT today ({$formattedDate}). Please contact the school if you have any questions.";
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

            $enrolled = DB::table('student as s')
                ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
                ->where('ss.sect_id', $schedule->sect_id)
                ->where('ss.sy_id', $activeSyId)
                ->where('s.is_deleted', false)
                ->where('s.status', 'active')
                ->when($studentId, fn ($q) => $q->where('s.stu_id', $studentId))
                ->select('s.stu_id')
                ->get();

            if ($enrolled->isEmpty()) {
                continue;
            }

            $enrolledStuIds = $enrolled->pluck('stu_id')->all();

            $attendedStudentIds = DB::table('attendance')
                ->where('subj_id', $schedule->subj_id)
                ->whereDate('att_date', $dateStr)
                ->whereIn('status', ['present', 'late', 'excused'])
                ->whereIn('stu_id', $enrolledStuIds)
                ->pluck('stu_id')
                ->all();

            $attendedSet = array_flip($attendedStudentIds);

            $absentStudentIds = array_values(array_filter(
                $enrolledStuIds,
                fn ($id) => ! isset($attendedSet[$id]),
            ));

            if (empty($absentStudentIds)) {
                continue;
            }

            $absencesFound += count($absentStudentIds);

            // Ensure an absent attendance record exists in DB for proper logging & reporting
            $existingRecords = DB::table('attendance')
                ->where('subj_id', $schedule->subj_id)
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
                        'session_id' => $schedule->schedule_id,
                        'subj_id' => $schedule->subj_id,
                        'sect_id' => $schedule->sect_id,
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

            // Send notification to guardians
            foreach ($absentStudentIds as $absentId) {
                $sent = $this->notify(
                    student: $absentId,
                    date: $dateStr,
                    subjectName: $schedule->subject?->subj_name,
                    sectionName: $schedule->section?->sect_name,
                    force: $force,
                );

                if ($sent) {
                    $notifiedCount++;
                }
            }
        }

        return [
            'checked_schedules' => $checkedSchedules,
            'absences_found' => $absencesFound,
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
