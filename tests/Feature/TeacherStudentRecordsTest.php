<?php

use App\Models\Teacher;
use Illuminate\Support\Facades\DB;

test('guests cannot access teacher student records index', function () {
    $this->getJson(route('teacher.student-records.index'))
        ->assertUnauthorized();
});

test('authenticated teacher can view student records index with attendance counts', function () {
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

    $teacher = Teacher::create([
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ana.reyes.records@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '123456789013',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    DB::table('attendance')->insert([
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-06-10',
            'status' => 'present',
            'time_in' => '2026-06-10 07:45:00',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-06-11',
            'status' => 'late',
            'time_in' => '2026-06-11 08:20:00',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-06-12',
            'status' => 'absent',
            'time_in' => null,
        ],
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.student-records.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/Student Records/index')
            ->has('students.data', 1)
            ->where('students.data.0.stu_fname', 'Juan')
            ->where('students.data.0.attendance_count', 2)
        );
});

test('teacher can view a student record detail page with attendance logs', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Jupiter',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ], 'sect_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_code' => 'SCI8',
        'subj_name' => 'Science 8',
        'is_deleted' => false,
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Ben',
        'tch_lname' => 'Torres',
        'tch_email' => 'ben.torres.records@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '123456789014',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    DB::table('attendance')->insert([
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'subj_id' => $subjId,
            'att_date' => '2026-06-11',
            'status' => 'present',
            'time_in' => '2026-06-11 07:50:00',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'subj_id' => null,
            'att_date' => '2026-06-12',
            'status' => 'late',
            'time_in' => '2026-06-12 08:15:00',
        ],
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.student-records.show', $stuId))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/Student Records/individual')
            ->where('student.stu_fname', 'Maria')
            ->has('logs', 2)
            ->where('logs.0.status', 'late')
            ->where('logs.1.subj_name', 'Science 8')
            ->where('logs.1.status', 'present')
        );
});

test('teacher cannot view student record for student outside their sections', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $teacherSectionId = DB::table('section')->insertGetId([
        'sect_name' => 'Earth',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $otherSectionId = DB::table('section')->insertGetId([
        'sect_name' => 'Moon',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Cara',
        'tch_lname' => 'Diaz',
        'tch_email' => 'cara.diaz.records@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $teacherSectionId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    $otherStudentId = DB::table('student')->insertGetId([
        'lrn' => '123456789015',
        'stu_fname' => 'Other',
        'stu_lname' => 'Student',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $otherStudentId,
        'sect_id' => $otherSectionId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.student-records.show', $otherStudentId))
        ->assertNotFound();
});
