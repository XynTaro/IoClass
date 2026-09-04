<?php

use App\Models\Teacher;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from the change-password page', function () {
    $this->get(route('teacher.password.change'))
        ->assertRedirect(route('login'));
});

test('teacher with must_change_password is redirected to change-password page', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Juan',
        'tch_lname' => 'dela Cruz',
        'tch_email' => 'juan.delacruz@test.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => true,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.dashboard'))
        ->assertRedirect(route('teacher.password.change'));
});

test('teacher with must_change_password can access the change-password page', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Maria',
        'tch_lname' => 'Santos',
        'tch_email' => 'maria.santos@test.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => true,
    ]);

    $this->withoutVite()
        ->actingAs($teacher, 'teacher')
        ->get(route('teacher.password.change'))
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/ChangePassword'));
});

test('teacher can change their password and must_change_password is cleared', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Pedro',
        'tch_lname' => 'Reyes',
        'tch_email' => 'pedro.reyes@test.com',
        'tch_pw' => 'oldpassword1',
        'is_deleted' => false,
        'must_change_password' => true,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.password.update'), [
            'password' => 'NewSecure123!',
            'password_confirmation' => 'NewSecure123!',
        ])
        ->assertRedirect(route('teacher.dashboard'));

    expect($teacher->fresh()->must_change_password)->toBeFalse();
});

test('teacher can access dashboard after changing password', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Rosa',
        'tch_lname' => 'Garcia',
        'tch_email' => 'rosa.garcia@test.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $this->withoutVite()
        ->actingAs($teacher, 'teacher')
        ->get(route('teacher.dashboard'))
        ->assertInertia(fn (Assert $page) => $page->component('Teacher/Dashboard'));
});

test('password change requires confirmation', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Lito',
        'tch_lname' => 'Bautista',
        'tch_email' => 'lito.bautista@test.com',
        'tch_pw' => 'oldpassword1',
        'is_deleted' => false,
        'must_change_password' => true,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.password.update'), [
            'password' => 'NewSecure123!',
            'password_confirmation' => 'WrongConfirmation!',
        ])
        ->assertSessionHasErrors('password');
});

test('password change requires minimum 8 characters', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Nena',
        'tch_lname' => 'Lopez',
        'tch_email' => 'nena.lopez@test.com',
        'tch_pw' => 'oldpassword1',
        'is_deleted' => false,
        'must_change_password' => true,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.password.update'), [
            'password' => 'short',
            'password_confirmation' => 'short',
        ])
        ->assertSessionHasErrors('password');
});
