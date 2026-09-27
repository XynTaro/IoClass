<?php

use App\Models\Teacher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('unauthenticated teachers cannot upload avatar', function () {
    $response = $this->postJson('/teacher/profile/avatar', [
        'avatar' => UploadedFile::fake()->image('avatar.jpg'),
    ]);

    $response->assertStatus(401);
});

test('teacher can upload profile avatar', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Dana',
        'tch_lname' => 'Cruz',
        'tch_email' => 'dana.cruz.avatar@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $response = $this->actingAs($teacher, 'teacher')
        ->post('/teacher/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

    $response->assertRedirect();
    $teacher->refresh();

    expect($teacher->avatar)->not->toBeNull()
        ->and($teacher->avatar)->toStartWith('data:image/');
});

test('teacher avatar must be an image and within size limits', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Dana',
        'tch_lname' => 'Cruz',
        'tch_email' => 'dana.cruz.avatar.size@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    // Test non-image file
    $response = $this->actingAs($teacher, 'teacher')
        ->post('/teacher/profile/avatar', [
            'avatar' => UploadedFile::fake()->create('document.pdf', 500),
        ]);

    $response->assertSessionHasErrors('avatar');

    // Test large file (> 2MB)
    $response = $this->actingAs($teacher, 'teacher')
        ->post('/teacher/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('huge.jpg')->size(3000),
        ]);

    $response->assertSessionHasErrors('avatar');
});

test('uploading new teacher avatar updates data uri and removes old disk file if present', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old_tch_avatar.jpg', 'bytes');

    $teacher = Teacher::create([
        'tch_fname' => 'Dana',
        'tch_lname' => 'Cruz',
        'tch_email' => 'dana.cruz.avatar.del@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
        'avatar' => 'avatars/old_tch_avatar.jpg',
    ]);

    // Upload new avatar
    $this->actingAs($teacher, 'teacher')
        ->post('/teacher/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar2.jpg'),
        ]);

    $teacher->refresh();

    expect($teacher->avatar)->toStartWith('data:image/');
    Storage::disk('public')->assertMissing('avatars/old_tch_avatar.jpg');
});
