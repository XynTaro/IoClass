<?php

use App\Models\Admin;
use App\Models\Building;
use App\Models\Room;
use App\Models\Section;

test('schedule management section page passes active buildings including buildings without rooms', function () {
    $admin = Admin::factory()->create();

    $section = Section::create([
        'sect_name' => 'Grade 7 - Emerald',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);

    $emptyBuilding = Building::create([
        'building_name' => 'Science Building',
        'is_deleted' => false,
    ]);

    Building::create([
        'building_name' => 'Archived Building',
        'is_deleted' => true,
    ]);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.schedule.section.show', ['sectionId' => $section->sect_id]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Admin/Schedule Management/Show')
            ->has('rooms', 0)
            ->has('buildings', 1)
            ->where('buildings.0.building_id', $emptyBuilding->building_id)
            ->where('buildings.0.building_name', 'Science Building')
        );
});

test('storing a room with stay_on_page redirects back to schedule management', function () {
    $admin = Admin::factory()->create();

    $section = Section::create([
        'sect_name' => 'Grade 8 - Pearl',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ]);

    $building = Building::create([
        'building_name' => 'Main Building',
        'is_deleted' => false,
    ]);

    $scheduleUrl = route('admin.schedule.section.show', ['sectionId' => $section->sect_id]);

    $response = $this->actingAs($admin, 'admin')
        ->from($scheduleUrl)
        ->post(route('admin.room.store'), [
            'room_no' => '205',
            'building_id' => $building->building_id,
            'stay_on_page' => true,
        ]);

    $response->assertRedirect($scheduleUrl);
    $response->assertSessionHas('success', 'Room successfully added.');

    $room = Room::where('room_no', '205')->first();
    expect($room)->not->toBeNull()
        ->and($room->building_id)->toBe($building->building_id)
        ->and($room->is_deleted)->toBeFalse();
});

test('storing a room without stay_on_page redirects to room index', function () {
    $admin = Admin::factory()->create();

    $building = Building::create([
        'building_name' => 'Annex Building',
        'is_deleted' => false,
    ]);

    $response = $this->actingAs($admin, 'admin')
        ->post(route('admin.room.store'), [
            'room_no' => '301',
            'building_id' => $building->building_id,
        ]);

    $response->assertRedirect(route('admin.room.index'));
    $response->assertSessionHas('success', 'Room successfully added.');
});
