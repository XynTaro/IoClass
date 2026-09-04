<?php

use App\Models\Admin;
use App\Models\Student;
use Database\Seeders\AddressSeeder;
use Database\Seeders\AdminSeeder;
use Database\Seeders\StudentSeeder;

test('address and admin seeders create a default admin account', function () {
    $this->seed(AddressSeeder::class);
    $this->seed(AdminSeeder::class);

    expect(Admin::query()->where('email', 'admin@example.com')->exists())->toBeTrue();

    $this->post(route('login.submit'), [
        'email' => 'admin@example.com',
        'password' => 'password',
    ])->assertRedirect(route('admin.dashboard'));
});

test('database seeder runs without errors', function () {
    $this->seed();

    expect(Admin::query()->where('email', 'admin@example.com')->exists())->toBeTrue();
});

test('student seeder creates the sample students', function () {
    $this->seed(StudentSeeder::class);

    expect(Student::query()->where('lrn', '202600000001')->value('stu_fname'))->toBe('Norjae');
    expect(Student::query()->where('lrn', '202600000002')->value('stu_lname'))->toBe('De Jesus');
    expect(Student::query()->where('lrn', '202600000003')->value('stu_fname'))->toBe('Dhen');
    expect(Student::query()->where('lrn', '202600000004')->value('stu_lname'))->toBe('Leopando');
    expect(Student::query()->where('is_deleted', false)->count())->toBe(6);
});
