<?php

/**
 * Feature tests for School Year CRUD operations.
 *
 * Validates that admins can create and update school years with proper
 * label, date, and active-status constraints enforced by the controller.
 */

use App\Models\Admin;
use App\Models\School_Year;

test('admin can store a school year with valid label and dates', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => true,
    ]);

    $response->assertRedirect(route('admin.school-year.index'));
    $created = School_Year::where('sy_label', '2026-2027')->first();
    expect($created)->not->toBeNull();
    expect($created->start_date->format('Y-m-d'))->toBe('2026-06-01');
    expect($created->end_date->format('Y-m-d'))->toBe('2027-03-31');
    expect($created->is_active)->toBeTrue();
});

test('storing a school year requires label, start_date, and end_date', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '',
        'start_date' => '',
        'end_date' => '',
    ]);

    $response->assertSessionHasErrors(['sy_label', 'start_date', 'end_date']);
});

test('end_date must be on or after start_date', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2026-05-01',
    ]);

    $response->assertSessionHasErrors(['end_date']);
});

test('updating a school year requires label, start_date, and end_date', function () {
    $admin = Admin::factory()->create();
    $schoolYear = School_Year::create([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-03-31',
        'is_active' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')->put(route('admin.school-year.update', ['id' => $schoolYear->sy_id]), [
        'sy_label' => '',
        'start_date' => '',
        'end_date' => '',
    ]);

    $response->assertSessionHasErrors(['sy_label', 'start_date', 'end_date']);
});
