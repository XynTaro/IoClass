<?php

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\ParentGuardian;
use App\Models\Student;
use App\Services\Sms\RecordingSmsSender;
use App\Services\StudentRfidRegistrationNotifier;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->sms = new RecordingSmsSender;
    $this->app->instance(SmsSender::class, $this->sms);
});

test('adding a student sends an rfid registration sms to the guardian', function () {
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

    $this->withoutVite()
        ->actingAs($admin, 'admin')
        ->post(route('admin.student.store'), [
            'lrn' => '123456789012',
            'stu_fname' => 'Juan',
            'stu_mname' => 'Dela',
            'stu_lname' => 'Cruz',
            'rfid_uid' => 'RFIDABC123',
            'status' => 'active',
            'sect_id' => $sectId,
            'guardian_name' => 'Maria',
            'guardian_lname' => 'Cruz',
            'guardian_contact_number' => '09171234567',
            'father_name' => 'Pedro',
            'father_lname' => 'Cruz',
            'father_contact_number' => '09181234567',
        ])
        ->assertRedirect(route('admin.student.index'));

    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09171234567')
        ->and($this->sms->messages[0]['message'])->toContain('Juan Dela Cruz')
        ->and($this->sms->messages[0]['message'])->toContain('RFIDABC123')
        ->and($this->sms->messages[0]['message'])->toContain('LRN: 123456789012');

    expect(DB::table('student_section')->where('sy_id', $syId)->where('sect_id', $sectId)->exists())->toBeTrue();
});

test('rfid registration sms is not sent to father or mother', function () {
    $student = Student::create([
        'rfid_uid' => 'NOGUARD001',
        'lrn' => '109876543210',
        'stu_fname' => 'Ana',
        'stu_lname' => 'Reyes',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'Pedro',
        'father_lname' => 'Reyes',
        'contact_number' => '09181234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'f_id' => $father->f_id,
    ]);

    app(StudentRfidRegistrationNotifier::class)->notify($student);

    expect($this->sms->messages)->toBeEmpty();
});

test('rfid registration sms is skipped when guardian has no contact number', function () {
    $student = Student::create([
        'rfid_uid' => 'NOCONTACT1',
        'stu_fname' => 'No',
        'stu_lname' => 'Contact',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Silent',
        'guardian_lname' => 'Guardian',
        'contact_number' => null,
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'guardian_id' => $guardian->guardian_id,
    ]);

    app(StudentRfidRegistrationNotifier::class)->notify($student);

    expect($this->sms->messages)->toBeEmpty();
});

test('updating a student rfid uid sends a registration sms only to the guardian', function () {
    $admin = Admin::factory()->create();

    $student = Student::create([
        'rfid_uid' => 'OLDUID0001',
        'stu_fname' => 'Liza',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Rosa',
        'guardian_lname' => 'Santos',
        'contact_number' => '09221234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'guardian_id' => $guardian->guardian_id,
    ]);

    $this->withoutVite()
        ->actingAs($admin, 'admin')
        ->put(route('admin.student.update', $student->stu_id), [
            'stu_fname' => 'Liza',
            'stu_lname' => 'Santos',
            'rfid_uid' => 'NEWUID0001',
            'status' => 'active',
        ])
        ->assertRedirect(route('admin.student.index'));

    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09221234567')
        ->and($this->sms->messages[0]['message'])->toContain('NEWUID0001')
        ->and($this->sms->messages[0]['message'])->toContain('Student ID: '.$student->stu_id);
});
