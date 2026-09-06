<?php

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('storage route returns 404 when file does not exist', function () {
    Storage::fake('public');

    $response = $this->get('/storage/avatars/nonexistent.jpg');

    $response->assertNotFound();
});

test('storage route serves file when it exists in public storage', function () {
    Storage::fake('public');

    $file = UploadedFile::fake()->image('test_avatar.jpg');
    $path = Storage::disk('public')->putFileAs('avatars', $file, 'test_avatar.jpg');

    $response = $this->get('/storage/'.$path);

    $response->assertOk();
    expect($response->headers->get('Content-Type'))->toContain('image/jpeg');
});

test('storage route handles path traversal safely by returning 404', function () {
    Storage::fake('public');

    $response = $this->get('/storage/../../config/app.php');

    $response->assertNotFound();
});
