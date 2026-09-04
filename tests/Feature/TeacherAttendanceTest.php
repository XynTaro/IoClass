<?php

use App\Models\Admin;
use App\Models\CalendarEvent;
use App\Models\School_Year;
use App\Models\Teacher;
use App\Models\TeacherAttendance;
use Carbon\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    config(['rfid.device_token' => null]);
    config(['attendance.late_after' => '08:00']);
});

test('rfid scan records teacher daily attendance automatically', function () {
    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TEACHER_RFID_001',
        'tch_fname' => 'Elena',
        'tch_lname' => 'Reyes',
        'tch_email' => 'elena.reyes@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    Carbon::setTestNow('2026-09-01 07:30:00');

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teacher_rfid_001',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'attendance' => [
                'recorded' => true,
                'already_checked_in' => false,
                'status' => 'present',
            ],
        ]);

    $record = TeacherAttendance::where('tch_id', $teacher->tch_id)
        ->whereDate('att_date', '2026-09-01')
        ->first();

    expect($record)->not->toBeNull();
    expect($record->status)->toBe('present');
    expect($record->time_in)->not->toBeNull();
});

test('rfid scan marks teacher as late if scanned after cutoff time', function () {
    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TEACHER_RFID_002',
        'tch_fname' => 'Carlos',
        'tch_lname' => 'Garcia',
        'tch_email' => 'carlos.garcia@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    Carbon::setTestNow('2026-09-01 08:35:00');

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teacher_rfid_002',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'attendance' => [
                'recorded' => true,
                'already_checked_in' => false,
                'status' => 'late',
            ],
        ]);

    $record = TeacherAttendance::where('tch_id', $teacher->tch_id)
        ->whereDate('att_date', '2026-09-01')
        ->first();

    expect($record)->not->toBeNull();
    expect($record->status)->toBe('late');
});

test('rfid scan on second tap same day reports already checked in without duplicate record', function () {
    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TEACHER_RFID_003',
        'tch_fname' => 'Grace',
        'tch_lname' => 'Tan',
        'tch_email' => 'grace.tan@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    Carbon::setTestNow('2026-09-01 07:45:00');

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teacher_rfid_003',
    ])->assertSuccessful();

    // Second tap 2 hours later
    Carbon::setTestNow('2026-09-01 09:45:00');

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teacher_rfid_003',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'attendance' => [
                'recorded' => false,
                'already_checked_in' => true,
            ],
        ]);

    $count = TeacherAttendance::where('tch_id', $teacher->tch_id)
        ->whereDate('att_date', '2026-09-01')
        ->count();

    expect($count)->toBe(1);
});

test('rfid scan blocks teacher attendance on non-school days', function () {
    $sy = School_Year::create([
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => true,
        'is_deleted' => false,
    ]);

    CalendarEvent::create([
        'sy_id' => $sy->sy_id,
        'title' => 'National Holiday',
        'type' => 'holiday',
        'affects_classes' => true,
        'start_date' => '2026-09-01',
        'end_date' => '2026-09-01',
    ]);

    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TEACHER_RFID_004',
        'tch_fname' => 'Noel',
        'tch_lname' => 'Luna',
        'tch_email' => 'noel.luna@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    Carbon::setTestNow('2026-09-01 07:30:00');

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teacher_rfid_004',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'attendance' => [
                'recorded' => false,
                'non_school_day' => true,
                'status' => 'no_class',
            ],
        ]);

    $count = TeacherAttendance::where('tch_id', $teacher->tch_id)
        ->whereDate('att_date', '2026-09-01')
        ->count();

    expect($count)->toBe(0);
});

test('admin can view teacher attendance page with summary metrics', function () {
    $admin = Admin::create([
        'adm_fname' => 'Super',
        'adm_lname' => 'Admin',
        'adm_email' => 'admin.att@example.com',
        'adm_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $teacher = Teacher::create([
        'tch_fname' => 'Lara',
        'tch_lname' => 'Cruz',
        'tch_email' => 'lara.cruz@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    TeacherAttendance::create([
        'tch_id' => $teacher->tch_id,
        'att_date' => '2026-09-01',
        'time_in' => '2026-09-01 07:45:00',
        'status' => 'present',
    ]);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.teacher-attendance.index', ['date' => '2026-09-01']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/TeacherAttendance/Index')
            ->has('attendance.data')
            ->has('summary')
            ->where('summary.present', 1)
        );
});

test('admin can update teacher attendance status', function () {
    $admin = Admin::create([
        'adm_fname' => 'Super',
        'adm_lname' => 'Admin',
        'adm_email' => 'admin.update.att@example.com',
        'adm_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $teacher = Teacher::create([
        'tch_fname' => 'Dennis',
        'tch_lname' => 'Mendoza',
        'tch_email' => 'dennis.mendoza@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $this->actingAs($admin, 'admin')
        ->put(route('admin.teacher-attendance.update', $teacher->tch_id), [
            'date' => '2026-09-01',
            'status' => 'excused',
            'remarks' => 'Medical checkup',
        ])
        ->assertRedirect();

    $record = TeacherAttendance::where('tch_id', $teacher->tch_id)
        ->whereDate('att_date', '2026-09-01')
        ->first();

    expect($record)->not->toBeNull();
    expect($record->status)->toBe('excused');
    expect($record->remarks)->toBe('Medical checkup');
});

test('teacher can view personal attendance page', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Rita',
        'tch_lname' => 'Valdez',
        'tch_email' => 'rita.valdez@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    TeacherAttendance::create([
        'tch_id' => $teacher->tch_id,
        'att_date' => '2026-09-01',
        'time_in' => '2026-09-01 07:50:00',
        'status' => 'present',
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.my-attendance.index', ['month' => '2026-09']))
        ->assertSuccessful()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Teacher/MyAttendance/Index')
            ->has('attendance.data')
            ->has('summary')
            ->where('summary.present', 1)
        );
});
