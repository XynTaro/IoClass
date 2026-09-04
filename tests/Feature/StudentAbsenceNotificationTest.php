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
