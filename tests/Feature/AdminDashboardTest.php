<?php

use App\Models\Admin;
use App\Models\Teacher;
use App\Services\Sms\SmsBalanceService;
use Inertia\Testing\AssertableInertia as Assert;

test('guests are redirected from the admin dashboard', function () {
    $this->get(route('admin.dashboard'))
        ->assertRedirect(route('login'));
});

test('authenticated admins can view the admin dashboard with teacher stats', function () {
    $admin = Admin::factory()->create();

    Teacher::create([
        'tch_fname' => 'Elena',
        'tch_lname' => 'Rostova',
        'tch_email' => 'elena@example.com',
        'is_deleted' => false,
    ]);

    Teacher::create([
        'tch_fname' => 'Deleted',
        'tch_lname' => 'Teacher',
        'tch_email' => 'deleted@example.com',
        'is_deleted' => true,
    ]);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('stats.totalTeachers', 1)
        );
});

test('authenticated admins can view the admin dashboard with messages remaining stat', function () {
    $admin = Admin::factory()->create();

    $mockSmsBalance = Mockery::mock(SmsBalanceService::class);
    $mockSmsBalance->shouldReceive('getRemainingMessages')->once()->andReturn(486);
    $this->app->instance(SmsBalanceService::class, $mockSmsBalance);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Dashboard')
            ->where('stats.messagesRemaining', 486)
        );
});
