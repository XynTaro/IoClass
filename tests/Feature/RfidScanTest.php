<?php

use App\Models\Admin;
use App\Models\Class_Schedule;
use App\Models\Room;
use App\Models\School_Year;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;

beforeEach(function () {
    config(['rfid.device_token' => null]);
});

test('rfid scan resolves a student by uid and records attendance', function () {
    Student::create([
        'rfid_uid' => 'A1B2C3D4',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'a1b2c3d4',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'student',
            'action' => 'attendance',
            'data' => [
                'stu_fname' => 'Maria',
                'stu_lname' => 'Santos',
                'status' => 'active',
            ],
            'attendance' => [
                'recorded' => true,
                'already_checked_in' => false,
            ],
        ]);
});

test('rfid scan resolves a teacher by uid and opens a session', function () {
    Teacher::create([
        'tch_rfid_uid' => 'TEACH001',
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ana.reyes.rfid@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teach001',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'action' => 'session_started',
            'data' => [
                'tch_fname' => 'Ana',
                'tch_lname' => 'Reyes',
            ],
        ]);
});

test('student scan after teacher tap links attendance to the active session', function () {
    config(['rfid.device_token' => 'esp32-room-a']);

    $teacher = Teacher::create([
        'tch_rfid_uid' => 'TEACH002',
        'tch_fname' => 'Luz',
        'tch_lname' => 'Bautista',
        'tch_email' => 'luz.bautista@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $section = Section::create([
        'sect_name' => 'Grade 7 - Mabini',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);

    $subject = Subject::create([
        'subj_code' => 'MATH',
        'subj_name' => 'Mathematics',
        'is_deleted' => false,
    ]);

    $room = Room::create([
        'room_no' => '101',
        'building' => 'Main',
        'is_deleted' => false,
    ]);

    $schoolYear = School_Year::where('is_active', true)->first()
        ?? School_Year::create(['sy_name' => '2025-2026', 'is_active' => true]);

    Class_Schedule::create([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subject->subj_id,
        'sect_id' => $section->sect_id,
        'room_id' => $room->room_id,
        'sy_id' => $schoolYear->sy_id,
        'day_of_week' => now()->format('l'),
        'start_time' => '00:00:00',
        'end_time' => '23:59:59',
    ]);

    // Teacher taps first
    $this->withHeader('X-Device-Token', 'esp32-room-a')
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TEACH002'])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'action' => 'session_started',
            'session' => [
                'sect_name' => 'Grade 7 - Mabini',
                'subj_name' => 'Mathematics',
            ],
        ]);

    // Student taps next
    $student = Student::create([
        'rfid_uid' => 'STU77777',
        'stu_fname' => 'Pedro',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->withHeader('X-Device-Token', 'esp32-room-a')
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STU77777'])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'student',
            'action' => 'attendance',
            'attendance' => ['recorded' => true],
            'session' => [
                'tch_name' => 'Luz Bautista',
                'sect_name' => 'Grade 7 - Mabini',
                'subj_name' => 'Mathematics',
            ],
        ]);

    $this->assertDatabaseHas('attendance', [
        'stu_id' => $student->stu_id,
        'sect_id' => $section->sect_id,
    ]);
});

test('rfid scan returns denied response for unknown uid', function () {
    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'UNKNOWN999',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => false,
            'message' => 'RFID UID not recognized.',
        ]);
});

test('rfid scan requires rfid uid', function () {
    $this->postJson(route('api.rfid.scan'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['rfid_uid']);
});

test('rfid register creates a student from esp32 payload', function () {
    $this->postJson(route('api.rfid.register'), [
        'rfid_uid' => 'STU12345',
        'type' => 'student',
        'name' => 'Juan Dela Cruz',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'student',
            'data' => [
                'stu_fname' => 'Juan',
                'stu_mname' => 'Dela',
                'stu_lname' => 'Cruz',
                'status' => 'active',
            ],
        ]);

    $this->assertDatabaseHas('student', [
        'rfid_uid' => 'STU12345',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Cruz',
    ]);
});

test('rfid register creates a teacher from esp32 payload', function () {
    $this->postJson(route('api.rfid.register'), [
        'rfid_uid' => 'TCH98765',
        'type' => 'teacher',
        'name' => 'Ana Reyes',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'data' => [
                'tch_fname' => 'Ana',
                'tch_lname' => 'Reyes',
            ],
        ]);

    $this->assertDatabaseHas('teacher', [
        'tch_rfid_uid' => 'TCH98765',
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
    ]);
});

test('rfid register rejects duplicate uid', function () {
    Student::create([
        'rfid_uid' => 'DUPLICATE01',
        'stu_fname' => 'Existing',
        'stu_lname' => 'Student',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.register'), [
        'rfid_uid' => 'duplicate01',
        'type' => 'student',
        'name' => 'New Person',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => false,
            'message' => 'RFID card already registered.',
        ]);
});

test('rfid routes reject invalid device token when configured', function () {
    config(['rfid.device_token' => 'secret-device-token']);

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'ABC123',
    ])
        ->assertUnauthorized()
        ->assertJson([
            'success' => false,
            'message' => 'Invalid device token.',
        ]);

    $this->withHeader('X-Device-Token', 'secret-device-token')
        ->postJson(route('api.rfid.scan'), [
            'rfid_uid' => 'ABC123',
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => false,
            'message' => 'RFID UID not recognized.',
        ]);
});

test('rfid scan caches uid for admin wireless capture', function () {
    config(['rfid.device_token' => 'esp32-room-a']);

    $since = now()->subSecond()->timestamp;

    $this->withHeader('X-Device-Token', 'esp32-room-a')
        ->postJson(route('api.rfid.scan'), [
            'rfid_uid' => 'wireless001',
        ])
        ->assertSuccessful();

    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->getJson(route('admin.rfid.lastCapture', ['since' => $since]))
        ->assertSuccessful()
        ->assertJson([
            'available' => true,
            'uid' => 'WIRELESS001',
        ]);
});

test('rfid capture stores uid without lookup', function () {
    config(['rfid.device_token' => 'esp32-room-a']);

    $this->withHeader('X-Device-Token', 'esp32-room-a')
        ->postJson(route('api.rfid.capture'), [
            'rfid_uid' => 'capture999',
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'rfid_uid' => 'CAPTURE999',
        ]);
});
