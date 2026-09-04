<?php

use App\Models\Admin;
use Database\Seeders\AdminSeeder;
use Illuminate\Support\Facades\Hash;

test('admin seeder creates default administrator', function () {
    $this->seed(AdminSeeder::class);

    $admin = Admin::query()->where('email', 'admin@example.com')->first();

    expect($admin)->not->toBeNull()
        ->and(Hash::check('password', $admin->pw))->toBeTrue()
        ->and($admin->fname)->toBe('System')
        ->and($admin->lname)->toBe('Administrator')
        ->and($admin->is_deleted)->toBeFalse();
});
