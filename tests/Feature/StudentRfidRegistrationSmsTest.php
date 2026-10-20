<?php

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\Mother;
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
            'mother_name' => 'Juana',
            'mother_lname' => 'Cruz',
            'mother_contact_number' => '09191234567',
        ])
        ->assertRedirect(route('admin.student.index'));

    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09171234567')
        ->and($this->sms->messages[0]['message'])->toContain('IoClass Alert:')
        ->and($this->sms->messages[0]['message'])->toContain('Juan Dela Cruz')
        ->and($this->sms->messages[0]['message'])->toContain('RFIDABC123')
        ->and($this->sms->messages[0]['message'])->toContain('LRN: 123456789012');

    expect(DB::table('student_section')->where('sy_id', $syId)->where('sect_id', $sectId)->exists())->toBeTrue();
});

test('rfid registration sms falls back to mother or father when guardian is not provided', function () {
    $studentWithMother = Student::create([
        'rfid_uid' => 'MOMUID001',
        'lrn' => '109876543210',
        'stu_fname' => 'Ana',
        'stu_lname' => 'Reyes',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $mother = Mother::create([
        'mother_name' => 'Juana',
        'mother_lname' => 'Reyes',
        'contact_number' => '09191234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $studentWithMother->stu_id,
        'mother_id' => $mother->mother_id,
    ]);

    $studentWithFather = Student::create([
        'rfid_uid' => 'DADUID001',
        'lrn' => '109876543211',
        'stu_fname' => 'Pedro',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'Roberto',
        'father_lname' => 'Santos',
        'contact_number' => '09181234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $studentWithFather->stu_id,
        'f_id' => $father->f_id,
    ]);

    $notifier = app(StudentRfidRegistrationNotifier::class);

    $sentMother = $notifier->notify($studentWithMother);
    $sentFather = $notifier->notify($studentWithFather);

    expect($sentMother)->toBeTrue()
        ->and($sentFather)->toBeTrue()
        ->and($this->sms->messages)->toHaveCount(2)
        ->and($this->sms->messages[0]['to'])->toBe('09191234567')
        ->and($this->sms->messages[0]['message'])->toContain('IoClass Alert:')
        ->and($this->sms->messages[0]['message'])->toContain('Ana Reyes')
        ->and($this->sms->messages[0]['message'])->toContain('MOMUID001')
        ->and($this->sms->messages[1]['to'])->toBe('09181234567')
        ->and($this->sms->messages[1]['message'])->toContain('IoClass Alert:')
        ->and($this->sms->messages[1]['message'])->toContain('Pedro Santos')
        ->and($this->sms->messages[1]['message'])->toContain('DADUID001');
});

test('rfid registration sms is skipped when no contact number is provided', function () {
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

    $sent = app(StudentRfidRegistrationNotifier::class)->notify($student);

    expect($sent)->toBeFalse()
        ->and($this->sms->messages)->toBeEmpty();
});

test('rfid registration sms falls back to mother when guardian has no contact number', function () {
    $student = Student::create([
        'rfid_uid' => 'FALLBACK01',
        'stu_fname' => 'Carlo',
        'stu_lname' => 'Mendoza',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Silent',
        'guardian_lname' => 'Guardian',
        'contact_number' => null,
        'is_deleted' => false,
    ]);

    $mother = Mother::create([
        'mother_name' => 'Elena',
        'mother_lname' => 'Mendoza',
        'contact_number' => '09201234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'guardian_id' => $guardian->guardian_id,
        'mother_id' => $mother->mother_id,
    ]);

    $sent = app(StudentRfidRegistrationNotifier::class)->notify($student);

    expect($sent)->toBeTrue()
        ->and($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09201234567')
        ->and($this->sms->messages[0]['message'])->toContain('Carlo Mendoza')
        ->and($this->sms->messages[0]['message'])->toContain('FALLBACK01');
});

test('updating a student rfid uid sends a registration sms to the parent or guardian', function () {
    $admin = Admin::factory()->create();

    $student = Student::create([
        'rfid_uid' => 'OLDUID0001',
        'stu_fname' => 'Liza',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'Ramon',
        'father_lname' => 'Santos',
        'contact_number' => '09221234567',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'f_id' => $father->f_id,
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
        ->and($this->sms->messages[0]['message'])->toContain('IoClass Alert:')
        ->and($this->sms->messages[0]['message'])->toContain('NEWUID0001')
        ->and($this->sms->messages[0]['message'])->toContain('Student ID: '.$student->stu_id);
});
