<?php

use App\Models\Admin;
use App\Models\Student;
use App\Models\Teacher;

test('admin cannot assign a student rfid uid to a teacher', function () {
    $admin = Admin::factory()->create();

    Student::create([
        'rfid_uid' => 'SHAREDUID1',
        'stu_fname' => 'Juan',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $this->actingAs($admin, 'admin')
        ->post(route('admin.teacher.store'), [
            'tch_fname' => 'Ana',
            'tch_lname' => 'Reyes',
            'tch_email' => 'ana.unique.rfid@example.com',
            'tch_rfid_uid' => 'shareduid1',
            'tch_pw' => 'password123',
            'tch_pw_confirmation' => 'password123',
        ])
        ->assertSessionHasErrors('tch_rfid_uid');
});

test('rfid scan resolves a teacher by master card uid', function () {
    config(['rfid.device_token' => null]);

    Teacher::create([
        'tch_rfid_uid' => 'PRIMARY001',
        'master_card' => 'MASTER001',
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ana.master@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $this->postJson(route('api.rfid.scan'), [
        'rfid_uid' => 'master001',
    ])
        ->assertSuccessful()
        ->assertJson([
            'success' => true,
            'type' => 'teacher',
            'data' => [
                'tch_fname' => 'Ana',
                'tch_lname' => 'Reyes',
            ],
        ]);
});
