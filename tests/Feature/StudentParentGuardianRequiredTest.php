<?php

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\Mother;
use App\Models\ParentGuardian;
use App\Models\Section;
use App\Models\Student;
use App\Services\StudentAbsenceNotifier;
use App\Services\StudentRfidRegistrationNotifier;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::factory()->create();
    $this->section = Section::create([
        'sect_name' => 'Grade 7 - Diamond',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);
});

test('adding a student with father, mother, and main contact succeeds', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Juan',
        'stu_lname' => 'Dela Cruz',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0001',
        'father_is_na' => false,
        'father_name' => 'Pedro',
        'father_lname' => 'Dela Cruz',
        'father_contact_number' => '09123456781',
        'mother_is_na' => false,
        'mother_name' => 'Maria',
        'mother_lname' => 'Dela Cruz',
        'mother_contact_number' => '09123456782',
        'main_contact' => 'father',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0001')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->not->toBeNull()
        ->and($link->mother_id)->not->toBeNull()
        ->and($link->guardian_id)->toBeNull()
        ->and($link->main_contact)->toBe('father');

    $father = Father::find($link->f_id);
    expect($father->father_name)->toBe('Pedro');

    $mother = Mother::find($link->mother_id);
    expect($mother->mother_name)->toBe('Maria');
});

test('adding a student with N/A father and mother succeeds without creating father record', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Jose',
        'stu_lname' => 'Rizal',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0002',
        'father_is_na' => true,
        'mother_is_na' => false,
        'mother_name' => 'Teodora',
        'mother_lname' => 'Alonso',
        'mother_contact_number' => '09123456783',
        'main_contact' => 'mother',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0002')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->toBeNull()
        ->and($link->mother_id)->not->toBeNull()
        ->and($link->main_contact)->toBe('mother');
});

test('adding a student with father and N/A mother succeeds without creating mother record', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Andres',
        'stu_lname' => 'Bonifacio',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0003',
        'father_is_na' => false,
        'father_name' => 'Santiago',
        'father_lname' => 'Bonifacio',
        'father_contact_number' => '09123456784',
        'mother_is_na' => true,
        'main_contact' => 'father',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0003')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->not->toBeNull()
        ->and($link->mother_id)->toBeNull()
        ->and($link->main_contact)->toBe('father');
});

test('missing father details when father is not marked N/A fails validation', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Emilio',
        'stu_lname' => 'Aguinaldo',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0004',
        'father_is_na' => false,
        'mother_is_na' => true,
        'main_contact' => 'father',
    ]);

    $response->assertSessionHasErrors([
        'father_name' => 'Father first name is required.',
        'father_lname' => 'Father last name is required.',
        'father_contact_number' => 'Father contact number is required.',
    ]);
});

test('missing mother details when mother is not marked N/A fails validation', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Apolinario',
        'stu_lname' => 'Mabini',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0005',
        'father_is_na' => true,
        'mother_is_na' => false,
        'main_contact' => 'mother',
    ]);

    $response->assertSessionHasErrors([
        'mother_name' => 'Mother first name is required.',
        'mother_lname' => 'Mother last name is required.',
        'mother_contact_number' => 'Mother contact number is required.',
    ]);
});

test('both parents marked N/A requires guardian details', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Marcelo',
        'stu_lname' => 'Del Pilar',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0006',
        'father_is_na' => true,
        'mother_is_na' => true,
        'main_contact' => 'guardian',
    ]);

    $response->assertSessionHasErrors([
        'guardian_name' => 'Guardian first name is required when both parents are marked N/A.',
        'guardian_lname' => 'Guardian last name is required when both parents are marked N/A.',
        'guardian_contact_number' => 'Guardian contact number is required when both parents are marked N/A.',
    ]);
});

test('both parents marked N/A with valid guardian succeeds and creates guardian record', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Melchora',
        'stu_lname' => 'Aquino',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0007',
        'father_is_na' => true,
        'mother_is_na' => true,
        'guardian_name' => 'Teresa',
        'guardian_lname' => 'Magbanua',
        'guardian_contact_number' => '09123456785',
        'main_contact' => 'guardian',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0007')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->toBeNull()
        ->and($link->mother_id)->toBeNull()
        ->and($link->guardian_id)->not->toBeNull()
        ->and($link->main_contact)->toBe('guardian');

    $guardian = Guardian::find($link->guardian_id);
    expect($guardian)->not->toBeNull()
        ->and($guardian->name)->toBe('Teresa')
        ->and($guardian->guardian_lname)->toBe('Magbanua')
        ->and($guardian->contact_number)->toBe('09123456785');
});

test('adding student with parents and guardian stores all records and selected main contact', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Gabriela',
        'stu_lname' => 'Silang',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0008',
        'father_is_na' => false,
        'father_name' => 'Diego',
        'father_lname' => 'Silang',
        'father_contact_number' => '09123456786',
        'mother_is_na' => false,
        'mother_name' => 'Maria',
        'mother_lname' => 'Carino',
        'mother_contact_number' => '09123456787',
        'guardian_name' => 'Nicolas',
        'guardian_lname' => 'Carino',
        'guardian_contact_number' => '09123456788',
        'main_contact' => 'mother',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0008')->first();
    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->not->toBeNull()
        ->and($link->mother_id)->not->toBeNull()
        ->and($link->guardian_id)->not->toBeNull()
        ->and($link->main_contact)->toBe('mother');
});

test('main contact is required when adding a student', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Antonio',
        'stu_lname' => 'Luna',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0009',
        'father_is_na' => false,
        'father_name' => 'Joaquin',
        'father_lname' => 'Luna',
        'father_contact_number' => '09123456786',
        'mother_is_na' => false,
        'mother_name' => 'Laureana',
        'mother_lname' => 'Novicio',
        'mother_contact_number' => '09123456787',
    ]);

    $response->assertSessionHasErrors([
        'main_contact' => 'Please select a main contact (Father, Mother, or Guardian).',
    ]);
});

test('parent marked as N/A cannot be selected as main contact', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Gregorio',
        'stu_lname' => 'Del Pilar',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0010',
        'father_is_na' => true,
        'mother_is_na' => false,
        'mother_name' => 'Felipa',
        'mother_lname' => 'Sempio',
        'mother_contact_number' => '09123456787',
        'main_contact' => 'father',
    ]);

    $response->assertSessionHasErrors([
        'main_contact' => 'Father cannot be the main contact when marked as N/A.',
    ]);
});

test('sms notifiers prioritize the selected main contact phone number', function () {
    $student = Student::create([
        'stu_fname' => 'Miguel',
        'stu_lname' => 'Malvar',
        'rfid_uid' => 'STUDENT0011',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'Maximo',
        'father_lname' => 'Malvar',
        'contact_number' => '09171112222',
        'is_deleted' => false,
    ]);

    $mother = Mother::create([
        'mother_name' => 'Tiburia',
        'mother_lname' => 'Carpio',
        'contact_number' => '09182223333',
        'is_deleted' => false,
    ]);

    $guardian = Guardian::create([
        'name' => 'Paula',
        'guardian_lname' => 'Malvar',
        'contact_number' => '09193334444',
        'is_deleted' => false,
    ]);

    $link = ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'f_id' => $father->f_id,
        'mother_id' => $mother->mother_id,
        'guardian_id' => $guardian->guardian_id,
        'main_contact' => 'father',
    ]);

    $fakeSms = new class implements SmsSender
    {
        public function send(string $phoneNumber, string $message): void {}
    };

    $rfidNotifier = new StudentRfidRegistrationNotifier($fakeSms);
    $absenceNotifier = new StudentAbsenceNotifier($fakeSms);

    expect($rfidNotifier->guardianPhone($student))->toBe('09171112222');
    expect($absenceNotifier->guardianPhone($student))->toBe('09171112222');

    $link->update(['main_contact' => 'mother']);
    expect($rfidNotifier->guardianPhone($student))->toBe('09182223333');
    expect($absenceNotifier->guardianPhone($student))->toBe('09182223333');

    $link->update(['main_contact' => 'guardian']);
    expect($rfidNotifier->guardianPhone($student))->toBe('09193334444');
    expect($absenceNotifier->guardianPhone($student))->toBe('09193334444');
});
