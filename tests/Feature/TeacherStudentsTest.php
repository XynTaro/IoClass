<?php

use App\Models\Teacher;
use Illuminate\Support\Facades\DB;

test('guests are redirected from teacher students index', function () {
    $this->get(route('teacher.students.index'))
        ->assertRedirect(route('login'));
});

test('authenticated teacher can view students in their advisory section', function () {
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
        'tch_email' => 'ana.reyes@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '123456789012',
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

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.students.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/My Students/index')
            ->has('students.data', 1)
            ->where('students.data.0.stu_fname', 'Juan')
            ->where('students.data.0.sect', 'Mars')
        );
});

test('teacher students index can filter by search query', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Venus',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Ben',
        'tch_lname' => 'Torres',
        'tch_email' => 'ben.torres@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    $matchingId = DB::table('student')->insertGetId([
        'lrn' => '111111111111',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    $otherId = DB::table('student')->insertGetId([
        'lrn' => '222222222222',
        'stu_fname' => 'Pedro',
        'stu_lname' => 'Lopez',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    foreach ([$matchingId, $otherId] as $studentId) {
        DB::table('student_section')->insert([
            'stu_id' => $studentId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
        ]);
    }

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.students.index', ['q' => 'Maria']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->has('students.data', 1)
            ->where('students.data.0.stu_fname', 'Maria')
        );
});
