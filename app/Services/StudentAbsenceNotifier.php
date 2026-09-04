<?php

namespace App\Services;

use App\Contracts\SmsSender;
use App\Models\CalendarEvent;
use App\Models\ParentGuardian;
use App\Models\Student;
use App\Support\PhoneNumber;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
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
}
