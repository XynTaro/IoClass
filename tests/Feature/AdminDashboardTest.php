<?php

use App\Models\Admin;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from the admin dashboard', function () {
    $this->get(route('admin.dashboard'))
        ->assertRedirect(route('login'));
});

test('authenticated admins can view the admin dashboard', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
        );
});
