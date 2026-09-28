<?php

use App\Models\Admin;
use App\Models\Building;
use App\Models\Section;
use App\Models\Student;
use App\Models\Subject;
use App\Models\Teacher;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('adding student with same first, middle, and last name fails validation with registered error', function () {
    $admin = Admin::factory()->create();
    $section = Section::create([
        'sect_name' => 'Grade 7 - Sapphire',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);

    Student::create([
        'stu_fname' => 'John',
        'stu_mname' => 'Michael',
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000001',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'John',
        'stu_mname' => 'Michael',
        'stu_lname' => 'Doe',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1000000002',
    ]);

    $response->assertSessionHasErrors([
        'stu_fname' => 'This student is already registered.',
    ]);
});

test('adding student with same first and last name without middle name fails validation', function () {
    $admin = Admin::factory()->create();
    $section = Section::create([
        'sect_name' => 'Grade 7 - Sapphire',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);

    Student::create([
        'stu_fname' => 'John',
        'stu_mname' => null,
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000003',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'john',
        'stu_mname' => '',
        'stu_lname' => 'doe',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1000000004',
    ]);

    $response->assertSessionHasErrors([
        'stu_fname' => 'This student is already registered.',
    ]);
});

test('adding student with same last name but different first name succeeds', function () {
    $admin = Admin::factory()->create();
    $section = Section::create([
        'sect_name' => 'Grade 7 - Sapphire',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);

    Student::create([
        'stu_fname' => 'John',
        'stu_mname' => 'Michael',
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000005',
        'is_deleted' => false,
    ]);

    // Same last name Doe, different first name Jane
    $response = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Jane',
        'stu_mname' => 'Michael',
        'stu_lname' => 'Doe',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1000000006',
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('student', [
        'stu_fname' => 'Jane',
        'stu_lname' => 'Doe',
    ]);
});

test('adding student with same first and last name but different middle name succeeds', function () {
    $admin = Admin::factory()->create();
    $section = Section::create([
        'sect_name' => 'Grade 7 - Sapphire',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);

    Student::create([
        'stu_fname' => 'John',
        'stu_mname' => 'Michael',
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000007',
        'is_deleted' => false,
    ]);

    // Same first and last name, different middle name Robert
    $response = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'John',
        'stu_mname' => 'Robert',
        'stu_lname' => 'Doe',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1000000008',
    ]);

    $response->assertSessionHasNoErrors();
    $this->assertDatabaseHas('student', [
        'stu_fname' => 'John',
        'stu_mname' => 'Robert',
        'stu_lname' => 'Doe',
    ]);
});

test('updating student allows keeping own name but blocks duplicate of another student', function () {
    $admin = Admin::factory()->create();

    $student1 = Student::create([
        'stu_fname' => 'John',
        'stu_mname' => null,
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000009',
        'is_deleted' => false,
    ]);

    $student2 = Student::create([
        'stu_fname' => 'Jane',
        'stu_mname' => null,
        'stu_lname' => 'Smith',
        'rfid_uid' => '1000000010',
        'is_deleted' => false,
    ]);

    // Updating student1 with their own name succeeds
    $selfUpdateResponse = $this->actingAs($admin, 'admin')->put(route('admin.student.update', $student1->stu_id), [
        'stu_fname' => 'John',
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000009',
    ]);
    $selfUpdateResponse->assertSessionHasNoErrors();

    // Updating student2 with student1's name fails
    $duplicateUpdateResponse = $this->actingAs($admin, 'admin')->put(route('admin.student.update', $student2->stu_id), [
        'stu_fname' => 'John',
        'stu_lname' => 'Doe',
        'rfid_uid' => '1000000010',
    ]);
    $duplicateUpdateResponse->assertSessionHasErrors([
        'stu_fname' => 'This student is already registered.',
    ]);
});

test('adding teacher with duplicate full name fails validation', function () {
    $admin = Admin::factory()->create();

    Teacher::create([
        'tch_fname' => 'Maria',
        'tch_mname' => 'Santos',
        'tch_lname' => 'Cruz',
        'tch_email' => 'maria.cruz@school.test',
        'is_deleted' => false,
    ]);

    // Same name fails
    $response = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_rfid_uid' => 'TEACH-DUP-001',
        'tch_fname' => 'maria',
        'tch_mname' => 'santos',
        'tch_lname' => 'cruz',
        'tch_email' => 'maria.other@school.test',
        'contact_number' => '09123456789',
    ]);

    $response->assertSessionHasErrors([
        'tch_fname' => 'This teacher is already registered.',
    ]);

    // Different first name succeeds
    $differentFnameResponse = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_rfid_uid' => 'TEACH-DUP-002',
        'tch_fname' => 'Ana',
        'tch_mname' => 'Santos',
        'tch_lname' => 'Cruz',
        'tch_email' => 'ana.cruz@school.test',
        'contact_number' => '09123456780',
    ]);

    $differentFnameResponse->assertSessionHasNoErrors();
});

test('adding admin with duplicate full name fails validation', function () {
    $admin = Admin::factory()->create([
        'fname' => 'Carlos',
        'mname' => 'Miguel',
        'lname' => 'Reyes',
        'email' => 'carlos@school.test',
    ]);

    // Duplicate admin fails
    $response = $this->actingAs($admin, 'admin')->post(route('admin.admin.store'), [
        'fname' => 'carlos',
        'mname' => 'miguel',
        'lname' => 'reyes',
        'email' => 'carlos2@school.test',
        'contact_number' => '09123456781',
    ]);

    $response->assertSessionHasErrors([
        'fname' => 'This admin is already registered.',
    ]);

    // Different first name succeeds
    $differentFnameResponse = $this->actingAs($admin, 'admin')->post(route('admin.admin.store'), [
        'fname' => 'Eduardo',
        'mname' => 'Miguel',
        'lname' => 'Reyes',
        'email' => 'eduardo@school.test',
        'contact_number' => '09123456782',
    ]);

    $differentFnameResponse->assertSessionHasNoErrors();
});

test('adding section with duplicate name in same grade level fails validation', function () {
    $admin = Admin::factory()->create();

    Section::create([
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    // Duplicate in Grade 7 fails
    $response = $this->actingAs($admin, 'admin')->post(route('admin.section.store'), [
        'sect_name' => 'diamond',
        'gr_level' => 'Grade 7',
    ]);

    $response->assertSessionHasErrors([
        'sect_name' => 'This section is already registered.',
    ]);

    // Different grade level succeeds
    $differentGradeResponse = $this->actingAs($admin, 'admin')->post(route('admin.section.store'), [
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 8',
    ]);

    $differentGradeResponse->assertSessionHasNoErrors();
});

test('updating section allows keeping own name but blocks duplicate', function () {
    $admin = Admin::factory()->create();

    $sec1 = Section::create([
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    $sec2 = Section::create([
        'sect_name' => 'Emerald',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    // Self update succeeds
    $selfUpdateResponse = $this->actingAs($admin, 'admin')->put(route('admin.section.update', $sec1->sect_id), [
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 7',
    ]);
    $selfUpdateResponse->assertSessionHasNoErrors();

    // Duplicate update fails
    $dupResponse = $this->actingAs($admin, 'admin')->put(route('admin.section.update', $sec2->sect_id), [
        'sect_name' => 'Diamond',
        'gr_level' => 'Grade 7',
    ]);
    $dupResponse->assertSessionHasErrors([
        'sect_name' => 'This section is already registered.',
    ]);
});

test('adding subject with duplicate code or duplicate name in same grade level fails validation', function () {
    $admin = Admin::factory()->create();

    Subject::create([
        'subj_code' => 'MATH-7',
        'subj_name' => 'Mathematics',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    // Duplicate code fails
    $dupCodeResponse = $this->actingAs($admin, 'admin')->post(route('admin.subject.store'), [
        'subj_code' => 'MATH-7',
        'subj_name' => 'Advanced Math',
        'gr_level' => 'Grade 7',
    ]);
    $dupCodeResponse->assertSessionHasErrors([
        'subj_code' => 'This subject code is already registered.',
    ]);

    // Duplicate name in same grade level fails
    $dupNameResponse = $this->actingAs($admin, 'admin')->post(route('admin.subject.store'), [
        'subj_code' => 'MATH-7B',
        'subj_name' => 'mathematics',
        'gr_level' => 'Grade 7',
    ]);
    $dupNameResponse->assertSessionHasErrors([
        'subj_name' => 'This subject is already registered.',
    ]);

    // Same name in different grade level succeeds
    $diffGradeResponse = $this->actingAs($admin, 'admin')->post(route('admin.subject.store'), [
        'subj_code' => 'MATH-8',
        'subj_name' => 'Mathematics',
        'gr_level' => 'Grade 8',
    ]);
    $diffGradeResponse->assertSessionHasNoErrors();
});

test('adding building with duplicate name fails validation', function () {
    $admin = Admin::factory()->create();

    Building::create([
        'building_name' => 'Main Building',
        'is_deleted' => false,
    ]);

    // Duplicate building fails
    $dupResponse = $this->actingAs($admin, 'admin')->post(route('admin.building.store'), [
        'building_name' => 'main building',
    ]);
    $dupResponse->assertSessionHasErrors([
        'building_name' => 'This building is already registered.',
    ]);

    // Different building succeeds
    $diffResponse = $this->actingAs($admin, 'admin')->post(route('admin.building.store'), [
        'building_name' => 'Science Wing',
    ]);
    $diffResponse->assertSessionHasNoErrors();
});

test('updating building allows keeping own name but blocks duplicate', function () {
    $admin = Admin::factory()->create();

    $b1 = Building::create([
        'building_name' => 'Main Building',
        'is_deleted' => false,
    ]);

    $b2 = Building::create([
        'building_name' => 'Science Wing',
        'is_deleted' => false,
    ]);

    // Self update succeeds
    $selfUpdate = $this->actingAs($admin, 'admin')->put(route('admin.building.update', $b1->building_id), [
        'building_name' => 'Main Building',
    ]);
    $selfUpdate->assertSessionHasNoErrors();

    // Duplicate update fails
    $dupUpdate = $this->actingAs($admin, 'admin')->put(route('admin.building.update', $b2->building_id), [
        'building_name' => 'Main Building',
    ]);
    $dupUpdate->assertSessionHasErrors([
        'building_name' => 'This building is already registered.',
    ]);
});

test('email cannot contain spaces when adding admin, teacher, or student parent', function () {
    $admin = Admin::factory()->create();

    // Admin email with space fails
    $adminEmailResponse = $this->actingAs($admin, 'admin')->post(route('admin.admin.store'), [
        'fname' => 'John',
        'lname' => 'Doe',
        'email' => 'john doe@example.com',
        'contact_number' => '09123456789',
    ]);
    $adminEmailResponse->assertSessionHasErrors([
        'email' => 'Email cannot contain spaces.',
    ]);

    // Teacher email with space fails
    $teacherEmailResponse = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_rfid_uid' => 'TEACH-EMAIL-001',
        'tch_fname' => 'Jane',
        'tch_lname' => 'Smith',
        'tch_email' => 'jane smith@example.com',
        'contact_number' => '09123456788',
    ]);
    $teacherEmailResponse->assertSessionHasErrors([
        'tch_email' => 'Email cannot contain spaces.',
    ]);

    // Student parent email with space fails
    $section = Section::create([
        'sect_name' => 'Grade 7 - Diamond',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    $studentParentEmailResponse = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Mark',
        'stu_lname' => 'Johnson',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '8888888888',
        'father_name' => 'Paul',
        'father_lname' => 'Johnson',
        'father_email' => 'paul johnson@example.com',
    ]);
    $studentParentEmailResponse->assertSessionHasErrors([
        'father_email' => 'Father email cannot contain spaces.',
    ]);
});

test('adding teacher or student without rfid uid fails with required validation error', function () {
    $admin = Admin::factory()->create();

    // Teacher store without tch_rfid_uid fails
    $teacherResponse = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_fname' => 'Teacher',
        'tch_lname' => 'WithoutRfid',
        'tch_email' => 'norfid.teacher@school.test',
        'contact_number' => '09123456781',
    ]);

    $teacherResponse->assertSessionHasErrors([
        'tch_rfid_uid' => 'RFID UID is required.',
    ]);

    // Student store without rfid_uid fails
    $section = Section::create([
        'sect_name' => 'Grade 8 - Gold',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ]);

    $studentResponse = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Student',
        'stu_lname' => 'WithoutRfid',
        'sect_id' => $section->sect_id,
    ]);

    $studentResponse->assertSessionHasErrors([
        'rfid_uid' => 'RFID UID is required.',
    ]);
});
