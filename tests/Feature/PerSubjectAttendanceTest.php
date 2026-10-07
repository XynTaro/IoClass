<?php

use App\Models\Student;
use App\Models\Teacher;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config(['rfid.device_token' => null, 'rfid.device_tokens' => null]);
    Carbon::setTestNow('2026-06-01 07:30:00');
});

afterEach(function () {
    Carbon::setTestNow();
});

/**
 * Helper: create the base school-year + section + two subjects + a teacher with schedules.
 *
 * @return array{sy_id: int, sect_id: int, subj1_id: int, subj2_id: int, tch_rfid: string, sched1_id: int, sched2_id: int}
 */
function setupTwoSubjectSchedule(): array
{
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Alpha',
        'gr_level' => 'Grade 11',
        'is_deleted' => false,
    ], 'sect_id');

    $roomId = DB::table('room')->insertGetId([
        'room_no' => '101',
    ], 'room_id');

    $subj1Id = DB::table('subject')->insertGetId([
        'subj_code' => 'MATH',
        'subj_name' => 'Mathematics',
    ], 'subj_id');

    $subj2Id = DB::table('subject')->insertGetId([
        'subj_code' => 'SCI',
        'subj_name' => 'Science',
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TCH-TRANSFER',
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ana.reyes@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    // Subject 1: 07:00 – 08:00
    $sched1Id = DB::table('class_schedule')->insertGetId([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subj1Id,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
    ], 'schedule_id');

    // Subject 2: 08:00 – 09:00
    $sched2Id = DB::table('class_schedule')->insertGetId([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subj2Id,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '08:00:00',
        'end_time' => '09:00:00',
    ], 'schedule_id');

    return [
        'sy_id' => $syId,
        'sect_id' => $sectId,
        'subj1_id' => $subj1Id,
        'subj2_id' => $subj2Id,
        'tch_rfid' => 'TCH-TRANSFER',
        'sched1_id' => $sched1Id,
        'sched2_id' => $sched2Id,
        'tch_id' => $teacher->tch_id,
    ];
}

test('student tap records per-subject attendance when session has a subject', function () {
    $data = setupTwoSubjectSchedule();

    $student = Student::create([
        'rfid_uid' => 'STU-SUBJ-01',
        'stu_fname' => 'Mario',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $data['sect_id'],
        'sy_id' => $data['sy_id'],
    ]);

    // Teacher opens session for subject 1 (07:00–08:00, test is at 07:30)
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCH-TRANSFER'])->assertSuccessful();

    // Student taps
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-SUBJ-01'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.recorded', true)
        ->assertJsonPath('attendance.status', 'present');

    expect(DB::table('attendance')
        ->where('stu_id', $student->stu_id)
        ->where('subj_id', $data['subj1_id'])
        ->exists()
    )->toBeTrue();
});

test('same student tap within cooldown is rejected by cooldown guard', function () {
    $data = setupTwoSubjectSchedule();

    $student = Student::create([
        'rfid_uid' => 'STU-IDEM-01',
        'stu_fname' => 'Liza',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $data['sect_id'],
        'sy_id' => $data['sy_id'],
    ]);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCH-TRANSFER'])->assertSuccessful();
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-IDEM-01'])->assertSuccessful();

    // Second tap immediately (within cooldown)
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-IDEM-01'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.already_checked_in', true)
        ->assertJsonPath('attendance.action', 'cooldown');

    expect(DB::table('attendance')->where('stu_id', $student->stu_id)->value('time_out'))->toBeNull();
});

test('student taps out after cooldown in same subject session', function () {
    $data = setupTwoSubjectSchedule();

    $student = Student::create([
        'rfid_uid' => 'STU-TAPOUT-01',
        'stu_fname' => 'Carlos',
        'stu_lname' => 'Mendoza',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $data['sect_id'],
        'sy_id' => $data['sy_id'],
    ]);

    // Teacher opens session (07:30)
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCH-TRANSFER'])->assertSuccessful();

    // 1st Tap: Time In
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-TAPOUT-01'])
        ->assertSuccessful()
        ->assertJsonPath('action', 'attendance')
        ->assertJsonPath('attendance.recorded', true)
        ->assertJsonPath('attendance.action', 'time_in');

    // Advance time past cooldown (to 07:55, end of period)
    Carbon::setTestNow('2026-06-01 07:55:00');

    // 2nd Tap: Time Out
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-TAPOUT-01'])
        ->assertSuccessful()
        ->assertJsonPath('action', 'time_out')
        ->assertJsonPath('attendance.recorded', true)
        ->assertJsonPath('attendance.action', 'time_out');

    $att = DB::table('attendance')
        ->where('stu_id', $student->stu_id)
        ->where('subj_id', $data['subj1_id'])
        ->first();

    expect($att->time_in)->not->toBeNull()
        ->and($att->time_out)->not->toBeNull();

    // 3rd Tap: Already timed out
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-TAPOUT-01'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.already_timed_out', true);
});

test('teacher tap for next subject does not auto-transfer students', function () {
    $data = setupTwoSubjectSchedule();

    $student = Student::create([
        'rfid_uid' => 'STU-NOAUTO-01',
        'stu_fname' => 'Ben',
        'stu_lname' => 'Dela Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $data['sect_id'],
        'sy_id' => $data['sy_id'],
    ]);

    // Session 1 (07:00–08:00): teacher opens, student taps in
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCH-TRANSFER'])->assertSuccessful();
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-NOAUTO-01'])->assertSuccessful();

    // Advance time to 08:15 (subject 2 period)
    Carbon::setTestNow('2026-06-01 08:15:00');

    // Teacher taps again → opens session 2 without auto-transferring
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCH-TRANSFER'])
        ->assertSuccessful()
        ->assertJsonPath('session.auto_transferred', 0);

    // Student should NOT have an attendance record for Subject 2 yet
    expect(DB::table('attendance')
        ->where('stu_id', $student->stu_id)
        ->where('subj_id', $data['subj2_id'])
        ->exists()
    )->toBeFalse();

    // When the student arrives and taps in Subject 2, they get recorded
    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-NOAUTO-01'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.recorded', true);

    expect(DB::table('attendance')
        ->where('stu_id', $student->stu_id)
        ->where('subj_id', $data['subj2_id'])
        ->exists()
    )->toBeTrue();
});

test('multiple device tokens are accepted', function () {
    config([
        'rfid.device_token' => null,
        'rfid.device_tokens' => 'esp32-room-a,esp32-room-b',
    ]);

    $student = Student::create([
        'rfid_uid' => 'STU-MULTI-01',
        'stu_fname' => 'Jose',
        'stu_lname' => 'Rizal',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-MULTI-01'], ['X-Device-Token' => 'esp32-room-a'])
        ->assertSuccessful();

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-MULTI-01'], ['X-Device-Token' => 'esp32-room-b'])
        ->assertSuccessful();

    $this->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU-MULTI-01'], ['X-Device-Token' => 'esp32-room-c'])
        ->assertStatus(401);
});
