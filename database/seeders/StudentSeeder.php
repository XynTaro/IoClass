<?php

namespace Database\Seeders;

use App\Models\Student;
use App\Support\RfidRegistryCache;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StudentSeeder extends Seeder
{
    /**
     * Seed sample students for local / staging RFID and attendance testing.
     */
    public function run(): void
    {
        $students = [
            [
                'lrn' => '202600000001',
                'rfid_uid' => 'NORJAE001',
                'stu_fname' => 'Norjae',
                'stu_mname' => null,
                'stu_lname' => 'Azcueta',
                'gender' => 'male',
            ],
            [
                'lrn' => '202600000002',
                'rfid_uid' => 'GABRIEL001',
                'stu_fname' => 'Gabriel',
                'stu_mname' => null,
                'stu_lname' => 'De Jesus',
                'gender' => 'male',
            ],
            [
                'lrn' => '202600000003',
                'rfid_uid' => 'DHEN001',
                'stu_fname' => 'Dhen',
                'stu_mname' => null,
                'stu_lname' => 'Alves',
                'gender' => 'male',
            ],
            [
                'lrn' => '202600000004',
                'rfid_uid' => 'JEFF001',
                'stu_fname' => 'Jefferson',
                'stu_mname' => null,
                'stu_lname' => 'Leopando',
                'gender' => 'male',
            ],
            [
                'lrn' => '202600000005',
                'rfid_uid' => 'MARIA001',
                'stu_fname' => 'Maria Clara',
                'stu_mname' => 'Santos',
                'stu_lname' => 'Dela Cruz',
                'gender' => 'female',
            ],
            [
                'lrn' => '202600000006',
                'rfid_uid' => 'ANGELA001',
                'stu_fname' => 'Angela',
                'stu_mname' => 'Reyes',
                'stu_lname' => 'Garcia',
                'gender' => 'female',
            ],
        ];

        // Resolve the currently active school year so we can enroll students.
        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        // Pick the first available (non-deleted) section as the default.
        $sectId = DB::table('section')
            ->where('is_deleted', false)
            ->orderBy('sect_id')
            ->value('sect_id');

        foreach ($students as $row) {
            // Upsert student by LRN — safe to re-run without duplicates.
            $student = Student::query()->updateOrCreate(
                ['lrn' => $row['lrn']],
                [
                    'rfid_uid' => $row['rfid_uid'],
                    'stu_fname' => $row['stu_fname'],
                    'stu_mname' => $row['stu_mname'],
                    'stu_lname' => $row['stu_lname'],
                    'gender' => $row['gender'],
                    'status' => 'active',
                    'is_deleted' => false,
                ],
            );

            // Enroll student into the default section for the active school year.
            if ($activeSyId && $sectId) {
                DB::table('student_section')->updateOrInsert(
                    [
                        'stu_id' => $student->stu_id,
                        'sect_id' => $sectId,
                        'sy_id' => $activeSyId,
                    ],
                    [],
                );
            }
        }

        // Bust the RFID registry cache so newly seeded UIDs are visible immediately.
        RfidRegistryCache::forget();
    }
}
