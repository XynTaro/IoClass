<?php

use App\Models\Admin;
use App\Models\Subject;

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
