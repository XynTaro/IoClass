<?php

use App\Models\Address;
use App\Models\Admin;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\Mother;
use App\Models\ParentGuardian;
use App\Models\Section;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::factory()->create();
    $this->sectionA = Section::create([
        'sect_name' => 'Grade 7 - Sapphire',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);
    $this->sectionB = Section::create([
        'sect_name' => 'Grade 7 - Emerald',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);
    $this->syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2026-2027',
        'is_active' => true,
    ]);
});

test('admin address can be updated or created on edit', function () {
    $targetAdmin = Admin::factory()->create([
        'fname' => 'Alice',
        'lname' => 'Guillermo',
        'email' => 'alice@example.com',
        'add_id' => null,
    ]);

    $response = $this->actingAs($this->admin, 'admin')->put(route('admin.admin.update', $targetAdmin->admin_id), [
        'fname' => 'Alice',
        'lname' => 'Guillermo',
        'email' => 'alice@example.com',
        'contact_number' => '09171234567',
        'region' => 'REGION X',
        'province' => 'Bukidnon',
        'municipality' => 'Malaybalay',
        'barangay' => 'Casisang',
    ]);

    $response->assertRedirect(route('admin.admin.index'));
    $response->assertSessionHasNoErrors();

    $targetAdmin->refresh();
    expect($targetAdmin->add_id)->not->toBeNull();

    $address = Address::find($targetAdmin->add_id);
    expect($address->region)->toBe('REGION X')
        ->and($address->province)->toBe('Bukidnon')
        ->and($address->municipality)->toBe('Malaybalay')
        ->and($address->barangay)->toBe('Casisang');

    // Updating existing address
    $response2 = $this->actingAs($this->admin, 'admin')->put(route('admin.admin.update', $targetAdmin->admin_id), [
        'fname' => 'Alice',
        'lname' => 'Guillermo',
        'email' => 'alice@example.com',
        'contact_number' => '09171234567',
        'region' => 'REGION X',
        'province' => 'Bukidnon',
        'municipality' => 'Valencia',
        'barangay' => 'Poblacion',
    ]);

    $response2->assertSessionHasNoErrors();
    $address->refresh();
    expect($address->municipality)->toBe('Valencia')
        ->and($address->barangay)->toBe('Poblacion');
});

test('teacher address can be updated or created on edit', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Maria',
        'tch_lname' => 'Santos',
        'tch_email' => 'maria.santos@example.com',
        'contact_number' => '09181234567',
        'tch_pw' => bcrypt('password123'),
        'tch_rfid_uid' => 'TCHRFID001',
        'master_card' => 'TCHMASTER001',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($this->admin, 'admin')->put(route('admin.teacher.update', $teacher->tch_id), [
        'tch_fname' => 'Maria',
        'tch_lname' => 'Santos',
        'tch_email' => 'maria.santos@example.com',
        'contact_number' => '09181234567',
        'tch_rfid_uid' => 'TCHRFID001',
        'master_card' => 'TCHMASTER001',
        'region' => 'REGION XI',
        'province' => 'Davao del Sur',
        'municipality' => 'Davao City',
        'barangay' => 'Buhangin',
    ]);

    $response->assertRedirect(route('admin.teacher.index'));
    $response->assertSessionHasNoErrors();

    $teacher->refresh();
    expect($teacher->add_id)->not->toBeNull();

    $address = Address::find($teacher->add_id);
    expect($address->region)->toBe('REGION XI')
        ->and($address->province)->toBe('Davao del Sur')
        ->and($address->municipality)->toBe('Davao City')
        ->and($address->barangay)->toBe('Buhangin');
});

test('student address and section can be updated on edit', function () {
    $student = Student::create([
        'stu_fname' => 'Carlos',
        'stu_lname' => 'Yulo',
        'rfid_uid' => 'STURFID001',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $student->stu_id,
        'sect_id' => $this->sectionA->sect_id,
        'sy_id' => $this->syId,
    ]);

    $response = $this->actingAs($this->admin, 'admin')->put(route('admin.student.update', $student->stu_id), [
        'stu_fname' => 'Carlos',
        'stu_lname' => 'Yulo',
        'rfid_uid' => 'STURFID001',
        'sect_id' => $this->sectionB->sect_id,
        'region' => 'NCR',
        'province' => '',
        'municipality' => 'Manila',
        'barangay' => 'Malate',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $student->refresh();
    expect($student->add_id)->not->toBeNull();

    $address = Address::find($student->add_id);
    expect($address->region)->toBe('NCR')
        ->and($address->municipality)->toBe('Manila')
        ->and($address->barangay)->toBe('Malate');

    $enrollment = DB::table('student_section')
        ->where('stu_id', $student->stu_id)
        ->where('sy_id', $this->syId)
        ->first();

    expect($enrollment)->not->toBeNull()
        ->and($enrollment->sect_id)->toBe($this->sectionB->sect_id);
});

test('student parent details can be updated on edit', function () {
    $student = Student::create([
        'stu_fname' => 'Liza',
        'stu_lname' => 'Soberano',
        'rfid_uid' => 'STURFID002',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'John',
        'father_lname' => 'Soberano',
        'contact_number' => '09191112233',
        'is_deleted' => false,
    ]);

    $mother = Mother::create([
        'mother_name' => 'Jacqlyn',
        'mother_lname' => 'Nguyen',
        'contact_number' => '09192223344',
        'is_deleted' => false,
    ]);

    ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'f_id' => $father->f_id,
        'mother_id' => $mother->mother_id,
    ]);

    $response = $this->actingAs($this->admin, 'admin')->put(route('admin.student.update', $student->stu_id), [
        'stu_fname' => 'Liza',
        'stu_lname' => 'Soberano',
        'rfid_uid' => 'STURFID002',
        'father_is_deceased' => false,
        'father_name' => 'Jonathan',
        'father_lname' => 'Soberano',
        'father_contact_number' => '09195556677',
        'mother_is_deceased' => false,
        'mother_name' => 'Jacqueline',
        'mother_lname' => 'Nguyen',
        'mother_contact_number' => '09198889900',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $father->refresh();
    expect($father->father_name)->toBe('Jonathan')
        ->and($father->contact_number)->toBe('09195556677');

    $mother->refresh();
    expect($mother->mother_name)->toBe('Jacqueline')
        ->and($mother->contact_number)->toBe('09198889900');
});

test('student parent can be marked deceased and unlinked on edit', function () {
    $student = Student::create([
        'stu_fname' => 'Danilo',
        'stu_lname' => 'Reyes',
        'rfid_uid' => 'STURFID003',
        'is_deleted' => false,
    ]);

    $father = Father::create([
        'father_name' => 'Danilo',
        'father_lname' => 'Reyes',
        'contact_number' => '09193334455',
        'is_deleted' => false,
    ]);

    $mother = Mother::create([
        'mother_name' => 'Corazon',
        'mother_lname' => 'Reyes',
        'contact_number' => '09194445566',
        'is_deleted' => false,
    ]);

    $link = ParentGuardian::create([
        'stu_par_id' => $student->stu_id,
        'f_id' => $father->f_id,
        'mother_id' => $mother->mother_id,
    ]);

    $response = $this->actingAs($this->admin, 'admin')->put(route('admin.student.update', $student->stu_id), [
        'stu_fname' => 'Danilo',
        'stu_lname' => 'Reyes',
        'rfid_uid' => 'STURFID003',
        'father_is_deceased' => true,
        'mother_is_deceased' => false,
        'mother_name' => 'Corazon',
        'mother_lname' => 'Reyes',
        'mother_contact_number' => '09194445566',
    ]);

    $response->assertRedirect(route('admin.student.index'));
    $response->assertSessionHasNoErrors();

    $link->refresh();
    expect($link->f_id)->toBeNull()
        ->and($link->mother_id)->not->toBeNull();
});

test('student with both parents marked deceased requires guardian on edit', function () {
    $student = Student::create([
        'stu_fname' => 'Anna',
        'stu_lname' => 'Cruz',
        'rfid_uid' => 'STURFID004',
        'is_deleted' => false,
    ]);

    // Validation fails if both deceased without guardian
    $response = $this->actingAs($this->admin, 'admin')->put(route('admin.student.update', $student->stu_id), [
        'stu_fname' => 'Anna',
        'stu_lname' => 'Cruz',
        'rfid_uid' => 'STURFID004',
        'father_is_deceased' => true,
        'mother_is_deceased' => true,
    ]);

    $response->assertSessionHasErrors(['guardian_name', 'guardian_lname', 'guardian_contact_number']);

    // Succeeds when guardian is supplied
    $response2 = $this->actingAs($this->admin, 'admin')->put(route('admin.student.update', $student->stu_id), [
        'stu_fname' => 'Anna',
        'stu_lname' => 'Cruz',
        'rfid_uid' => 'STURFID004',
        'father_is_deceased' => true,
        'mother_is_deceased' => true,
        'guardian_name' => 'Clara',
        'guardian_lname' => 'Cruz',
        'guardian_contact_number' => '09199998877',
    ]);

    $response2->assertRedirect(route('admin.student.index'));
    $response2->assertSessionHasNoErrors();

    $link = ParentGuardian::where('stu_par_id', $student->stu_id)->first();
    expect($link)->not->toBeNull()
        ->and($link->f_id)->toBeNull()
        ->and($link->mother_id)->toBeNull()
        ->and($link->guardian_id)->not->toBeNull();

    $guardian = Guardian::find($link->guardian_id);
    expect($guardian->name)->toBe('Clara')
        ->and($guardian->guardian_lname)->toBe('Cruz')
        ->and($guardian->contact_number)->toBe('09199998877');
});
