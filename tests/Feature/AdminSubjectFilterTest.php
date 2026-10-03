<?php

use App\Models\Admin;
use App\Models\Subject;
use App\Models\Teacher;

test('admin can view subject list and filter by grade level', function () {
    $admin = Admin::factory()->create();

    Subject::create([
        'subj_code' => 'MATH-7',
        'subj_name' => 'Grade 7 Mathematics',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    Subject::create([
        'subj_code' => 'ENG-10',
        'subj_name' => 'Grade 10 English',
        'gr_level' => 'Grade 10',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')->get(route('admin.subject.index', ['gradeLevel' => 'Grade 7']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Subject/Index')
        ->has('subjects.data', 1)
        ->where('subjects.data.0.subj_code', 'MATH-7')
        ->where('filters.gradeLevel', 'Grade 7')
    );
});

test('admin subject list shows all subjects when filter is all', function () {
    $admin = Admin::factory()->create();

    Subject::create([
        'subj_code' => 'MATH-7',
        'subj_name' => 'Grade 7 Mathematics',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    Subject::create([
        'subj_code' => 'ENG-10',
        'subj_name' => 'Grade 10 English',
        'gr_level' => 'Grade 10',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')->get(route('admin.subject.index', ['gradeLevel' => 'all']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Subject/Index')
        ->has('subjects.data', 2)
        ->where('filters.gradeLevel', 'all')
    );
});

test('admin can view subject details including teachers assigned via schedule slots', function () {
    $admin = Admin::factory()->create();

    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2026-2027',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Emerald',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $subject = Subject::create([
        'subj_code' => 'SCI-7',
        'subj_name' => 'Integrated Science',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    $teacher = Teacher::create([
        'tch_fname' => 'Elena',
        'tch_lname' => 'Rostova',
        'tch_email' => 'elena.rostova@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $roomId = DB::table('room')->insertGetId([
        'room_no' => 'LAB-1',
        'is_deleted' => false,
    ], 'room_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subject->subj_id,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Tuesday',
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    // Test JSON endpoint used by SubjectViewModal
    $jsonResponse = $this->actingAs($admin, 'admin')
        ->getJson(route('admin.subject.show', $subject->subj_id));

    $jsonResponse->assertOk()
        ->assertJsonPath('subject.subj_id', $subject->subj_id)
        ->assertJsonCount(1, 'teachers')
        ->assertJsonPath('teachers.0.tch_id', $teacher->tch_id)
        ->assertJsonPath('teachers.0.tch_fname', 'Elena');

    // Test Inertia endpoint used by Admin/Subject/Show page
    $inertiaResponse = $this->actingAs($admin, 'admin')
        ->get(route('admin.subject.show', $subject->subj_id));

    $inertiaResponse->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Subject/Show')
            ->has('teachers', 1)
            ->where('teachers.0.tch_id', $teacher->tch_id)
        );
});
