<?php

use App\Models\Admin;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\Mother;
use App\Models\ParentGuardian;
use App\Models\Section;
use App\Models\Student;
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

test('adding a student with living father and mother succeeds', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Juan',
        'stu_lname' => 'Dela Cruz',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0001',
        'father_is_deceased' => false,
        'father_name' => 'Pedro',
        'father_lname' => 'Dela Cruz',
        'father_contact_number' => '09123456781',
        'mother_is_deceased' => false,
        'mother_name' => 'Maria',
        'mother_lname' => 'Dela Cruz',
        'mother_contact_number' => '09123456782',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0001')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->not->toBeNull()
        ->and($link->mother_id)->not->toBeNull()
        ->and($link->guardian_id)->toBeNull();

    $father = Father::find($link->f_id);
    expect($father->father_name)->toBe('Pedro');

    $mother = Mother::find($link->mother_id);
    expect($mother->mother_name)->toBe('Maria');
});

test('adding a student with deceased father and living mother succeeds without creating father record', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Jose',
        'stu_lname' => 'Rizal',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0002',
        'father_is_deceased' => true,
        'mother_is_deceased' => false,
        'mother_name' => 'Teodora',
        'mother_lname' => 'Alonso',
        'mother_contact_number' => '09123456783',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0002')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->toBeNull()
        ->and($link->mother_id)->not->toBeNull();
});

test('adding a student with living father and deceased mother succeeds without creating mother record', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Andres',
        'stu_lname' => 'Bonifacio',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0003',
        'father_is_deceased' => false,
        'father_name' => 'Santiago',
        'father_lname' => 'Bonifacio',
        'father_contact_number' => '09123456784',
        'mother_is_deceased' => true,
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0003')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->not->toBeNull()
        ->and($link->mother_id)->toBeNull();
});

test('missing father details when father is not deceased fails validation', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Emilio',
        'stu_lname' => 'Aguinaldo',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0004',
        'father_is_deceased' => false,
        'mother_is_deceased' => true,
    ]);

    $response->assertSessionHasErrors([
        'father_name' => 'Father first name is required.',
        'father_lname' => 'Father last name is required.',
        'father_contact_number' => 'Father contact number is required.',
    ]);
});

test('missing mother details when mother is not deceased fails validation', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Apolinario',
        'stu_lname' => 'Mabini',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0005',
        'father_is_deceased' => true,
        'mother_is_deceased' => false,
    ]);

    $response->assertSessionHasErrors([
        'mother_name' => 'Mother first name is required.',
        'mother_lname' => 'Mother last name is required.',
        'mother_contact_number' => 'Mother contact number is required.',
    ]);
});

test('both parents deceased requires guardian details', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Marcelo',
        'stu_lname' => 'Del Pilar',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0006',
        'father_is_deceased' => true,
        'mother_is_deceased' => true,
    ]);

    $response->assertSessionHasErrors([
        'guardian_name' => 'Guardian first name is required when both parents are deceased.',
        'guardian_lname' => 'Guardian last name is required when both parents are deceased.',
        'guardian_contact_number' => 'Guardian contact number is required when both parents are deceased.',
    ]);
});

test('both parents deceased with valid guardian succeeds and creates guardian record', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Melchora',
        'stu_lname' => 'Aquino',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0007',
        'father_is_deceased' => true,
        'mother_is_deceased' => true,
        'guardian_name' => 'Teresa',
        'guardian_lname' => 'Magbanua',
        'guardian_contact_number' => '09123456785',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0007')->first();
    expect($student)->not->toBeNull();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->toBeNull()
        ->and($link->mother_id)->toBeNull()
        ->and($link->guardian_id)->not->toBeNull();

    $guardian = Guardian::find($link->guardian_id);
    expect($guardian)->not->toBeNull()
        ->and($guardian->name)->toBe('Teresa')
        ->and($guardian->guardian_lname)->toBe('Magbanua')
        ->and($guardian->contact_number)->toBe('09123456785');
});

test('adding student with living parents and optional guardian stores all records', function () {
    $response = $this->actingAs($this->admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Gabriela',
        'stu_lname' => 'Silang',
        'sect_id' => $this->section->sect_id,
        'rfid_uid' => 'STUDENT0008',
        'father_is_deceased' => false,
        'father_name' => 'Diego',
        'father_lname' => 'Silang',
        'father_contact_number' => '09123456786',
        'mother_is_deceased' => false,
        'mother_name' => 'Maria',
        'mother_lname' => 'Carino',
        'mother_contact_number' => '09123456787',
        'guardian_name' => 'Nicolas',
        'guardian_lname' => 'Carino',
        'guardian_contact_number' => '09123456788',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student = Student::where('rfid_uid', 'STUDENT0008')->first();
    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->not->toBeNull()
        ->and($link->mother_id)->not->toBeNull()
        ->and($link->guardian_id)->not->toBeNull();
});
