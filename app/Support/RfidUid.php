<?php

namespace App\Support;

use App\Models\Student;
use App\Models\Teacher;

class RfidUid
{
    public static function normalize(?string $value): ?string
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        return strtoupper(preg_replace('/[\s:-]+/', '', trim($value)) ?? '');
    }

    public static function isTaken(
        string $uid,
        ?int $ignoreStudentId = null,
        ?int $ignoreTeacherId = null,
    ): bool {
        $normalized = self::normalize($uid);

        if ($normalized === null) {
            return false;
        }

        $studentExists = Student::query()
            ->where('rfid_uid', $normalized)
            ->when(
                $ignoreStudentId !== null,
                fn ($query) => $query->where('stu_id', '!=', $ignoreStudentId),
            )
            ->exists();

        if ($studentExists) {
            return true;
        }

        return Teacher::query()
            ->where('is_deleted', false)
            ->where(function ($query) use ($normalized): void {
                $query
                    ->where('tch_rfid_uid', $normalized)
                    ->orWhere('master_card', $normalized);
            })
            ->when(
                $ignoreTeacherId !== null,
                fn ($query) => $query->where('tch_id', '!=', $ignoreTeacherId),
            )
            ->exists();
    }
}
