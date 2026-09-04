<?php

use App\Models\Teacher;
use Illuminate\Support\Facades\DB;

test('sf2 report uses school year to resolve calendar year for a month', function () {
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
        'tch_fname' => 'Lina',
        'tch_lname' => 'Cruz',
        'tch_email' => 'lina.cruz.sf2@example.com',
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
        ->get(route('teacher.sf2-reports.index', [
            'sy_id' => $syId,
            'month' => 1,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/SF2-REPORTS/index')
            ->where('selectedSyId', $syId)
            ->where('schoolYearLabel', '2025-2026')
            ->where('selectedMonth', 1)
            ->where('selectedYear', 2026)
            ->where('sectionInfo.sect_name', 'Mars')
            ->has('schoolYears', 1)
            ->missing('sections')
        );

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.index', [
            'sy_id' => $syId,
            'month' => 8,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('selectedMonth', 8)
            ->where('selectedYear', 2025)
        );
});

test('sf2 report shows not adviser when teacher has no advisory section', function () {
    DB::table('school_year')->insert([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-05-31',
        'is_active' => true,
        'is_deleted' => false,
    ]);

    $teacher = Teacher::create([
        'tch_fname' => 'Rico',
        'tch_lname' => 'Tan',
        'tch_email' => 'rico.tan.sf2@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/SF2-REPORTS/index')
            ->where('isAdviser', false)
        );
});
