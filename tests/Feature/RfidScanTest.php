<?php

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\Class_Schedule;
use App\Models\Guardian;
use App\Models\ParentGuardian;
use App\Models\Room;
use App\Models\School_Year;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use App\Services\Sms\RecordingSmsSender;
use App\Support\RfidCaptureCache;
use App\Support\RfidSessionCache;
use Carbon\Carbon;

beforeEach(function () {
    config(['rfid.device_token' => null]);
});

test('rfid scan resolves a student by uid and blocks when no active session', function () {
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
                'recorded' => false,
                'action' => 'no_session',
                'status' => 'blocked',
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

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $section->sect_id,
        'sy_id' => $schoolYear->sy_id,
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
        'subj_id' => $subject->subj_id,
        'session_id' => null,
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

test('inactive teacher rfid scan is rejected', function () {
    Teacher::create([
        'tch_rfid_uid' => 'TEACHINACTIVE',
        'tch_fname' => 'Inactive',
        'tch_lname' => 'Teacher',
        'tch_email' => 'inactive.rfid@example.com',
        'tch_pw' => 'password123',
        'status' => 'inactive',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'teachinactive',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => false,
            'message' => 'RFID UID not recognized.',
        ]);
});

test('section id is parsed from section-locked device tokens', function () {
    expect(RfidCaptureCache::sectionIdFromDeviceToken('esp32-sect-3-rizal'))->toBe(3)
        ->and(RfidCaptureCache::sectionIdFromDeviceToken('sect-12-grade-7-mabini'))->toBe(12)
        ->and(RfidCaptureCache::sectionIdFromDeviceToken('esp32-sect-5'))->toBe(5)
        ->and(RfidCaptureCache::sectionIdFromDeviceToken('esp32_sect_8_alpha'))->toBe(8)
        ->and(RfidCaptureCache::sectionIdFromDeviceToken('esp32-room-a'))->toBeNull()
        ->and(RfidCaptureCache::sectionIdFromDeviceToken('esp32-admin'))->toBeNull()
        ->and(RfidCaptureCache::sectionIdFromDeviceToken(null))->toBeNull();
});

test('section-locked device token restricts teachers and students to that section', function () {
    $schoolYear = School_Year::where('is_active', true)->first()
        ?? School_Year::create(['sy_label' => '2025-2026', 'is_active' => true, 'is_deleted' => false]);

    $sectionA = Section::create([
        'sect_name' => 'Rizal',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    $sectionB = Section::create([
        'sect_name' => 'Bonifacio',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    $subject = Subject::create([
        'subj_code' => 'ENG',
        'subj_name' => 'English',
        'is_deleted' => false,
    ]);

    $room = Room::create([
        'room_no' => '201',
        'is_deleted' => false,
    ]);

    $teacherA = Teacher::create([
        'tch_rfid_uid' => 'TCHA0001',
        'tch_fname' => 'Elena',
        'tch_lname' => 'Cruz',
        'tch_email' => 'elena.cruz@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $teacherB = Teacher::create([
        'tch_rfid_uid' => 'TCHB0001',
        'tch_fname' => 'Marco',
        'tch_lname' => 'Diaz',
        'tch_email' => 'marco.diaz@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    Class_Schedule::create([
        'tch_id' => $teacherA->tch_id,
        'subj_id' => $subject->subj_id,
        'sect_id' => $sectionA->sect_id,
        'room_id' => $room->room_id,
        'sy_id' => $schoolYear->sy_id,
        'day_of_week' => now()->format('l'),
        'start_time' => '00:00:00',
        'end_time' => '23:59:59',
    ]);

    Class_Schedule::create([
        'tch_id' => $teacherB->tch_id,
        'subj_id' => $subject->subj_id,
        'sect_id' => $sectionB->sect_id,
        'room_id' => $room->room_id,
        'sy_id' => $schoolYear->sy_id,
        'day_of_week' => now()->format('l'),
        'start_time' => '00:00:00',
        'end_time' => '23:59:59',
    ]);

    $studentA = Student::create([
        'rfid_uid' => 'STUA0001',
        'stu_fname' => 'Lia',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $studentB = Student::create([
        'rfid_uid' => 'STUB0001',
        'stu_fname' => 'Nico',
        'stu_lname' => 'Reyes',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        ['stu_id' => $studentA->stu_id, 'sect_id' => $sectionA->sect_id, 'sy_id' => $schoolYear->sy_id],
        ['stu_id' => $studentB->stu_id, 'sect_id' => $sectionB->sect_id, 'sy_id' => $schoolYear->sy_id],
    ]);

    $deviceToken = "esp32-sect-{$sectionA->sect_id}-rizal";
    config(['rfid.device_tokens' => $deviceToken]);

    // Student from another section is blocked even before any teacher taps
    $this->withHeader('X-Device-Token', $deviceToken)
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STUB0001'])
        ->assertSuccessful()
        ->assertJsonPath('action', 'attendance')
        ->assertJsonPath('attendance.action', 'not_your_class')
        ->assertJsonPath('attendance.recorded', false);

    // Teacher from Section B cannot open a session on Section A's reader
    $this->withHeader('X-Device-Token', $deviceToken)
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHB0001'])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'action' => 'wrong_section',
            'device_section' => [
                'sect_id' => $sectionA->sect_id,
                'sect_name' => 'Rizal',
            ],
        ]);

    expect(RfidSessionCache::get($deviceToken))->toBeNull()
        ->and(DB::table('teacher_attendance')->where('tch_id', $teacherB->tch_id)->exists())->toBeFalse();

    // Teacher from Section A opens session on Section A's reader
    $this->withHeader('X-Device-Token', $deviceToken)
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHA0001'])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'action' => 'session_started',
            'session' => [
                'sect_name' => 'Rizal',
                'subj_name' => 'English',
            ],
        ]);

    // Wrong teacher tapping while Section A's session is active does NOT overwrite it
    $this->withHeader('X-Device-Token', $deviceToken)
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHB0001'])
        ->assertSuccessful()
        ->assertJsonPath('action', 'wrong_section');

    expect(RfidSessionCache::get($deviceToken)['tch_id'] ?? null)->toBe($teacherA->tch_id);

    // Enrolled student in Section A can now record attendance
    $this->withHeader('X-Device-Token', $deviceToken)
        ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STUA0001'])
        ->assertSuccessful()
        ->assertJsonPath('attendance.recorded', true);
});

test('offline queued scans replay using scanned_at and send dated and timed absence sms', function () {
    $sms = new RecordingSmsSender;
    $this->app->instance(SmsSender::class, $sms);

    // Server clock is 11:00 AM (long after the 07:00-08:00 class has ended)
    Carbon::setTestNow('2026-06-01 11:00:00');

    try {
        $schoolYear = School_Year::where('is_active', true)->first()
            ?? School_Year::create(['sy_label' => '2025-2026', 'is_active' => true, 'is_deleted' => false]);

        $section = Section::create([
            'sect_name' => 'Rizal',
            'gr_level' => 'Grade 7',
            'is_deleted' => false,
        ]);

        $subject = Subject::create([
            'subj_code' => 'MATH7',
            'subj_name' => 'Mathematics',
            'is_deleted' => false,
        ]);

        $room = Room::create([
            'room_no' => '101',
            'is_deleted' => false,
        ]);

        $teacher = Teacher::create([
            'tch_rfid_uid' => 'TCHOFFLINE',
            'tch_fname' => 'Clara',
            'tch_lname' => 'Reyes',
            'tch_email' => 'clara.reyes@example.com',
            'tch_pw' => 'password123',
            'is_deleted' => false,
        ]);

        Class_Schedule::create([
            'tch_id' => $teacher->tch_id,
            'subj_id' => $subject->subj_id,
            'sect_id' => $section->sect_id,
            'room_id' => $room->room_id,
            'sy_id' => $schoolYear->sy_id,
            'day_of_week' => 'Monday',
            'start_time' => '07:00:00',
            'end_time' => '08:00:00',
        ]);

        $presentStudent = Student::create([
            'rfid_uid' => 'STUOFF01',
            'stu_fname' => 'Juan',
            'stu_lname' => 'Luna',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $absentStudent = Student::create([
            'rfid_uid' => 'STUOFF02',
            'stu_fname' => 'Jose',
            'stu_lname' => 'Palma',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        $guardian = Guardian::create([
            'name' => 'Rosa',
            'guardian_lname' => 'Palma',
            'contact_number' => '09171234567',
            'is_deleted' => false,
        ]);

        ParentGuardian::create([
            'stu_par_id' => $absentStudent->stu_id,
            'guardian_id' => $guardian->guardian_id,
        ]);

        DB::table('student_section')->insert([
            ['stu_id' => $presentStudent->stu_id, 'sect_id' => $section->sect_id, 'sy_id' => $schoolYear->sy_id],
            ['stu_id' => $absentStudent->stu_id, 'sect_id' => $section->sect_id, 'sy_id' => $schoolYear->sy_id],
        ]);

        $deviceToken = "esp32-sect-{$section->sect_id}-rizal";
        config(['rfid.device_tokens' => $deviceToken]);

        // 1. Replay teacher tap-in from 07:00:05
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), [
                'rfid_uid' => 'TCHOFFLINE',
                'scanned_at' => '2026-06-01 07:00:05',
            ])
            ->assertSuccessful()
            ->assertJsonPath('action', 'session_started')
            ->assertJsonPath('session.subj_name', 'Mathematics');

        // 2. Replay present student tap-in from 07:05:00
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), [
                'rfid_uid' => 'STUOFF01',
                'scanned_at' => '2026-06-01 07:05:00',
            ])
            ->assertSuccessful()
            ->assertJsonPath('attendance.recorded', true)
            ->assertJsonPath('attendance.status', 'present');

        // 3. Replay present student tap-out from 07:56:00
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), [
                'rfid_uid' => 'STUOFF01',
                'scanned_at' => '2026-06-01 07:56:00',
            ])
            ->assertSuccessful()
            ->assertJsonPath('action', 'time_out')
            ->assertJsonPath('attendance.recorded', true);

        // 4. Replay teacher tap-out from 08:00:10 -> closes session & sends absence SMS
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), [
                'rfid_uid' => 'TCHOFFLINE',
                'scanned_at' => '2026-06-01 08:00:10',
            ])
            ->assertSuccessful()
            ->assertJsonPath('action', 'session_ended')
            ->assertJsonPath('session.absences_marked', 1)
            ->assertJsonPath('session.notifications_sent', 1);

        expect($sms->messages)->toHaveCount(1)
            ->and($sms->messages[0]['to'])->toBe('09171234567')
            ->and($sms->messages[0]['message'])->toContain('Jose Palma')
            ->and($sms->messages[0]['message'])->toContain('Mathematics (Rizal)')
            ->and($sms->messages[0]['message'])->toContain('Jun 01, 2026')
            ->and($sms->messages[0]['message'])->toContain('7:00 AM-8:00 AM');
    } finally {
        Carbon::setTestNow();
    }
});

test('after teacher confirms subject verification, subsequent teacher and student scans return no class', function () {
    Carbon::setTestNow('2026-06-01 08:15:00');

    try {
        $schoolYear = School_Year::where('is_active', true)->first()
            ?? School_Year::create(['sy_label' => '2025-2026', 'is_active' => true, 'is_deleted' => false]);

        $section = Section::create([
            'sect_name' => 'Sturgeon',
            'gr_level' => 'Grade 7',
            'is_deleted' => false,
        ]);

        $subject = Subject::create([
            'subj_code' => 'SCI7',
            'subj_name' => 'Science 7',
            'is_deleted' => false,
        ]);

        $room = Room::create([
            'room_no' => '105',
            'is_deleted' => false,
        ]);

        $teacher = Teacher::create([
            'tch_rfid_uid' => 'TCHVERIF01',
            'tch_fname' => 'Nora',
            'tch_lname' => 'Lim',
            'tch_email' => 'nora.lim@example.com',
            'tch_pw' => 'password123',
            'is_deleted' => false,
        ]);

        Class_Schedule::create([
            'tch_id' => $teacher->tch_id,
            'subj_id' => $subject->subj_id,
            'sect_id' => $section->sect_id,
            'room_id' => $room->room_id,
            'sy_id' => $schoolYear->sy_id,
            'day_of_week' => 'Monday',
            'start_time' => '08:00:00',
            'end_time' => '09:00:00',
        ]);

        $student = Student::create([
            'rfid_uid' => 'STUVERIF01',
            'stu_fname' => 'Sam',
            'stu_lname' => 'Tan',
            'status' => 'active',
            'is_deleted' => false,
        ]);

        DB::table('student_section')->insert([
            'stu_id' => $student->stu_id,
            'sect_id' => $section->sect_id,
            'sy_id' => $schoolYear->sy_id,
        ]);

        $deviceToken = "esp32-sect-{$section->sect_id}-Sturgeon";
        config(['rfid.device_tokens' => $deviceToken]);

        // 1. Teacher opens the session via RFID
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHVERIF01'])
            ->assertSuccessful()
            ->assertJsonPath('action', 'session_started');

        expect(RfidSessionCache::get($deviceToken))->not->toBeNull();

        // 2. Teacher confirms subject verification in the web UI
        $this->actingAs($teacher, 'teacher')
            ->post(route('teacher.verification.confirm'), [
                'date' => '2026-06-01',
                'subj_id' => $subject->subj_id,
                'sect_id' => $section->sect_id,
                'rows' => [
                    ['stu_id' => $student->stu_id, 'status' => 'absent'],
                ],
            ])
            ->assertRedirect();

        // Active RFID session is now closed
        expect(RfidSessionCache::get($deviceToken))->toBeNull();

        // 3. Teacher taps RFID again -> returns no_schedule (cannot re-open verified class)
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'TCHVERIF01'])
            ->assertSuccessful()
            ->assertJsonPath('action', 'no_schedule');

        // 4. Student taps RFID -> returns no_session (NO CLASS NOW) and stays absent
        $this->withHeader('X-Device-Token', $deviceToken)
            ->postJson(route('api.rfid.scan'), ['rfid_uid' => 'STUVERIF01'])
            ->assertSuccessful()
            ->assertJsonPath('attendance.action', 'no_session')
            ->assertJsonPath('attendance.recorded', false);

        expect(DB::table('attendance')
            ->where('stu_id', $student->stu_id)
            ->where('subj_id', $subject->subj_id)
            ->value('status')
        )->toBe('absent');
    } finally {
        Carbon::setTestNow();
    }
});
