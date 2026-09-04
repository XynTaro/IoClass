<?php

use App\Models\Admin;
use App\Models\Section;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('student name cannot contain numbers or special symbols and auto capitalizes each word', function () {
    $admin = Admin::factory()->create();
    $section = Section::create([
        'sect_name' => 'Grade 7 - Diamond',
        'gr_level' => 7,
        'is_deleted' => false,
    ]);

    // Rejection when numbers are present
    $invalidResponse = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'John123',
        'stu_lname' => 'Doe',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1122334455',
    ]);
    $invalidResponse->assertSessionHasErrors(['stu_fname']);

    // Rejection when special symbols are present
    $symbolResponse = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'John@Doe',
        'stu_lname' => 'Doe',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1122334455',
    ]);
    $symbolResponse->assertSessionHasErrors(['stu_fname']);

    // Successful formatting when valid
    $validResponse = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'john paul',
        'stu_mname' => 'de la cruz',
        'stu_lname' => 'smith',
        'sect_id' => $section->sect_id,
        'rfid_uid' => '1122334455',
    ]);

    $validResponse->assertSessionHasNoErrors();
    $this->assertDatabaseHas('student', [
        'stu_fname' => 'John Paul',
        'stu_mname' => 'De La Cruz',
        'stu_lname' => 'Smith',
    ]);
});

test('teacher name cannot contain numbers or special symbols and auto capitalizes each word', function () {
    $admin = Admin::factory()->create();

    $invalidResponse = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_fname' => 'Jane2',
        'tch_lname' => 'Doe',
        'tch_email' => 'jane@example.com',
        'tch_pw' => 'Password123!',
        'tch_pw_confirmation' => 'Password123!',
    ]);
    $invalidResponse->assertSessionHasErrors(['tch_fname']);

    $symbolResponse = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_fname' => 'Jane#',
        'tch_lname' => 'Doe',
        'tch_email' => 'jane@example.com',
        'tch_pw' => 'Password123!',
        'tch_pw_confirmation' => 'Password123!',
    ]);
    $symbolResponse->assertSessionHasErrors(['tch_fname']);

    $validResponse = $this->actingAs($admin, 'admin')->post(route('admin.teacher.store'), [
        'tch_fname' => 'mary jane',
        'tch_mname' => 'delos santos',
        'tch_lname' => 'watson',
        'tch_email' => 'jane@example.com',
        'tch_pw' => 'Password123!',
        'tch_pw_confirmation' => 'Password123!',
    ]);

    $validResponse->assertSessionHasNoErrors();
    $this->assertDatabaseHas('teacher', [
        'tch_fname' => 'Mary Jane',
        'tch_mname' => 'Delos Santos',
        'tch_lname' => 'Watson',
    ]);
});

test('admin name cannot contain numbers or special symbols and auto capitalizes each word', function () {
    $admin = Admin::factory()->create();

    $invalidResponse = $this->actingAs($admin, 'admin')->post(route('admin.admin.store'), [
        'fname' => 'Admin1',
        'lname' => 'User',
        'email' => 'newadmin@example.com',
        'pw' => 'Password123!',
        'pw_confirmation' => 'Password123!',
    ]);
    $invalidResponse->assertSessionHasErrors(['fname']);

    $symbolResponse = $this->actingAs($admin, 'admin')->post(route('admin.admin.store'), [
        'fname' => 'Robert$',
        'lname' => 'User',
        'email' => 'newadmin@example.com',
        'pw' => 'Password123!',
        'pw_confirmation' => 'Password123!',
    ]);
    $symbolResponse->assertSessionHasErrors(['fname']);

    $validResponse = $this->actingAs($admin, 'admin')->post(route('admin.admin.store'), [
        'fname' => 'robert james',
        'mname' => 'van dyke',
        'lname' => 'brown',
        'email' => 'newadmin@example.com',
        'pw' => 'Password123!',
        'pw_confirmation' => 'Password123!',
    ]);

    $validResponse->assertSessionHasNoErrors();
    $this->assertDatabaseHas('admin', [
        'fname' => 'Robert James',
        'mname' => 'Van Dyke',
        'lname' => 'Brown',
    ]);
});
