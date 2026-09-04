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
    Storage::fake('public');

    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ]);

    $response->assertRedirect();
    $admin->refresh();

    expect($admin->avatar)->not->toBeNull();
    Storage::disk('public')->assertExists($admin->avatar);
});

test('avatar must be an image and within size limits', function () {
    Storage::fake('public');

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

test('uploading new avatar deletes the old one', function () {
    Storage::fake('public');

    $admin = Admin::factory()->create();

    // Upload first avatar
    $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar1.jpg'),
        ]);

    $admin->refresh();
    $firstAvatarPath = $admin->avatar;
    Storage::disk('public')->assertExists($firstAvatarPath);

    // Upload second avatar
    $this->actingAs($admin, 'admin')
        ->post('/admin/profile/avatar', [
            'avatar' => UploadedFile::fake()->image('avatar2.jpg'),
        ]);

    $admin->refresh();
    $secondAvatarPath = $admin->avatar;

    expect($secondAvatarPath)->not->toBe($firstAvatarPath);
    Storage::disk('public')->assertMissing($firstAvatarPath);
    Storage::disk('public')->assertExists($secondAvatarPath);
});
