<?php

use App\Services\AvatarService;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

uses(TestCase::class);

test('it converts an uploaded image to a webp data uri', function () {
    $service = new AvatarService;
    $file = UploadedFile::fake()->image('avatar.jpg', 300, 300);

    $uri = $service->toDataUri($file);

    expect($uri)->toStartWith('data:image/webp;base64,')
        ->and(strlen($uri))->toBeGreaterThan(100);
});

test('it returns data uri as-is when resolving url', function () {
    $service = new AvatarService;
    $dataUri = 'data:image/webp;base64,UklGRkAAAABXRUJQVlA4IDQAAADwAQCdASoBAAEAAkA4JaQAA3AA/vuUAAA=';

    expect($service->url($dataUri))->toBe($dataUri);
});

test('it returns storage path when resolving relative path', function () {
    $service = new AvatarService;

    expect($service->url('avatars/exists.jpg'))->toBe('/storage/avatars/exists.jpg');
});
