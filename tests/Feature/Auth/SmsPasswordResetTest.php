<?php

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\Teacher;
use App\Services\Sms\RecordingSmsSender;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->sms = new RecordingSmsSender;
    $this->app->instance(SmsSender::class, $this->sms);
});

test('forgot password screen can be rendered', function () {
    $this->withoutVite()
        ->get(route('password.request'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('forgot-password'));
});

test('otp is sent to the contact number linked to an admin email', function () {
    $admin = Admin::factory()->create([
        'email' => 'admin.reset@test.com',
        'contact_number' => '09171234567',
        'pw' => 'password',
    ]);

    $this->post(route('password.otp.send'), [
        'email' => $admin->email,
    ])
        ->assertRedirect(route('password.otp.show'))
        ->assertSessionHas('status');

    expect($this->sms->messages)->toHaveCount(1)
        ->and($this->sms->messages[0]['to'])->toBe('09171234567')
        ->and($this->sms->lastCode())->toHaveLength(6);
});

test('unknown emails still redirect without revealing account existence', function () {
    $this->post(route('password.otp.send'), [
        'email' => 'missing@test.com',
    ])
        ->assertRedirect(route('password.otp.show'))
        ->assertSessionHas('status');

    expect($this->sms->messages)->toBeEmpty();
});

test('emails without a contact number do not send an otp', function () {
    $admin = Admin::factory()->create([
        'email' => 'nocontact@test.com',
        'contact_number' => null,
    ]);

    $this->post(route('password.otp.send'), [
        'email' => $admin->email,
    ])
        ->assertRedirect(route('password.otp.show'))
        ->assertSessionHas('status');

    expect($this->sms->messages)->toBeEmpty();
});

test('admin can reset password with a valid otp', function () {
    $admin = Admin::factory()->create([
        'email' => 'admin.reset@test.com',
        'contact_number' => '09171234567',
        'pw' => 'old-password',
    ]);

    $this->post(route('password.otp.send'), [
        'email' => $admin->email,
    ])->assertRedirect(route('password.otp.show'));

    $code = $this->sms->lastCode();

    expect($code)->not->toBeNull();

    $this->post(route('password.otp.verify'), [
        'code' => $code,
    ])->assertRedirect(route('password.reset.show'));

    $this->post(route('password.reset.update'), [
        'password' => 'NewSecure123!',
        'password_confirmation' => 'NewSecure123!',
    ])
        ->assertRedirect(route('login'))
        ->assertSessionHas('status');

    expect(Hash::check('NewSecure123!', $admin->fresh()->pw))->toBeTrue();
});

test('teacher can reset password with a valid otp', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Ana',
        'tch_lname' => 'Lopez',
        'tch_email' => 'ana.lopez@test.com',
        'tch_pw' => 'old-password',
        'contact_number' => '09179876543',
        'is_deleted' => false,
        'must_change_password' => true,
    ]);

    $this->post(route('password.otp.send'), [
        'email' => $teacher->tch_email,
    ])->assertRedirect(route('password.otp.show'));

    $code = $this->sms->lastCode();

    $this->post(route('password.otp.verify'), [
        'code' => $code,
    ])->assertRedirect(route('password.reset.show'));

    $this->post(route('password.reset.update'), [
        'password' => 'NewSecure123!',
        'password_confirmation' => 'NewSecure123!',
    ])->assertRedirect(route('login'));

    $teacher->refresh();

    expect(Hash::check('NewSecure123!', $teacher->tch_pw))->toBeTrue()
        ->and($teacher->must_change_password)->toBeFalse();
});

test('invalid otp is rejected', function () {
    $admin = Admin::factory()->create([
        'email' => 'admin.reset@test.com',
        'contact_number' => '09171234567',
    ]);

    $this->post(route('password.otp.send'), [
        'email' => $admin->email,
    ]);

    $this->from(route('password.otp.show'))
        ->post(route('password.otp.verify'), [
            'code' => '000000',
        ])
        ->assertRedirect(route('password.otp.show'))
        ->assertSessionHasErrors('code');
});
