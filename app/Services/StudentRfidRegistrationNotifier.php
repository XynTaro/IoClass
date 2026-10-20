<?php

namespace App\Services;

use App\Contracts\SmsSender;
use App\Models\ParentGuardian;
use App\Models\Student;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Log;
use Throwable;

class StudentRfidRegistrationNotifier
{
    public function __construct(private SmsSender $sms) {}

    /**
     * Notify the student's parent or guardian that their RFID was registered.
     */
    public function notify(Student $student): bool
    {
        if (! filled($student->rfid_uid)) {
            return false;
        }

        $phone = $this->guardianPhone($student);

        if ($phone === null) {
            return false;
        }

        try {
            $this->sms->send($phone, $this->message($student));

            return true;
        } catch (Throwable $exception) {
            Log::warning('Failed to send RFID registration SMS', [
                'stu_id' => $student->stu_id,
                'to' => $phone,
                'error' => $exception->getMessage(),
            ]);

            return false;
        }
    }

    /**
     * Resolve the parent or guardian phone number for a student.
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
     * Alias for guardianPhone.
     */
    public function parentPhone(Student $student): ?string
    {
        return $this->guardianPhone($student);
    }

    public function message(Student $student): string
    {
        $name = trim(collect([
            $student->stu_fname,
            $student->stu_mname,
            $student->stu_lname,
        ])->filter()->join(' '));

        $message = "IoClass Alert: {$name} has been registered in the system with RFID card {$student->rfid_uid}.";

        if (filled($student->lrn)) {
            return "{$message} LRN: {$student->lrn}.";
        }

        return "{$message} Student ID: {$student->stu_id}.";
    }
}
