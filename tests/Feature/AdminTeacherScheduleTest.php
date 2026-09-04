<?php

use App\Models\Admin;
use Illuminate\Support\Facades\DB;

/**
 * @return array{
 *     syId: int,
 *     sectIds: list<int>,
 *     roomIds: list<int>,
 *     subjId: int,
 *     adviserSectId: int
 * }
 */
function seedTeacherScheduleFixtures(): array
{
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectIds = [];
    foreach (['A', 'B', 'C', 'D'] as $name) {
        $sectIds[] = DB::table('section')->insertGetId([
            'sect_name' => $name,
            'gr_level' => 'Grade 7',
            'is_deleted' => false,
        ], 'sect_id');
    }

    $adviserSectId = DB::table('section')->insertGetId([
        'sect_name' => 'Advisory',
        'gr_level' => 'Grade 8',
        'is_deleted' => false,
    ], 'sect_id');

    $buildingId = DB::table('building')->insertGetId([
        'building_name' => 'Main',
        'is_deleted' => false,
    ], 'building_id');

    $roomIds = [];
    foreach (['101', '102', '103', '104'] as $roomNo) {
        $roomIds[] = DB::table('room')->insertGetId([
            'room_no' => $roomNo,
            'building_id' => $buildingId,
            'is_deleted' => false,
        ], 'room_id');
    }

    $subjId = DB::table('subject')->insertGetId([
        'subj_code' => 'MATH7',
        'subj_name' => 'Mathematics 7',
        'is_deleted' => false,
    ], 'subj_id');

    return [
        'syId' => $syId,
        'sectIds' => $sectIds,
        'roomIds' => $roomIds,
        'subjId' => $subjId,
        'adviserSectId' => $adviserSectId,
    ];
}

function validTeacherPayload(): array
{
    return [
        'tch_fname' => 'Jane',
        'tch_mname' => null,
        'tch_lname' => 'Doe',
        'tch_email' => 'jane.doe@example.com',
        'tch_pw' => 'password123',
        'tch_pw_confirmation' => 'password123',
        'same_as_permanent' => true,
        'perm_region' => 'Region IV-A',
        'perm_province' => 'Laguna',
        'perm_municipality' => 'Calamba',
        'perm_barangay' => 'Poblacion',
    ];
}

test('teacher wizard creates multiple schedule rows from multi-day multi-slot payload', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.teacher.storeWithAddress'), array_merge(validTeacherPayload(), [
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                'start_time' => '08:00',
                'end_time' => '08:45',
            ],
            [
                'sect_id' => $fixtures['sectIds'][1],
                'room_id' => $fixtures['roomIds'][1],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday'],
                'start_time' => '09:00',
                'end_time' => '09:45',
            ],
            [
                'sect_id' => $fixtures['sectIds'][2],
                'room_id' => $fixtures['roomIds'][2],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday'],
                'start_time' => '10:00',
                'end_time' => '10:45',
            ],
            [
                'sect_id' => $fixtures['sectIds'][3],
                'room_id' => $fixtures['roomIds'][3],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday'],
                'start_time' => '11:00',
                'end_time' => '11:45',
            ],
        ],
    ]));

    $response->assertRedirect(route('admin.teacher.index'));

    $teacherId = DB::table('teacher')->where('tch_email', 'jane.doe@example.com')->value('tch_id');

    expect($teacherId)->not->toBeNull();
    expect(DB::table('class_schedule')->where('tch_id', $teacherId)->count())->toBe(8);

    expect(
        DB::table('class_schedule')
            ->where('tch_id', $teacherId)
            ->where('sect_id', $fixtures['sectIds'][0])
            ->pluck('day_of_week')
            ->sort()
            ->values()
            ->all()
    )->toBe(['Friday', 'Monday', 'Thursday', 'Tuesday', 'Wednesday']);
});

test('teacher wizard can save adviser assignment with schedules', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $this->actingAs($admin, 'admin')->post(route('admin.teacher.storeWithAddress'), array_merge(validTeacherPayload(), [
        'tch_email' => 'adviser@example.com',
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday'],
                'start_time' => '08:00',
                'end_time' => '08:45',
            ],
        ],
        'is_adviser' => true,
        'adviser_sect_id' => $fixtures['adviserSectId'],
    ]))->assertRedirect(route('admin.teacher.index'));

    $teacherId = DB::table('teacher')->where('tch_email', 'adviser@example.com')->value('tch_id');

    expect(DB::table('adviser')->where('tch_id', $teacherId)->count())->toBe(1);
    expect(DB::table('adviser')->where('tch_id', $teacherId)->value('sect_id'))->toBe($fixtures['adviserSectId']);
});

test('schedule store endpoint creates expanded rows for existing teacher', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacherId = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Existing',
        'tch_lname' => 'Teacher',
        'tch_email' => 'existing@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    $this->actingAs($admin, 'admin')->post(route('admin.schedule.store'), [
        'tch_id' => $teacherId,
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday', 'Friday'],
                'start_time' => '13:00',
                'end_time' => '13:45',
            ],
        ],
    ])->assertRedirect();

    expect(DB::table('class_schedule')->where('tch_id', $teacherId)->count())->toBe(2);
});

test('schedule update endpoint updates a single row', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacherId = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Edit',
        'tch_lname' => 'Teacher',
        'tch_email' => 'edit@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    $scheduleId = DB::table('class_schedule')->insertGetId([
        'tch_id' => $teacherId,
        'sect_id' => $fixtures['sectIds'][0],
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Monday',
        'start_time' => '08:00:00',
        'end_time' => '08:45:00',
    ], 'schedule_id');

    $this->actingAs($admin, 'admin')->put(route('admin.schedule.update', $scheduleId), [
        'sect_id' => $fixtures['sectIds'][1],
        'room_id' => $fixtures['roomIds'][1],
        'subj_id' => $fixtures['subjId'],
        'day_of_week' => 'Tuesday',
        'start_time' => '09:00',
        'end_time' => '09:45',
    ])->assertRedirect();

    $updated = DB::table('class_schedule')->where('schedule_id', $scheduleId)->first();

    expect($updated->sect_id)->toBe($fixtures['sectIds'][1]);
    expect($updated->day_of_week)->toBe('Tuesday');
    expect($updated->start_time)->toBe('09:00');
});

test('schedule creation rejects intra-batch teacher time overlap', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.teacher.storeWithAddress'), array_merge(validTeacherPayload(), [
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday', 'Tuesday'],
                'start_time' => '08:00',
                'end_time' => '09:00',
            ],
            [
                'sect_id' => $fixtures['sectIds'][1],
                'room_id' => $fixtures['roomIds'][1],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday'],
                'start_time' => '08:30',
                'end_time' => '09:30',
            ],
        ],
    ]));

    $response->assertSessionHasErrors(['schedules.1.start_time']);
    expect(DB::table('class_schedule')->count())->toBe(0);
});

test('schedule creation rejects intra-batch room overlap', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.teacher.storeWithAddress'), array_merge(validTeacherPayload(), [
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Wednesday'],
                'start_time' => '10:00',
                'end_time' => '11:00',
            ],
            [
                'sect_id' => $fixtures['sectIds'][1],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Wednesday'],
                'start_time' => '10:30',
                'end_time' => '11:30',
            ],
        ],
    ]));

    $response->assertSessionHasErrors();
    expect(DB::table('class_schedule')->count())->toBe(0);
});

test('schedule creation rejects intra-batch section overlap', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $response = $this->actingAs($admin, 'admin')->post(route('admin.teacher.storeWithAddress'), array_merge(validTeacherPayload(), [
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][0],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Thursday'],
                'start_time' => '13:00',
                'end_time' => '14:00',
            ],
            [
                'sect_id' => $fixtures['sectIds'][0],
                'room_id' => $fixtures['roomIds'][1],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Thursday'],
                'start_time' => '13:30',
                'end_time' => '14:30',
            ],
        ],
    ]));

    $response->assertSessionHasErrors();
    expect(DB::table('class_schedule')->count())->toBe(0);
});

test('schedule creation rejects overlapping schedule for same teacher in database', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacherId = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Existing',
        'tch_lname' => 'Teacher',
        'tch_email' => 'conflict.teacher@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacherId,
        'sect_id' => $fixtures['sectIds'][0],
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Monday',
        'start_time' => '08:00:00',
        'end_time' => '09:00:00',
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.schedule.store'), [
        'tch_id' => $teacherId,
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][1],
                'room_id' => $fixtures['roomIds'][1],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Monday'],
                'start_time' => '08:30',
                'end_time' => '09:30',
            ],
        ],
    ]);

    $response->assertSessionHasErrors(['schedules.0.start_time']);
    expect(DB::table('class_schedule')->where('tch_id', $teacherId)->count())->toBe(1);
});

test('schedule creation rejects overlapping schedule for same room in database', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacher1Id = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Teacher',
        'tch_lname' => 'One',
        'tch_email' => 't1@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    $teacher2Id = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Teacher',
        'tch_lname' => 'Two',
        'tch_email' => 't2@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher1Id,
        'sect_id' => $fixtures['sectIds'][0],
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Tuesday',
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.schedule.store'), [
        'tch_id' => $teacher2Id,
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][1],
                'room_id' => $fixtures['roomIds'][0], // Same room
                'subj_id' => $fixtures['subjId'],
                'days' => ['Tuesday'],
                'start_time' => '09:30',
                'end_time' => '10:30',
            ],
        ],
    ]);

    $response->assertSessionHasErrors(['schedules.0.room_id']);
    expect(DB::table('class_schedule')->where('tch_id', $teacher2Id)->count())->toBe(0);
});

test('schedule creation rejects overlapping schedule for same section in database', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacher1Id = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Teacher',
        'tch_lname' => 'One',
        'tch_email' => 't1.sect@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    $teacher2Id = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Teacher',
        'tch_lname' => 'Two',
        'tch_email' => 't2.sect@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher1Id,
        'sect_id' => $fixtures['sectIds'][0], // Section A
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Wednesday',
        'start_time' => '14:00:00',
        'end_time' => '15:00:00',
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.schedule.store'), [
        'tch_id' => $teacher2Id,
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][0], // Same section A
                'room_id' => $fixtures['roomIds'][1],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Wednesday'],
                'start_time' => '14:30',
                'end_time' => '15:30',
            ],
        ],
    ]);

    $response->assertSessionHasErrors(['schedules.0.sect_id']);
    expect(DB::table('class_schedule')->where('tch_id', $teacher2Id)->count())->toBe(0);
});

test('schedule creation allows contiguous back-to-back time slots', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacherId = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Back',
        'tch_lname' => 'ToBack',
        'tch_email' => 'backtoback@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacherId,
        'sect_id' => $fixtures['sectIds'][0],
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Friday',
        'start_time' => '08:00:00',
        'end_time' => '08:45:00',
    ]);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.schedule.store'), [
        'tch_id' => $teacherId,
        'schedules' => [
            [
                'sect_id' => $fixtures['sectIds'][1],
                'room_id' => $fixtures['roomIds'][1],
                'subj_id' => $fixtures['subjId'],
                'days' => ['Friday'],
                'start_time' => '08:45',
                'end_time' => '09:30',
            ],
        ],
    ]);

    $response->assertSessionHasNoErrors();
    expect(DB::table('class_schedule')->where('tch_id', $teacherId)->count())->toBe(2);
});

test('schedule update rejects conflict with existing schedule', function () {
    $admin = Admin::factory()->create();
    $fixtures = seedTeacherScheduleFixtures();

    $addId = DB::table('address')->insertGetId([], 'add_id');
    $teacher1 = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Up1',
        'tch_lname' => 'Teacher',
        'tch_email' => 'up1@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    $teacher2 = DB::table('teacher')->insertGetId([
        'add_id' => $addId,
        'tch_fname' => 'Up2',
        'tch_lname' => 'Teacher',
        'tch_email' => 'up2@example.com',
        'tch_pw' => 'hashed',
        'is_deleted' => false,
    ], 'tch_id');

    // Existing slot for teacher 1 in room 101 on Monday 08:00-09:00
    DB::table('class_schedule')->insert([
        'tch_id' => $teacher1,
        'sect_id' => $fixtures['sectIds'][0],
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Monday',
        'start_time' => '08:00:00',
        'end_time' => '09:00:00',
    ]);

    // Teacher 2 has a slot at 10:00-11:00
    $schedule2Id = DB::table('class_schedule')->insertGetId([
        'tch_id' => $teacher2,
        'sect_id' => $fixtures['sectIds'][1],
        'room_id' => $fixtures['roomIds'][1],
        'subj_id' => $fixtures['subjId'],
        'sy_id' => $fixtures['syId'],
        'day_of_week' => 'Monday',
        'start_time' => '10:00:00',
        'end_time' => '11:00:00',
    ], 'schedule_id');

    // Attempt to update teacher 2's slot to use room 101 at 08:30-09:30 (conflicts with room 101)
    $response = $this->actingAs($admin, 'admin')->put(route('admin.schedule.update', $schedule2Id), [
        'sect_id' => $fixtures['sectIds'][1],
        'room_id' => $fixtures['roomIds'][0],
        'subj_id' => $fixtures['subjId'],
        'day_of_week' => 'Monday',
        'start_time' => '08:30',
        'end_time' => '09:30',
    ]);

    $response->assertSessionHasErrors(['room_id']);
});
