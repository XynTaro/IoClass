<?php

use App\Models\Admin;
use App\Models\AuditTrail;
use App\Models\Teacher;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

test('guests cannot view the audit trail page', function () {
    $this->get(route('admin.audit-trail.index'))
        ->assertRedirect(route('login'));
});

test('teachers cannot view the audit trail page', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Ana',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ana.reyes.audit@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('admin.audit-trail.index'))
        ->assertRedirect(route('login'));
});

test('admins can view the audit trail with logged entries', function () {
    $admin = Admin::factory()->create();

    AuditTrail::factory()->count(3)->create();

    $this->actingAs($admin, 'admin')
        ->get(route('admin.audit-trail.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Audit trail/Index')
            ->has('logs.data', 3)
            ->has('actions')
        );
});

test('audit trail can be filtered by action', function () {
    $admin = Admin::factory()->create();

    AuditTrail::factory()->create(['action' => 'sf2.export', 'actor_name' => 'Exporter']);
    AuditTrail::factory()->create(['action' => 'login', 'actor_name' => 'Logger']);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.audit-trail.index', ['action' => 'sf2.export']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Audit trail/Index')
            ->has('logs.data', 1)
            ->where('logs.data.0.action', 'sf2.export')
            ->where('logs.data.0.actor_name', 'Exporter')
        );
});

test('audit trail can be filtered by role', function () {
    $admin = Admin::factory()->create();

    AuditTrail::factory()->create(['actor_type' => 'teacher', 'actor_name' => 'Teacher Actor']);
    AuditTrail::factory()->create(['actor_type' => 'admin', 'actor_name' => 'Admin Actor']);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.audit-trail.index', ['role' => 'teacher']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.actor_type', 'teacher')
            ->where('logs.data.0.actor_name', 'Teacher Actor')
        );
});

test('audit trail can be searched by user name', function () {
    $admin = Admin::factory()->create();

    AuditTrail::factory()->create(['actor_name' => 'Maria Santos']);
    AuditTrail::factory()->create(['actor_name' => 'Juan Cruz']);

    $this->actingAs($admin, 'admin')
        ->get(route('admin.audit-trail.index', ['q' => 'Maria']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('logs.data', 1)
            ->where('logs.data.0.actor_name', 'Maria Santos')
        );
});

test('teacher login is recorded in the audit trail', function () {
    $teacher = Teacher::create([
        'tch_fname' => 'Ben',
        'tch_lname' => 'Torres',
        'tch_email' => 'ben.torres.audit@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $this->post(route('login.submit'), [
        'email' => 'ben.torres.audit@example.com',
        'password' => 'password123',
    ])->assertRedirect(route('teacher.dashboard'));

    $entry = AuditTrail::where('actor_type', 'teacher')
        ->where('actor_id', $teacher->tch_id)
        ->where('action', 'login')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->actor_name)->toBe('Ben Torres');
});

test('admin login is recorded in the audit trail', function () {
    $admin = Admin::factory()->create(['fname' => 'Grace', 'lname' => 'Lim']);

    $this->post(route('login.submit'), [
        'email' => $admin->email,
        'password' => 'password',
    ])->assertRedirect(route('admin.dashboard'));

    $entry = AuditTrail::where('actor_type', 'admin')
        ->where('actor_id', $admin->admin_id)
        ->where('action', 'login')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->actor_name)->toBe('Grace Lim');
});

test('admin mutations are recorded automatically in the audit trail', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->post(route('admin.building.store'), ['building_name' => 'Science Wing'])
        ->assertRedirect(route('admin.building.index'));

    $entry = AuditTrail::where('actor_type', 'admin')
        ->where('actor_id', $admin->admin_id)
        ->where('action', 'building.store')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->description)->toBe('Created building');
});

test('failed admin mutations are not recorded in the audit trail', function () {
    $admin = Admin::factory()->create();

    $this->actingAs($admin, 'admin')
        ->from(route('admin.building.index'))
        ->post(route('admin.building.store'), ['building_name' => ''])
        ->assertRedirect(route('admin.building.index'))
        ->assertSessionHasErrors('building_name');

    expect(AuditTrail::where('action', 'building.store')->exists())->toBeFalse();
});

test('sf2 export request is recorded in the audit trail', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-05-31',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Mars',
        'gr_level' => '7',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Cara',
        'tch_lname' => 'Diaz',
        'tch_email' => 'cara.diaz.audit@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.export', [
            'sy_id' => $syId,
            'month' => 6,
        ]))
        ->assertOk();

    $entry = AuditTrail::where('actor_type', 'teacher')
        ->where('actor_id', $teacher->tch_id)
        ->where('action', 'sf2.export')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->properties['section'])->toBe('Mars');
});

test('attendance verification is recorded in the audit trail', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Venus',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_code' => 'ENG7',
        'subj_name' => 'English 7',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Dina',
        'tch_lname' => 'Lopez',
        'tch_email' => 'dina.lopez.audit@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $roomId = DB::table('room')->insertGetId([
        'room_no' => 'R-Audit',
        'is_deleted' => false,
    ], 'room_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subjId,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Tuesday',
        'start_time' => '09:00:00',
        'end_time' => '10:00:00',
    ]);

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '123456789020',
        'stu_fname' => 'Pedro',
        'stu_lname' => 'Ramos',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.verification.confirm'), [
            'date' => now()->toDateString(),
            'subj_id' => $subjId,
            'sect_id' => $sectId,
            'rows' => [
                ['stu_id' => $stuId, 'status' => 'present'],
            ],
        ])
        ->assertRedirect();

    $entry = AuditTrail::where('actor_type', 'teacher')
        ->where('actor_id', $teacher->tch_id)
        ->where('action', 'attendance.verify')
        ->first();

    expect($entry)->not->toBeNull()
        ->and($entry->properties['section'])->toBe('Venus')
        ->and($entry->properties['subject'])->toBe('English 7');
});

test('audit logs include actor avatar path', function () {
    $admin = Admin::factory()->create(['avatar' => 'avatars/admin_avatar.png']);
    $teacher = Teacher::create([
        'tch_fname' => 'Avatar',
        'tch_lname' => 'Teacher',
        'tch_email' => 'avatar.teacher@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
        'avatar' => 'avatars/teacher_avatar.png',
    ]);

    AuditTrail::record($admin, 'login', 'Logged in');
    AuditTrail::record($teacher, 'login', 'Logged in');

    $this->actingAs($admin, 'admin')
        ->get(route('admin.audit-trail.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('Admin/Audit trail/Index')
            ->has('logs.data', 2)
            ->where('logs.data.0.actor_avatar', asset('storage/avatars/teacher_avatar.png'))
            ->where('logs.data.1.actor_avatar', asset('storage/avatars/admin_avatar.png'))
        );
});
