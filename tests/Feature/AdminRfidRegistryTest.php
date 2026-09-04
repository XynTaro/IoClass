<?php

/**
 * Feature tests for the Admin RFID endpoints:
 *
 * 1. Registry endpoint  – returns all registered RFID UIDs (students + teachers)
 *    so the admin enrollment form can detect duplicates in real-time.
 *
 * 2. Last-Capture endpoint – polls for the latest card tap captured by an
 *    ESP32 RFID reader, used to auto-fill UIDs during enrollment.
 */

use App\Models\Admin;
use App\Models\Student;
use App\Models\Teacher;

// ── Registry Endpoint ─────────────────────────────────────────────────

test('guests cannot access the admin rfid registry', function () {
    $this->get(route('admin.rfid.registry'))
        ->assertRedirect(route('login'));
});

test('admin rfid registry returns student and teacher uids', function () {
    $admin = Admin::factory()->create();

    Student::create([
        'rfid_uid' => 'STU001',
        'stu_fname' => 'Maria',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    Teacher::create([
        'tch_rfid_uid' => 'TCH001',
        'master_card' => 'MASTER01',
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ana.reyes@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $this->actingAs($admin, 'admin')
        ->getJson(route('admin.rfid.registry'))
        ->assertSuccessful()
        ->assertJson([
            'registry' => [
                'STU001' => [
                    'type' => 'student',
                    'name' => 'Maria Santos',
                ],
                'TCH001' => [
                    'type' => 'teacher',
                    'name' => 'Ana Reyes',
                ],
                'MASTER01' => [
                    'type' => 'teacher',
                    'name' => 'Ana Reyes',
                ],
            ],
        ]);
});

// ── Last-Capture Endpoint ─────────────────────────────────────────────

test('admin rfid last capture is unavailable without device token config', function () {
    config([
        'rfid.device_token' => null,
        'rfid.device_tokens' => null,
    ]);

    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->getJson(route('admin.rfid.lastCapture', ['since' => 0]))
        ->assertSuccessful()
        ->assertJson([
            'available' => false,
            'uid' => null,
            'captured_at' => null,
        ]);
});

test('admin rfid last capture captures unknown card from esp32-room-b when multi-tokens are configured', function () {
    config([
        'rfid.device_token' => 'esp32-room-a',
        'rfid.device_tokens' => 'esp32-room-a,esp32-room-b',
    ]);

    $since = now()->subSecond()->timestamp;

    // Unknown card scanned from room B
    $this->withHeader('X-Device-Token', 'esp32-room-b')
        ->postJson(route('api.rfid.scan'), [
            'rfid_uid' => 'ROOM_B_UNKNOWN_CARD',
        ])
        ->assertSuccessful()
        ->assertJson([
            'success' => false,
            'message' => 'RFID UID not recognized.',
        ]);

    $admin = Admin::factory()->create();

    // Admin polling retrieves the unknown card UID from room B
    $this->actingAs($admin, 'admin')
        ->getJson(route('admin.rfid.lastCapture', ['since' => $since]))
        ->assertSuccessful()
        ->assertJson([
            'available' => true,
            'uid' => 'ROOM_B_UNKNOWN_CARD',
        ]);
});
