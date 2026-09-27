<?php

use App\Models\Admin;
use App\Models\Teacher;
use Inertia\Testing\AssertableInertia as Assert;

test('desktop returns welcome page', function () {
    $response = $this->withHeaders([
        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    ])->get(route('home'));

    $response->assertOk();
});

test('welcome page inertia payload includes registration flag', function () {
    $response = $this->get(route('home'));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('welcome')
            ->has('canRegister')
        );
});

test('mobile user is redirected to login', function () {
    $response = $this->withHeaders([
        'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ])->get(route('home'));

    $response->assertRedirect(route('login'));
});

test('mobile user can access landing page with landing query parameter', function () {
    $response = $this->withHeaders([
        'User-Agent' => 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    ])->get(route('home', ['landing' => 1]));

    $response->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('welcome'));
});

test('authenticated admin is redirected to admin dashboard', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->get(route('home'));

    $response->assertRedirect(route('admin.dashboard'));
});

test('authenticated teacher is redirected to teacher dashboard', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Maria',
        'tch_lname' => 'Santos',
        'tch_email' => 'maria.home.test@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($teacher, 'teacher')->get(route('home'));

    $response->assertRedirect(route('teacher.dashboard'));
});
