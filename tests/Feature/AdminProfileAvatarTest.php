<?php

use App\Models\Admin;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('unauthenticated users cannot upload avatar', function () {
    $response = $this->postJson('/admin/profile/avatar', [
        'avatar' => UploadedFile::fake()->image('avatar.jpg'),
    ]);

    $response->assertStatus(401);
});

test('administrator can upload profile avatar', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

    $response->assertRedirect();
    $admin->refresh();

    expect($admin->avatar)->not->toBeNull()
        ->and($admin->avatar)->toStartWith('data:image/');
});

test('avatar must be an image and within size limits', function () {
    $admin = Admin::factory()->create();

    // Test non-image file
    $response = $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->create('document.pdf', 500),
        ]);

    $response->assertSessionHasErrors('avatar');

    // Test large file (> 2MB)
    $response = $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('huge.jpg')->size(3000),
        ]);

    $response->assertSessionHasErrors('avatar');
});

test('uploading new avatar updates to new data uri and removes old disk file if present', function () {
    Storage::fake('public');
    Storage::disk('public')->put('avatars/old_avatar.jpg', 'bytes');

    $admin = Admin::factory()->create([
        'avatar' => 'avatars/old_avatar.jpg',
    ]);

    // Upload new avatar
    $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar2.jpg'),
        ]);

    $admin->refresh();

    expect($admin->avatar)->toStartWith('data:image/');
    Storage::disk('public')->assertMissing('avatars/old_avatar.jpg');
});
