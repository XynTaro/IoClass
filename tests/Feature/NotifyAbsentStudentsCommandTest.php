<?php

use App\Models\Student;
use App\Services\StudentAbsenceNotifier;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    // Active school year
    $this->syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2026-2027',
        'is_active' => true,
    ]);

    // Section
    $this->sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Test Section',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ]);
});

test('inactive students are not notified when absent', function () {
    $notifier = Mockery::mock(StudentAbsenceNotifier::class);
    $notifier->shouldNotReceive('notify');
    $this->app->instance(StudentAbsenceNotifier::class, $notifier);

    Student::create([
        'lrn' => '100000000001',
        'stu_fname' => 'Inactive',
        'stu_lname' => 'Student',
        'status' => 'inactive',
        'is_deleted' => false,
    ]);

    $this->artisan('attendance:notify-absent', ['--date' => today()->toDateString()])
        ->assertSuccessful();
});

test('active absent students trigger the notifier', function () {
    $notifiedIds = [];

    $notifier = Mockery::mock(StudentAbsenceNotifier::class);
    $notifier->shouldReceive('notify')
        ->once()
        ->withArgs(function (Student $student) use (&$notifiedIds) {
            $notifiedIds[] = $student->stu_id;

            return $student->status === 'active';
        })
        ->andReturn(true);

    $this->app->instance(StudentAbsenceNotifier::class, $notifier);

    $activeStudent = Student::create([
        'lrn' => '100000000002',
        'stu_fname' => 'Active',
        'stu_lname' => 'Absent',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $activeStudent->stu_id,
        'sect_id' => $this->sectId,
        'sy_id' => $this->syId,
    ]);

    $this->artisan('attendance:notify-absent', [
        '--date' => today()->toDateString(),
        '--force' => true,
    ])->assertSuccessful();

    expect($notifiedIds)->toContain($activeStudent->stu_id);
});

test('present students do not trigger the notifier', function () {
    $notifier = Mockery::mock(StudentAbsenceNotifier::class);
    $notifier->shouldNotReceive('notify');
    $this->app->instance(StudentAbsenceNotifier::class, $notifier);

    $activeStudent = Student::create([
        'lrn' => '100000000003',
        'stu_fname' => 'Active',
        'stu_lname' => 'Present',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    DB::table('student_section')->insert([
        'stu_id' => $activeStudent->stu_id,
        'sect_id' => $this->sectId,
        'sy_id' => $this->syId,
    ]);

    DB::table('attendance')->insert([
        'stu_id' => $activeStudent->stu_id,
        'att_date' => today()->toDateString(),
        'status' => 'present',
        'time_in' => now(),
    ]);

    $this->artisan('attendance:notify-absent', ['--date' => today()->toDateString()])
        ->assertSuccessful();
});
