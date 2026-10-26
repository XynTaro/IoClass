<?php

use App\Models\Admin;
use App\Models\Teacher;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->admin = Admin::factory()->create();
});

test('teacher has active status when created', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Maria',
        'tch_lname' => 'Santos',
        'tch_email' => 'maria.santos@example.com',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    expect($teacher->fresh()->status)->toBe('active');
});

test('archiving a teacher automatically sets status to inactive', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'John',
        'tch_lname' => 'Doe',
        'tch_email' => 'john.doe@example.com',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($this->admin, 'admin')
        ->delete(route('admin.teacher.destroy', $teacher->tch_id));

    $response->assertRedirect();
    $teacher->refresh();

    expect($teacher->is_deleted)->toBeTrue()
        ->and($teacher->status)->toBe('inactive');
});

test('restoring an archived teacher automatically sets status to active', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Jane',
        'tch_lname' => 'Doe',
        'tch_email' => 'jane.doe@example.com',
        'status' => 'inactive',
        'is_deleted' => true,
    ]);

    $response = $this->actingAs($this->admin, 'admin')
        ->post(route('admin.teacher.restore', ['id' => $teacher->tch_id]));

    $response->assertRedirect();
    $teacher->refresh();

    expect($teacher->is_deleted)->toBeFalse()
        ->and($teacher->status)->toBe('active');
});

test('admin teacher index passes status to inertia view', function () {
    Teacher::create([
        'tch_fname' => 'Active',
        'tch_lname' => 'Teacher',
        'tch_email' => 'active.teacher@example.com',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($this->admin, 'admin')
        ->get(route('admin.teacher.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Teacher/index')
        ->has('teachers.data', 1)
        ->where('teachers.data.0.status', 'active')
        ->where('teachers.data.0.tch_fname', 'Active')
        ->where('teachers.data.0.tch_lname', 'Teacher')
    );
});

test('admin archived teacher index passes inactive status to inertia view', function () {
    Teacher::create([
        'tch_fname' => 'Archived',
        'tch_lname' => 'Teacher',
        'tch_email' => 'archived.teacher@example.com',
        'status' => 'inactive',
        'is_deleted' => true,
    ]);

    $response = $this->actingAs($this->admin, 'admin')
        ->get(route('admin.teacher.index', ['archived' => 1]));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('Admin/Teacher/index')
        ->has('teachers.data', 1)
        ->where('teachers.data.0.status', 'inactive')
        ->where('teachers.data.0.tch_fname', 'Archived')
        ->where('teachers.data.0.tch_lname', 'Teacher')
    );
});
