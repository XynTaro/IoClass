<?php

use App\Models\Student;
use App\Models\Teacher;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config(['rfid.device_token' => null, 'rfid.device_tokens' => null]);
});

test('rfid scan records student attendance', function () {
    Carbon::setTestNow('2026-06-01 07:30:00');

    $student = Student::create([
        'rfid_uid' => 'ATTEND0001',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'attend0001',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'student',
            'attendance' => [
                'recorded' => true,
                'already_checked_in' => false,
                'status' => 'present',
            ],
        ]);

    $this->assertDatabaseHas('attendance', [
        'stu_id' => $student->stu_id,
        'status' => 'present',
    ]);

    Carbon::setTestNow();
});

test('rfid scan does not duplicate attendance on same day', function () {
    Carbon::setTestNow('2026-06-01 07:45:00');

    Student::create([
        'rfid_uid' => 'ATTEND0002',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'ATTEND0002'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.recorded', true);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'ATTEND0002'])
        ->assertSuccessful()
        ->assertJson([
            'attendance' => [
                'recorded' => false,
                'already_checked_in' => true,
                'status' => 'present',
            ],
        ]);

    expect(DB::table('attendance')->where('stu_id', DB::table('student')->where('rfid_uid', 'ATTEND0002')->value('stu_id'))->count())->toBe(1);

    Carbon::setTestNow();
});

test('rfid scan marks student late after configured cutoff', function () {
    config(['attendance.late_after' => '08:00']);

    Carbon::setTestNow('2026-06-01 09:15:00');

    $student = Student::create([
        'rfid_uid' => 'LATE0001',
        'stu_fname' => 'Ana',
        'stu_lname' => 'Lopez',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'LATE0001'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.status', 'late');

    $this->assertDatabaseHas('attendance', [
        'stu_id' => $student->stu_id,
        'status' => 'late',
    ]);

    Carbon::setTestNow();
});

test('rfid scan for teacher does not include attendance payload', function () {
    Teacher::create([
        'tch_rfid_uid' => 'TCHATT001',
        'tch_fname' => 'Ben',
        'tch_lname' => 'Torres',
        'tch_email' => 'ben.att@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHATT001'])
        ->assertSuccessful()
        ->assertJsonMissing(['attendance']);
});

test('authenticated teacher can view attendance index', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Jupiter',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Ella',
        'tch_lname' => 'Gomez',
        'tch_email' => 'ella.gomez@example.com',
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
        'lrn' => '999999999999',
        'rfid_uid' => 'STUATT001',
        'stu_fname' => 'Leo',
        'stu_lname' => 'Diaz',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    Carbon::setTestNow('2026-06-01 07:30:00');

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STUATT001'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.status', 'present');

    expect(DB::table('attendance')->where('stu_id', $stuId)->value('status'))->toBe('present');

    Carbon::setTestNow();

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.attendance.index', ['date' => '2026-06-01']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/Attendance/index')
            ->where('summary.present', 1)
            ->where('summary.excused', 0)
            ->where('summary.absent', 0)
            ->has('attendance.data', 1)
            ->where('attendance.data.0.attendance_status', 'present')
        );
});

test('guests are redirected from teacher attendance index', function () {
    $this->get(route('teacher.attendance.index'))
        ->assertRedirect(route('login'));
});
