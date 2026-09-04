<?php

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\Teacher;
use App\Services\Sms\RecordingSmsSender;

test('creating an admin auto generates password and sets must_change_password to true', function () {
    $sms = new RecordingSmsSender;
    $this->app->instance(SmsSender::class, $sms);

    $creatorAdmin = Admin::factory()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($creatorAdmin, 'admin')
        ->post(route('admin.admin.store'), [
            'fname' => 'Super',
            'mname' => 'Tech',
            'lname' => 'Admin',
            'email' => 'superadmin.new@example.com',
            'contact_number' => '09123456789',
        ]);

    $response->assertRedirect(route('admin.admin.index'));

    $newAdmin = Admin::where('email', 'superadmin.new@example.com')->first();

    expect($newAdmin)->not->toBeNull();
    expect($newAdmin->must_change_password)->toBeTrue();
    expect($newAdmin->pw)->not->toBeEmpty();
    expect(count($sms->messages))->toBe(1);
    expect($sms->messages[0]['to'])->toBe('09123456789');
    expect($sms->messages[0]['message'])->toContain('Temporary password:');
});

test('creating a teacher auto generates password and sets must_change_password to true', function () {
    $sms = new RecordingSmsSender;
    $this->app->instance(SmsSender::class, $sms);

    $admin = Admin::factory()->create([
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')
        ->post(route('admin.teacher.store'), [
            'tch_fname' => 'New',
            'tch_lname' => 'Teacher',
            'tch_email' => 'newteacher.sms@example.com',
            'contact_number' => '09987654321',
        ]);

    $response->assertRedirect(route('admin.teacher.index'));

    $newTeacher = Teacher::where('tch_email', 'newteacher.sms@example.com')->first();

    expect($newTeacher)->not->toBeNull();
    expect($newTeacher->must_change_password)->toBeTrue();
    expect($newTeacher->tch_pw)->not->toBeEmpty();
    expect(count($sms->messages))->toBe(1);
    expect($sms->messages[0]['to'])->toBe('09987654321');
    expect($sms->messages[0]['message'])->toContain('Temporary password:');
});

test('admin with must_change_password true is forced to change password', function () {
    $admin = Admin::factory()->create([
        'must_change_password' => true,
    ]);

    $response = $this->actingAs($admin, 'admin')
        ->get(route('admin.dashboard'));

    $response->assertRedirect(route('admin.profile.show'));
});
