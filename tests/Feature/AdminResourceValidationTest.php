<?php

use App\Models\Admin;
use App\Models\Building;
use App\Models\Subject;

test('storing a room requires room_no and building_id', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.room.store'), [
        'room_no' => '',
        'building_id' => '',
    ]);

    $response->assertSessionHasErrors(['room_no', 'building_id']);
});

test('storing a room succeeds with valid data', function () {
    $admin = Admin::factory()->create();
    $building = Building::create(['building_name' => 'Science Wing', 'is_deleted' => false]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.room.store'), [
        'room_no' => 'LAB-101',
        'building_id' => $building->building_id,
    ]);

    $response->assertRedirect(route('admin.room.index'));
    $this->assertDatabaseHas('room', [
        'room_no' => 'LAB-101',
        'building_id' => $building->building_id,
    ]);
});

test('storing a section requires sect_name and gr_level', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.section.store'), [
        'sect_name' => '',
        'gr_level' => '',
    ]);

    $response->assertSessionHasErrors(['sect_name', 'gr_level']);
});

test('storing a section succeeds with valid data', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.section.store'), [
        'sect_name' => 'Aguinaldo',
        'gr_level' => 'Grade 8',
    ]);

    $response->assertRedirect(route('admin.section.index'));
    $this->assertDatabaseHas('section', [
        'sect_name' => 'Aguinaldo',
        'gr_level' => 'Grade 8',
    ]);
});

test('storing a subject requires subj_code, subj_name, and gr_level', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.subject.store'), [
        'subj_code' => '',
        'subj_name' => '',
        'gr_level' => '',
    ]);

    $response->assertSessionHasErrors(['subj_code', 'subj_name', 'gr_level']);
});

test('storing a subject succeeds with valid data', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.subject.store'), [
        'subj_code' => 'SCI-101',
        'subj_name' => 'Integrated Science',
        'gr_level' => 'Grade 8',
    ]);

    $response->assertRedirect(route('admin.subject.index'));
    $this->assertDatabaseHas('subject', [
        'subj_code' => 'SCI-101',
        'subj_name' => 'Integrated Science',
        'gr_level' => 'Grade 8',
    ]);
});

test('updating a subject requires subj_code, subj_name, and gr_level', function () {
    $admin = Admin::factory()->create();
    $subject = Subject::create([
        'subj_code' => 'MATH-7',
        'subj_name' => 'Grade 7 Math',
        'gr_level' => 'Grade 7',
    ]);

    $response = $this->actingAs($admin, 'admin')->put(route('admin.subject.update', $subject->subj_id), [
        'subj_code' => '',
        'subj_name' => '',
        'gr_level' => '',
    ]);

    $response->assertSessionHasErrors(['subj_code', 'subj_name', 'gr_level']);
});

test('storing a building requires building_name', function () {
    $admin = Admin::factory()->create();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.building.store'), [
        'building_name' => '',
    ]);

    $response->assertSessionHasErrors(['building_name']);
});
