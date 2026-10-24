<?php

use App\Models\Student;
use App\Models\Teacher;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config(['rfid.device_token' => null, 'rfid.device_tokens' => null]);
});

function setupAttendanceTestSchedule(): array
{
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

    $roomId = DB::table('room')->insertGetId([
        'room_no' => '101',
    ], 'room_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_name' => 'Mathematics',
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TCHATT999',
        'tch_fname' => 'Teacher',
        'tch_lname' => 'One',
        'tch_email' => 'tch999@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subjId,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
    ]);

    return [
        'sy_id' => $syId,
        'sect_id' => $sectId,
        'subj_id' => $subjId,
        'teacher' => $teacher,
    ];
}

test('rfid scan records student attendance', function () {
    $setup = setupAttendanceTestSchedule();

    $student = Student::create([
        'rfid_uid' => 'ATTEND0001',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $setup['sect_id'],
        'sy_id' => $setup['sy_id'],
    ]);

    Carbon::setTestNow('2026-06-01 07:05:00');

    // Teacher taps first to open session
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHATT999'])->assertSuccessful();

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
    $setup = setupAttendanceTestSchedule();

    $student = Student::create([
        'rfid_uid' => 'ATTEND0002',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $setup['sect_id'],
        'sy_id' => $setup['sy_id'],
    ]);

    Carbon::setTestNow('2026-06-01 07:05:00');
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHATT999'])->assertSuccessful();

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'ATTEND0002'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.recorded', true);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'ATTEND0002'])
        ->assertSuccessful()
        ->assertJson([
            'attendance' => [
                'recorded' => false,
                'already_checked_in' => true,
                'action' => 'too_early_out',
            ],
        ]);

    expect(DB::table('attendance')->where('stu_id', $student->stu_id)->count())->toBe(1);

    Carbon::setTestNow();
});

test('rfid scan marks student late after configured cutoff', function () {
    $setup = setupAttendanceTestSchedule();

    $student = Student::create([
        'rfid_uid' => 'LATE0001',
        'stu_fname' => 'Ana',
        'stu_lname' => 'Lopez',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $setup['sect_id'],
        'sy_id' => $setup['sy_id'],
    ]);

    // Student taps at 07:25 (> 10 mins grace period from 07:00 start)
    Carbon::setTestNow('2026-06-01 07:25:00');
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHATT999'])->assertSuccessful();

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
        ->assertJsonMissing(['attendance.recorded']);
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

    $roomId = DB::table('room')->insertGetId([
        'room_no' => '102',
    ], 'room_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_name' => 'Science',
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TCHATT002',
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

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subjId,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
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

    Carbon::setTestNow('2026-06-01 07:05:00');

    // Teacher taps first to open session
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHATT002'])->assertSuccessful();

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
