<?php

use App\Models\Teacher;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;

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

test('sf2 report exports isolated month sheet and maps all weekday columns cleanly', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-05-31',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Jupiter',
        'gr_level' => '7',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Elena',
        'tch_lname' => 'Reyes',
        'tch_email' => 'elena.reyes.sf2@example.com',
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

    // Export September (month 9)
    $response = $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.export', [
            'sy_id' => $syId,
            'month' => 9,
        ]))
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    $disposition = (string) $response->headers->get('content-disposition');
    expect($disposition)->toContain('attachment');
    expect($disposition)->toContain('SF2_Jupiter_Grade7_September_2025-2026.xlsx');

    // Save streamed output and verify with PhpSpreadsheet
    ob_start();
    $response->sendContent();
    $content = ob_get_clean();

    $tempFile = tempnam(sys_get_temp_dir(), 'test_sf2_verif_');
    file_put_contents($tempFile, $content);

    try {
        $spreadsheet = IOFactory::load($tempFile);
        expect($spreadsheet->getSheetCount())->toBe(1);
        expect($spreadsheet->getActiveSheet()->getTitle())->toBe('SEPTEMBER');

        $activeSheet = $spreadsheet->getActiveSheet();
        expect($activeSheet->getCell('I12')->getValue())->toBe('Jupiter');
        expect((string) $activeSheet->getCell('AN8')->getValue())->toBe('7');
        expect($activeSheet->getCell('BN11')->getValue())->toBe('SEPTEMBER');
    } finally {
        @unlink($tempFile);
    }
});
