<?php

use App\Models\Admin;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::factory()->create();

    $this->syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2026-2027',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $this->sec7 = DB::table('section')->insertGetId([
        'sect_name' => 'Sapphire',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $this->sec10 = DB::table('section')->insertGetId([
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 10',
        'is_deleted' => false,
    ], 'sect_id');

    // Student 1: Grade 7 Sapphire
    $this->student1 = Student::create([
        'lrn' => '100000000001',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Dela Cruz',
        'rfid_uid' => 'RFID-0001',
        'status' => 'active',
        'is_deleted' => false,
    ]);
    DB::table('student_section')->insert([
        'stu_id' => $this->student1->stu_id,
        'sect_id' => $this->sec7,
        'sy_id' => $this->syId,
    ]);

    // Student 2: Grade 10 Diamond
    $this->student2 = Student::create([
        'lrn' => '100000000002',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'rfid_uid' => 'RFID-0002',
        'status' => 'active',
        'is_deleted' => false,
    ]);
    DB::table('student_section')->insert([
        'stu_id' => $this->student2->stu_id,
        'sect_id' => $this->sec10,
        'sy_id' => $this->syId,
    ]);
});

test('admin can view student list with filter props', function () {
    $response = $this->actingAs($this->admin, 'admin')->get(route('admin.student.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Student/index')
        ->has('students.data', 2)
        ->has('gradeLevels')
        ->where('filters.gradeLevel', 'all')
        ->where('filters.section', 'all')
    );
});

test('admin can filter students by grade level', function () {
    $response = $this->actingAs($this->admin, 'admin')
        ->get(route('admin.student.index', ['gradeLevel' => 'Grade 7']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Student/index')
        ->has('students.data', 1)
        ->where('students.data.0.stu_id', $this->student1->stu_id)
        ->where('filters.gradeLevel', 'Grade 7')
    );
});

test('admin can filter students by section id', function () {
    $response = $this->actingAs($this->admin, 'admin')
        ->get(route('admin.student.index', ['section' => $this->sec10]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Student/index')
        ->has('students.data', 1)
        ->where('students.data.0.stu_id', $this->student2->stu_id)
        ->where('filters.section', (string) $this->sec10)
    );
});

test('admin can search students by query q', function () {
    $response = $this->actingAs($this->admin, 'admin')
        ->get(route('admin.student.index', ['q' => 'Maria']));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Student/index')
        ->has('students.data', 1)
        ->where('students.data.0.stu_id', $this->student2->stu_id)
        ->where('filters.q', 'Maria')
    );
});

test('admin can combine grade level and section filters', function () {
    $response = $this->actingAs($this->admin, 'admin')
        ->get(route('admin.student.index', [
            'gradeLevel' => 'Grade 7',
            'section' => $this->sec7,
        ]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Student/index')
        ->has('students.data', 1)
        ->where('students.data.0.stu_id', $this->student1->stu_id)
    );
});
