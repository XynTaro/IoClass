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
     * Notify the student's guardian that their RFID was registered.
     */
    public function notify(Student $student): void
    {
        if (! filled($student->rfid_uid)) {
            return;
        }

        $phone = $this->guardianPhone($student);

        if ($phone === null) {
            return;
        }

        try {
            $this->sms->send($phone, $this->message($student));
        } catch (Throwable $exception) {
            Log::warning('Failed to send RFID registration SMS', [
                'stu_id' => $student->stu_id,
                'to' => $phone,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function guardianPhone(Student $student): ?string
    {
        $link = ParentGuardian::query()
            ->with(['guardian:guardian_id,contact_number'])
            ->where('stu_par_id', $student->stu_id)
            ->first();

        $raw = $link?->guardian?->contact_number;

        if (! filled($raw)) {
            return null;
        }

        $normalized = PhoneNumber::normalize((string) $raw);

        return $normalized !== '' ? $normalized : null;
    }

    private function message(Student $student): string
    {
        $name = trim(collect([
            $student->stu_fname,
            $student->stu_mname,
            $student->stu_lname,
        ])->filter()->join(' '));

        $message = "IoClass: {$name} has been registered in the system with RFID card {$student->rfid_uid}.";

        if (filled($student->lrn)) {
            return "{$message} LRN: {$student->lrn}.";
        }

        return "{$message} Student ID: {$student->stu_id}.";
    }
}
