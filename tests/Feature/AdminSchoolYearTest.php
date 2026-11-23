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

test('admin can store and update a school year with semester dates', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2027-2028',
        'start_date' => '2027-08-01',
        'end_date' => '2028-05-31',
        'sem1_start_date' => '2027-08-01',
        'sem1_end_date' => '2027-12-18',
        'sem2_start_date' => '2028-01-08',
        'sem2_end_date' => '2028-05-31',
        'is_active' => false,
    ]);

    $response->assertRedirect(route('admin.school-year.index'));
    $created = School_Year::where('sy_label', '2027-2028')->first();
    expect($created)->not->toBeNull();
    expect($created->sem1_start_date?->format('Y-m-d'))->toBe('2027-08-01');
    expect($created->sem1_end_date?->format('Y-m-d'))->toBe('2027-12-18');
    expect($created->sem2_start_date?->format('Y-m-d'))->toBe('2028-01-08');
    expect($created->sem2_end_date?->format('Y-m-d'))->toBe('2028-05-31');

    // Update with new semester end dates
    $updateResponse = $this->actingAs($admin, 'admin')->put(route('admin.school-year.update', ['id' => $created->sy_id]), [
        'sy_label' => '2027-2028',
        'start_date' => '2027-08-01',
        'end_date' => '2028-05-31',
        'sem1_start_date' => '2027-08-01',
        'sem1_end_date' => '2027-12-22',
        'sem2_start_date' => '2028-01-10',
        'sem2_end_date' => '2028-05-31',
        'is_active' => false,
    ]);

    $updateResponse->assertRedirect(route('admin.school-year.index'));
    $updated = $created->fresh();
    expect($updated->sem1_end_date?->format('Y-m-d'))->toBe('2027-12-22');
    expect($updated->sem2_start_date?->format('Y-m-d'))->toBe('2028-01-10');
});

test('sem1_end_date and sem2_end_date must be on or after their start dates', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2028-2029',
        'start_date' => '2028-08-01',
        'end_date' => '2029-05-31',
        'sem1_start_date' => '2028-08-01',
        'sem1_end_date' => '2028-07-31', // before start
        'sem2_start_date' => '2029-01-08',
        'sem2_end_date' => '2029-01-01', // before start
    ]);

    $response->assertSessionHasErrors(['sem1_end_date', 'sem2_end_date']);
});

test('school year model getSemester helper resolves accurate semesters', function () {
    $sy = School_Year::create([
        'sy_label' => '2025-2026',
        'start_date' => '2025-08-01',
        'end_date' => '2026-05-31',
        'sem1_start_date' => '2025-08-01',
        'sem1_end_date' => '2025-12-18',
        'sem2_start_date' => '2026-01-05',
        'sem2_end_date' => '2026-05-31',
        'is_active' => true,
    ]);

    expect($sy->getSemester('2025-08-15'))->toBe('First Semester');
    expect($sy->getSemester('2025-12-10'))->toBe('First Semester');
    expect($sy->getSemester('2026-01-10'))->toBe('Second Semester');
    expect($sy->getSemester('2026-04-20'))->toBe('Second Semester');

    // Without explicit semester dates, it falls back cleanly to midpoint
    $syFallback = School_Year::create([
        'sy_label' => '2029-2030',
        'start_date' => '2029-08-01',
        'end_date' => '2030-05-31',
        'is_active' => false,
    ]);

    expect($syFallback->getSemester('2029-09-01'))->toBe('First Semester');
    expect($syFallback->getSemester('2030-03-01'))->toBe('Second Semester');
});

test('upcoming school year can be added as inactive without deactivating the current school year', function () {
    $this->travelTo('2026-11-23 09:00:00');
    $admin = Admin::factory()->create();

    $currentSy = School_Year::create([
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => true,
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2027-2028',
        'start_date' => '2027-06-01',
        'end_date' => '2028-03-31',
        'is_active' => false,
    ]);

    $response->assertRedirect(route('admin.school-year.index'));

    $upcomingSy = School_Year::where('sy_label', '2027-2028')->first();
    expect($upcomingSy)->not->toBeNull();
    expect($upcomingSy->is_active)->toBeFalse();
    expect($upcomingSy->getTrackingStatus())->toBe(School_Year::STATUS_UPCOMING);
    expect($currentSy->fresh()->is_active)->toBeTrue();
});

test('upcoming school year cannot be stored or updated as active', function () {
    $this->travelTo('2026-11-23 09:00:00');
    $admin = Admin::factory()->create();

    $currentSy = School_Year::create([
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => true,
    ]);

    $storeResponse = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2027-2028',
        'start_date' => '2027-06-01',
        'end_date' => '2028-03-31',
        'is_active' => true,
    ]);

    $storeResponse->assertSessionHasErrors(['is_active']);
    expect(School_Year::where('sy_label', '2027-2028')->exists())->toBeFalse();
    expect($currentSy->fresh()->is_active)->toBeTrue();

    $upcomingSy = School_Year::create([
        'sy_label' => '2027-2028',
        'start_date' => '2027-06-01',
        'end_date' => '2028-03-31',
        'is_active' => false,
    ]);

    $updateResponse = $this->actingAs($admin, 'admin')->put(route('admin.school-year.update', ['id' => $upcomingSy->sy_id]), [
        'sy_label' => '2027-2028',
        'start_date' => '2027-06-01',
        'end_date' => '2028-03-31',
        'is_active' => true,
    ]);

    $updateResponse->assertSessionHasErrors(['is_active']);
    expect($upcomingSy->fresh()->is_active)->toBeFalse();
    expect($currentSy->fresh()->is_active)->toBeTrue();
});

test('ended school year cannot be stored or updated as active', function () {
    $this->travelTo('2026-11-23 09:00:00');
    $admin = Admin::factory()->create();

    $storeResponse = $this->actingAs($admin, 'admin')->post(route('admin.school-year.store'), [
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-03-31',
        'is_active' => true,
    ]);

    $storeResponse->assertSessionHasErrors(['is_active']);

    $endedSy = School_Year::create([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-03-31',
        'is_active' => false,
    ]);

    $updateResponse = $this->actingAs($admin, 'admin')->put(route('admin.school-year.update', ['id' => $endedSy->sy_id]), [
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-03-31',
        'is_active' => true,
    ]);

    $updateResponse->assertSessionHasErrors(['is_active']);
    expect($endedSy->fresh()->is_active)->toBeFalse();
});

test('system automatically tracks and switches active school year when date rolls over', function () {
    $this->travelTo('2026-11-23 09:00:00');
    $admin = Admin::factory()->create();

    $sy2627 = School_Year::create([
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => false,
    ]);

    $sy2728 = School_Year::create([
        'sy_label' => '2027-2028',
        'start_date' => '2027-06-01',
        'end_date' => '2028-03-31',
        'is_active' => false,
    ]);

    // In November 2026, visiting index syncs 2026-2027 as active and marks 2027-2028 as upcoming.
    $this->actingAs($admin, 'admin')
        ->get(route('admin.school-year.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/SchoolYear/Index')
            ->where('today', '2026-11-23')
            ->where('activeSchoolYear.sy_label', '2026-2027')
        );

    expect($sy2627->fresh()->is_active)->toBeTrue();
    expect($sy2728->fresh()->is_active)->toBeFalse();

    // Advance clock into SY 2027-2028; syncing automatically transitions active school year.
    $this->travelTo('2027-06-01 08:00:00');

    $this->artisan('school-year:sync-active')->assertSuccessful();

    expect($sy2627->fresh()->is_active)->toBeFalse();
    expect($sy2728->fresh()->is_active)->toBeTrue();
});

test('archiving an active school year deactivates it', function () {
    $this->travelTo('2026-11-23 09:00:00');
    $admin = Admin::factory()->create();

    $sy2627 = School_Year::create([
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => true,
    ]);

    $this->actingAs($admin, 'admin')
        ->delete(route('admin.school-year.destroy', ['school_Year' => $sy2627->sy_id]))
        ->assertRedirect(route('admin.school-year.index'));

    $fresh = $sy2627->fresh();
    expect($fresh->is_deleted)->toBeTrue();
    expect($fresh->is_active)->toBeFalse();
});
