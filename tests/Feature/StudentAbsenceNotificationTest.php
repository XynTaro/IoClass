<?php

use App\Contracts\SmsSender;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\Mother;
use App\Models\ParentGuardian;
use App\Models\Student;
use App\Models\Teacher;
use App\Services\Sms\RecordingSmsSender;
use App\Services\StudentAbsenceNotifier;
use App\Services\StudentAttendanceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->sms = new RecordingSmsSender;
    $this->app->instance(SmsSender::class, $this->sms);
    config(['rfid.device_token' => null]);
});

/**
 * Helper to seed a standard teacher, subject, section, and school year setup.
 *
 * @return array{syId: int, sectId: int, subjId: int, teacher: Teacher, room: int}
 */
function seedAbsenceTestEnvironment(): array
{
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ], 'sect_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_code' => 'ENG8',
        'subj_name' => 'English 8',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Elena',
        'tch_lname' => 'Ramos',
        'tch_email' => 'elena.ramos@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $roomId = DB::table('room')->insertGetId([
        'room_no' => 'R-202',
        'is_deleted' => false,
    ], 'room_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subjId,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    return compact('syId', 'sectId', 'subjId', 'teacher', 'roomId');
}

test('confirming an absent student sends an absence sms to the guardian', function () {
    ['syId' => $syId, 'sectId' => $sectId, 'subjId' => $subjId, 'teacher' => $teacher] = seedAbsenceTestEnvironment();

    $student = Student::create([
        'lrn' => '123456789011',
        'rfid_uid' => 'ABSENTUID01',
        'stu_fname' => 'Carlo',
        'stu_mname' => 'M',
        'stu_lname' => 'Dalisay',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Flora',
        'guardian_lname' => 'Dalisay',
        'contact_number' => '09171112233',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'guardian_id' => $guardian->guardian_id,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.verification.confirm'), [
            'date' => '2026-06-01',
            'subj_id' => $subjId,
            'sect_id' => $sectId,
            'rows' => [
                ['stu_id' => $student->stu_id, 'status' => 'absent'],
            ],
        ])
        ->assertRedirect(route('teacher.verification.index', [
            'date' => '2026-06-01',
            'subj_id' => $subjId,
            'sect_id' => $sectId,
        ]));

    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09171112233')
        ->and($this->sms->messages[0]['message'])->toContain('Carlo M Dalisay')
        ->and($this->sms->messages[0]['message'])->toContain('ABSENT')
        ->and($this->sms->messages[0]['message'])->toContain('English 8')
        ->and($this->sms->messages[0]['message'])->toContain('Diamond');

    $record = DB::table('attendance')
        ->where('stu_id', $student->stu_id)
        ->where('subj_id', $subjId)
        ->whereDate('att_date', '2026-06-01')
        ->first();

    expect($record)->not->toBeNull()
        ->and($record->status)->toBe('absent');
});

test('present or excused students do not receive absence sms', function () {
    ['syId' => $syId, 'sectId' => $sectId, 'subjId' => $subjId, 'teacher' => $teacher] = seedAbsenceTestEnvironment();

    $presentStudent = Student::create([
        'lrn' => '111122223333',
        'stu_fname' => 'Preston',
        'stu_lname' => 'Green',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $excusedStudent = Student::create([
        'lrn' => '444455556666',
        'stu_fname' => 'Eva',
        'stu_lname' => 'White',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Parent',
        'contact_number' => '09189998877',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $presentStudent->stu_id,
        'guardian_id' => $guardian->guardian_id,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $excusedStudent->stu_id,
        'guardian_id' => $guardian->guardian_id,
    ]);

    DB::table('student_section')->insert([
        ['stu_id' => $presentStudent->stu_id, 'sect_id' => $sectId, 'sy_id' => $syId],
        ['stu_id' => $excusedStudent->stu_id, 'sect_id' => $sectId, 'sy_id' => $syId],
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.verification.confirm'), [
            'date' => '2026-06-01',
            'subj_id' => $subjId,
            'sect_id' => $sectId,
            'rows' => [
                ['stu_id' => $presentStudent->stu_id, 'status' => 'present'],
                ['stu_id' => $excusedStudent->stu_id, 'status' => 'excused'],
            ],
        ])
        ->assertRedirect();

    expect($this->sms->messages)->toBeEmpty();
});

test('absence notifier falls back to mother or father contact if guardian is not provided', function () {
    $studentWithMother = Student::create([
        'stu_fname' => 'Mark',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $mother = Mother::create([
        'mother_name' => 'Grace',
        'mother_lname' => 'Cruz',
        'contact_number' => '09201234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $studentWithMother->stu_id,
        'mother_id' => $mother->mother_id,
    ]);

    $studentWithFather = Student::create([
        'stu_fname' => 'Leo',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'Roberto',
        'father_lname' => 'Santos',
        'contact_number' => '09211234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $studentWithFather->stu_id,
        'f_id' => $father->f_id,
    ]);

    $notifier = app(StudentAbsenceNotifier::class);

    $sentMother = $notifier->notify($studentWithMother, '2026-06-01', 'Science 8', 'Diamond');
    $sentFather = $notifier->notify($studentWithFather, '2026-06-01', 'Science 8', 'Diamond');

    expect($sentMother)->toBeTrue()
        ->and($sentFather)->toBeTrue()
        ->and($this->sms->messages)->toHaveCount(2)
        ->and($this->sms->messages[0]['to'])->toBe('09201234567')
        ->and($this->sms->messages[1]['to'])->toBe('09211234567');
});

test('absence notifier does not send duplicate sms for the same student, date, and subject unless forced', function () {
    $student = Student::create([
        'stu_fname' => 'Chloe',
        'stu_lname' => 'Tan',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Arthur',
        'contact_number' => '09191234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'guardian_id' => $guardian->guardian_id,
    ]);

    $notifier = app(StudentAbsenceNotifier::class);

    $first = $notifier->notify($student, '2026-06-01', 'Math 8', 'Diamond');
    $second = $notifier->notify($student, '2026-06-01', 'Math 8', 'Diamond');
    $forced = $notifier->notify($student, '2026-06-01', 'Math 8', 'Diamond', force: true);

    expect($first)->toBeTrue()
        ->and($second)->toBeFalse()
        ->and($forced)->toBeTrue()
        ->and($this->sms->messages)->toHaveCount(2);
});

test('artisan command attendance:notify-absent notifies all absent students', function () {
    ['syId' => $syId, 'sectId' => $sectId] = seedAbsenceTestEnvironment();

    $absentStudent1 = Student::create([
        'lrn' => '777788889991',
        'stu_fname' => 'Ben',
        'stu_lname' => 'Go',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $absentStudent2 = Student::create([
        'lrn' => '777788889992',
        'stu_fname' => 'Joy',
        'stu_lname' => 'Lim',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $presentStudent = Student::create([
        'lrn' => '777788889993',
        'stu_fname' => 'Ken',
        'stu_lname' => 'Sy',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Guardian',
        'contact_number' => '09170001122',
        'is_deleted' => false,
    ]);

    ParentGuardian::create(['stu_par_id' => $absentStudent1->stu_id, 'guardian_id' => $guardian->guardian_id]);
    ParentGuardian::create(['stu_par_id' => $absentStudent2->stu_id, 'guardian_id' => $guardian->guardian_id]);
    ParentGuardian::create(['stu_par_id' => $presentStudent->stu_id, 'guardian_id' => $guardian->guardian_id]);

    DB::table('student_section')->insert([
        ['stu_id' => $absentStudent1->stu_id, 'sect_id' => $sectId, 'sy_id' => $syId],
        ['stu_id' => $absentStudent2->stu_id, 'sect_id' => $sectId, 'sy_id' => $syId],
        ['stu_id' => $presentStudent->stu_id, 'sect_id' => $sectId, 'sy_id' => $syId],
    ]);

    // Present student checked in
    DB::table('attendance')->insert([
        'stu_id' => $presentStudent->stu_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'att_date' => '2026-06-01',
        'status' => 'present',
        'time_in' => '08:00:00',
    ]);

    $this->artisan('attendance:notify-absent', [
        '--date' => '2026-06-01',
        '--force' => true,
    ])
        ->assertSuccessful()
        ->expectsOutputToContain('Found 2 absent student(s). Sending guardian notifications...')
        ->expectsOutputToContain('Notifications sent: 2');

    expect($this->sms->messages)->toHaveCount(2);
});

test('attendance:notify-subject-absences sends specific subject absence alerts to guardians', function () {
    ['syId' => $syId, 'sectId' => $sectId, 'subjId' => $subjId] = seedAbsenceTestEnvironment();

    $student = Student::create([
        'lrn' => '777788889994',
        'stu_fname' => 'Rico',
        'stu_lname' => 'Yan',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Mrs. Yan',
        'contact_number' => '09175556677',
        'is_deleted' => false,
    ]);

    ParentGuardian::create(['stu_par_id' => $student->stu_id, 'guardian_id' => $guardian->guardian_id]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    // Schedule is Monday 09:00 - 10:00 (seeded in seedAbsenceTestEnvironment: English 8)
    // Run command at 12:00 PM for June 1, 2026 (a Monday)
    $this->artisan('attendance:notify-subject-absences', [
        '--date' => '2026-06-01',
        '--before' => '12:00',
    ])
        ->assertSuccessful()
        ->expectsOutputToContain('sent 1 notification(s)');

    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09175556677')
        ->and($this->sms->messages[0]['message'])->toContain('was marked ABSENT in English 8 (Diamond)');

    // Ensure an absent attendance record was logged in the database
    expect(DB::table('attendance')
        ->where('stu_id', $student->stu_id)
        ->where('subj_id', $subjId)
        ->where('att_date', '2026-06-01')
        ->where('status', 'absent')
        ->exists()
    )->toBeTrue();
});

test('student tapping out of another subject alerts guardian of earlier missed subject', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Sapphire',
        'gr_level' => 'Grade 9',
        'is_deleted' => false,
    ], 'sect_id');

    $subj1Id = DB::table('subject')->insertGetId([
        'subj_code' => 'MATH9',
        'subj_name' => 'Math 9',
        'gr_level' => 'Grade 9',
        'is_deleted' => false,
    ], 'subj_id');

    $subj2Id = DB::table('subject')->insertGetId([
        'subj_code' => 'SCI9',
        'subj_name' => 'Science 9',
        'gr_level' => 'Grade 9',
        'is_deleted' => false,
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_fname' => 'John',
        'tch_lname' => 'Doe',
        'tch_email' => 'john.doe@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $roomId = DB::table('room')->insertGetId(['room_no' => 'R-301', 'is_deleted' => false], 'room_id');

    // Subject 1: Math 07:00 - 08:00 on Monday
    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subj1Id,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '07:00:00',
        'end_time' => '08:00:00',
    ]);

    // Subject 2: Science 08:00 - 09:00 on Monday
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

    $student = Student::create([
        'rfid_uid' => 'STUDENT-MISSED-MATH',
        'stu_fname' => 'Leo',
        'stu_lname' => 'Valdez',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Mrs. Valdez',
        'contact_number' => '09191234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create(['stu_par_id' => $student->stu_id, 'guardian_id' => $guardian->guardian_id]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    // Student SKIPPED Math (07:00 - 08:00).
    // Now at 08:10 (Monday June 1, 2026), student enters Science and taps in
    Carbon::setTestNow('2026-06-01 08:10:00');

    $sessionScience = [
        'tch_id' => $teacher->tch_id,
        'tch_name' => 'John Doe',
        'sect_id' => $sectId,
        'sect_name' => 'Sapphire',
        'subj_id' => $subj2Id,
        'subj_name' => 'Science 9',
        'schedule_id' => $sched2Id,
        'started_at' => now()->timestamp,
    ];

    $attendanceService = app(StudentAttendanceService::class);
    $attendanceService->recordForStudent($student, null, $sessionScience);

    // No SMS sent yet at tap-in
    expect($this->sms->messages)->toBeEmpty();

    // At 09:00, student taps out of Science to go home
    Carbon::setTestNow('2026-06-01 09:00:00');
    $attendanceService->recordForStudent($student, null, $sessionScience);

    // Tapping out detected missed Math! Guardian receives SMS for Math 9
    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09191234567')
        ->and($this->sms->messages[0]['message'])->toContain('was marked ABSENT in Math 9 (Sapphire)');

    Carbon::setTestNow();
});
