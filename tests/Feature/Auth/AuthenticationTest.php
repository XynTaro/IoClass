<?php

use App\Models\Admin;
use App\Models\Teacher;

test('login screen can be rendered', function () {
    $response = $this->get(route('login'));

    $response->assertOk();
});

test('admins can authenticate using the login form', function () {
    $admin = Admin::factory()->create([
        'email' => 'admin@school.test',
        'pw' => 'password',
    ]);

    $response = $this->post(route('login.submit'), [
        'email' => 'admin@school.test',
        'password' => 'password',
    ]);

    $response->assertRedirect(route('admin.dashboard'));
    $this->assertAuthenticatedAs($admin, 'admin');
});

test('teachers can authenticate using the login form', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Jane',
        'tch_lname' => 'Doe',
        'tch_email' => 'teacher@school.test',
        'tch_pw' => 'password',
        'is_deleted' => false,
    ]);

    $response = $this->post(route('login.submit'), [
        'email' => 'teacher@school.test',
        'password' => 'password',
    ]);

    $response->assertRedirect(route('teacher.dashboard'));
    $this->assertAuthenticatedAs($teacher, 'teacher');
});

test('users can not authenticate with invalid password', function () {
    Admin::factory()->create([
        'email' => 'admin@school.test',
        'pw' => 'password',
    ]);

    $this->post(route('login.submit'), [
        'email' => 'admin@school.test',
        'password' => 'wrong-password',
    ]);

    $this->assertGuest('admin');
    $this->assertGuest('teacher');
});

test('admins can logout and clear browser cache headers', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('logout'));

    $this->assertGuest('admin');
    $response->assertRedirect(route('login'));
    $response->assertHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    $response->assertHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store, private');
});

test('unauthenticated users accessing protected routes receive 401 response', function () {
    $response = $this->getJson(route('admin.dashboard'));

    $response->assertStatus(401);
});

test('authenticated admins can refresh session via keep-alive', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->postJson(route('session.keep-alive'));

    $response->assertOk()
        ->assertJson([
            'status' => 'active',
        ]);
});

test('authenticated teachers can refresh session via keep-alive', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Jane',
        'tch_lname' => 'Doe',
        'tch_email' => 'teacher-keepalive@school.test',
        'tch_pw' => 'password',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($teacher, 'teacher')->postJson(route('session.keep-alive'));

    $response->assertOk()
        ->assertJson([
            'status' => 'active',
        ]);
});

test('unauthenticated users receive 401 on session keep-alive', function () {
    $response = $this->postJson(route('session.keep-alive'));

    $response->assertStatus(401)
        ->assertJson([
            'status' => 'unauthenticated',
        ]);
});

test('login page shows inactivity notice when reason query parameter is set', function () {
    $response = $this->get(route('login', ['reason' => 'inactivity']));

    $response->assertOk();
    $response->assertSee('You were automatically logged out due to 30 minutes of inactivity.');
});
