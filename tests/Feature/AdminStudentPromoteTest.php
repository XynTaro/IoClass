<?php

use App\Models\Admin;
use App\Models\Student;
use Illuminate\Support\Facades\DB;

function makePromoteFixture(): array
{
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
    ], 'sy_id');

    $fromSectId = DB::table('section')->insertGetId([
        'sect_name' => 'Grade 1 - Sampaguita',
        'gr_level' => 'Grade 1',
        'is_deleted' => false,
    ], 'sect_id');

    $toSectId = DB::table('section')->insertGetId([
        'sect_name' => 'Grade 2 - Rosal',
        'gr_level' => 'Grade 2',
        'is_deleted' => false,
    ], 'sect_id');

    return compact('syId', 'fromSectId', 'toSectId');
}

test('cannot promote the same section twice in the same school year', function () {
    $admin = Admin::factory()->create();
    ['syId' => $syId, 'fromSectId' => $fromSectId, 'toSectId' => $toSectId] = makePromoteFixture();

    $student = Student::create([
        'rfid_uid' => 'PROMOTE004',
        'stu_fname' => 'Ana',
        'stu_lname' => 'Gonzales',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $fromSectId,
        'sy_id' => $syId,
    ]);

    // First promotion — should succeed
    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [
            'from_sect_id' => $fromSectId,
            'to_sect_id' => $toSectId,
        ])
        ->assertRedirect(route('admin.student.index'));

    // Second promotion — should be rejected
    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [
            'from_sect_id' => $fromSectId,
            'to_sect_id' => $toSectId,
        ])
        ->assertSessionHasErrors(['from_sect_id']);
});

test('admin can promote students from one section to another', function () {
    $admin = Admin::factory()->create();
    ['syId' => $syId, 'fromSectId' => $fromSectId, 'toSectId' => $toSectId] = makePromoteFixture();

    $student = Student::create([
        'rfid_uid' => 'PROMOTE001',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Dela Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $fromSectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [
            'from_sect_id' => $fromSectId,
            'to_sect_id' => $toSectId,
        ])
        ->assertRedirect(route('admin.student.index'))
        ->assertSessionHas('success');

    expect(
        DB::table('student_section')
            ->where('stu_id', $student->stu_id)
            ->where('sect_id', $toSectId)
            ->where('sy_id', $syId)
            ->exists()
    )->toBeTrue();
});

test('returns an error when the section has already been promoted this school year', function () {
    $admin = Admin::factory()->create();
    ['syId' => $syId, 'fromSectId' => $fromSectId, 'toSectId' => $toSectId] = makePromoteFixture();

    $student = Student::create([
        'rfid_uid' => 'PROMOTE002',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    // Student already promoted: has records in both from and to sections for the active SY
    DB::table('student_section')->insert([
        ['stu_id' => $student->stu_id, 'sect_id' => $fromSectId, 'sy_id' => $syId],
        ['stu_id' => $student->stu_id, 'sect_id' => $toSectId,   'sy_id' => $syId],
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [
            'from_sect_id' => $fromSectId,
            'to_sect_id' => $toSectId,
        ])
        ->assertSessionHasErrors(['from_sect_id']);
});

test('promoting skips archived students', function () {
    $admin = Admin::factory()->create();
    ['syId' => $syId, 'fromSectId' => $fromSectId, 'toSectId' => $toSectId] = makePromoteFixture();

    $archived = Student::create([
        'rfid_uid' => 'PROMOTE003',
        'stu_fname' => 'Pedro',
        'stu_lname' => 'Reyes',
        'status' => 'inactive',
        'is_deleted' => true,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $archived->stu_id,
        'sect_id' => $fromSectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [
            'from_sect_id' => $fromSectId,
            'to_sect_id' => $toSectId,
        ])
        ->assertRedirect(route('admin.student.index'));

    expect(
        DB::table('student_section')
            ->where('stu_id', $archived->stu_id)
            ->where('sect_id', $toSectId)
            ->exists()
    )->toBeFalse();
});

test('promote requires from and to section', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [])
        ->assertSessionHasErrors(['from_sect_id', 'to_sect_id']);
});

test('promote rejects same from and to section', function () {
    $admin = Admin::factory()->create();
    ['fromSectId' => $fromSectId] = makePromoteFixture();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.student.promote'), [
            'from_sect_id' => $fromSectId,
            'to_sect_id' => $fromSectId,
        ])
        ->assertSessionHasErrors(['to_sect_id']);
});
