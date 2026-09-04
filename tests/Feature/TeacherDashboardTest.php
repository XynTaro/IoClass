<?php

use App\Models\Teacher;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

/**
 * @return array{syId: int, sectId: int, teacher: Teacher, stuId: int}
 */
function seedTeacherDashboardFixtures(): array
{
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Mars',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_code' => 'SCI7',
        'subj_name' => 'Science 7',
        'is_deleted' => false,
    ], 'subj_id');

    $otherSubjId = DB::table('subject')->insertGetId([
        'subj_code' => 'ENG7',
        'subj_name' => 'English 7',
        'is_deleted' => false,
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Dana',
        'tch_lname' => 'Cruz',
        'tch_email' => 'dana.cruz.dash@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $roomId = DB::table('room')->insertGetId([
        'room_no' => 'D-201',
        'is_deleted' => false,
    ], 'room_id');

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    foreach ([$subjId, $otherSubjId] as $subjectId) {
        DB::table('class_schedule')->insert([
            'tch_id' => $teacher->tch_id,
            'subj_id' => $subjectId,
            'sect_id' => $sectId,
            'room_id' => $roomId,
            'sy_id' => $syId,
            'day_of_week' => 'Monday',
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);
    }

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '333333333333',
        'stu_fname' => 'Liam',
        'stu_lname' => 'Garcia',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    return compact('syId', 'sectId', 'teacher', 'stuId');
}

test('guests cannot access the teacher dashboard', function () {
    $this->getJson(route('teacher.dashboard'))
        ->assertUnauthorized();
});

test('authenticated teacher dashboard loads stats and analytics from the database', function () {
    Carbon::setTestNow('2026-06-15 10:00:00');

    ['syId' => $syId, 'sectId' => $sectId, 'teacher' => $teacher, 'stuId' => $stuId] = seedTeacherDashboardFixtures();

    DB::table('attendance')->insert([
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-06-15',
            'status' => 'present',
            'time_in' => '2026-06-15 07:45:00',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-06-14',
            'status' => 'late',
            'time_in' => '2026-06-14 08:20:00',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-06-13',
            'status' => 'absent',
            'time_in' => null,
        ],
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.dashboard', ['range' => 'daily']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Teacher/Dashboard')
            ->where('stats.studentsCount', 1)
            ->where('stats.subjectsCount', 2)
            ->where('analytics.range', 'daily')
            ->where('analytics.statusTotals.present', 1)
            ->where('analytics.statusTotals.late', 1)
            ->where('analytics.statusTotals.absent', 1)
            ->has('analytics.statusTrend', 7)
            ->where('analytics.statusTrend.6.date', '2026-06-15')
            ->where('analytics.statusTrend.6.present', 1)
            ->where('analytics.statusTrend.5.late', 1)
            ->where('analytics.statusTrend.4.absent', 1)
            ->where('analytics.atRiskStudents.0.stu_id', $stuId)
            ->where('analytics.atRiskStudents.0.name', 'Liam Garcia')
            ->where('analytics.atRiskStudents.0.section', 'Grade 7 - Mars')
            ->where('analytics.atRiskStudents.0.absent_count', 1)
            ->where('analytics.atRiskStudents.0.attendance_rate', 67)
            ->where('analytics.sectionAttendance.0.sect_id', $sectId)
            ->where('analytics.sectionAttendance.0.name', 'Grade 7 - Mars')
            ->where('analytics.sectionAttendance.0.attendance_rate', 67)
            ->where('analytics.sectionAttendance.0.total_records', 3)
        );

    Carbon::setTestNow();
});

test('teacher dashboard defaults analytics range to weekly', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Eli',
        'tch_lname' => 'Ng',
        'tch_email' => 'eli.ng.dash@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Teacher/Dashboard')
            ->where('stats.studentsCount', 0)
            ->where('stats.subjectsCount', 0)
            ->where('analytics.range', 'weekly')
            ->where('analytics.statusTotals.present', 0)
            ->has('analytics.statusTrend', 7)
            ->where('analytics.atRiskStudents', [])
            ->where('analytics.sectionAttendance', [])
        );
});
