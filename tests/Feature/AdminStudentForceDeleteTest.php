<?php

use App\Models\Admin;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

test('admin can permanently delete a student with section enrollment', function () {
    $admin = Admin::factory()->create();

    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Mercury',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $student = Student::create([
        'rfid_uid' => 'DELETE001',
        'stu_fname' => 'To',
        'stu_lname' => 'Delete',
        'status' => 'active',
        'is_deleted' => true,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($admin, 'admin')
        ->delete(route('admin.student.forceDelete', $student->stu_id))
        ->assertRedirect();

    expect(DB::table('student')->where('stu_id', $student->stu_id)->exists())->toBeFalse();
    expect(DB::table('student_section')->where('stu_id', $student->stu_id)->exists())->toBeFalse();
});
