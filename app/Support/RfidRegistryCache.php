<?php

namespace App\Support;

use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Support\Facades\Cache;

class RfidRegistryCache
{
    public const CACHE_KEY = 'admin.rfid.registry';

    /**
     * @return array<string, array{type: string, name: string}>
     */
    public static function get(): array
    {
        return Cache::remember(self::CACHE_KEY, now()->addMinutes(5), function (): array {
            $registry = [];

            Student::query()
                ->where('is_deleted', false)
                ->whereNotNull('rfid_uid')
                ->where('rfid_uid', '!=', '')
                ->get(['rfid_uid', 'stu_fname', 'stu_mname', 'stu_lname'])
                ->each(function (Student $student) use (&$registry): void {
                    $uid = RfidUid::normalize($student->rfid_uid);

                    if ($uid === null) {
                        return;
                    }

                    $registry[$uid] = [
                        'type' => 'student',
                        'name' => self::fullName(
                            $student->stu_fname,
                            $student->stu_mname,
                            $student->stu_lname,
                        ),
                    ];
                });

            Teacher::query()
                ->where('is_deleted', false)
                ->get(['tch_rfid_uid', 'master_card', 'tch_fname', 'tch_mname', 'tch_lname'])
                ->each(function (Teacher $teacher) use (&$registry): void {
                    $name = self::fullName(
                        $teacher->tch_fname,
                        $teacher->tch_mname,
                        $teacher->tch_lname,
                    );

                    foreach (['tch_rfid_uid', 'master_card'] as $column) {
                        $raw = $teacher->{$column};
                        $uid = is_string($raw) ? RfidUid::normalize($raw) : null;

                        if ($uid === null) {
                            continue;
                        }

                        $registry[$uid] = [
                            'type' => 'teacher',
                            'name' => $name,
                        ];
                    }
                });

            return $registry;
        });
    }

    public static function forget(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    private static function fullName(?string $fname, ?string $mname, ?string $lname): string
    {
        return trim(collect([$fname, $mname, $lname])->filter()->join(' '));
    }
}
