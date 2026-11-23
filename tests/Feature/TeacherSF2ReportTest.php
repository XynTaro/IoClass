<?php

use App\Models\Teacher;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

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

    $tempFile = storage_path('framework/cache/test_sf2_verif_'.uniqid('', true).'.xlsx');
    file_put_contents($tempFile, $content);

    try {
        $spreadsheet = IOFactory::load($tempFile);
        expect($spreadsheet->getSheetCount())->toBe(1);
        expect($spreadsheet->getActiveSheet()->getTitle())->toBe('SEPTEMBER');

        $activeSheet = $spreadsheet->getActiveSheet();
        expect($activeSheet->getCell('I12')->getValue())->toBe('Jupiter');
        expect((string) $activeSheet->getCell('AN8')->getValue())->toBe('7');
        expect($activeSheet->getCell('BN11')->getValue())->toBe('SEPTEMBER');
        expect($activeSheet->getStyle('K16')->getAlignment()->getHorizontal())->toBe(Alignment::HORIZONTAL_CENTER);
        expect($activeSheet->getStyle('K18')->getAlignment()->getHorizontal())->toBe(Alignment::HORIZONTAL_CENTER);
        expect($activeSheet->getStyle('K33')->getAlignment()->getHorizontal())->toBe(Alignment::HORIZONTAL_CENTER);
        expect($activeSheet->getStyle('K51')->getAlignment()->getHorizontal())->toBe(Alignment::HORIZONTAL_CENTER);
        expect($activeSheet->getStyle('K52')->getAlignment()->getHorizontal())->toBe(Alignment::HORIZONTAL_CENTER);
    } finally {
        @unlink($tempFile);
    }
});

test('sf2 report aggregates multiple per-subject attendance rows on the same date deterministically', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-05-31',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Saturn',
        'gr_level' => '7',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Clara',
        'tch_lname' => 'Lim',
        'tch_email' => 'clara.lim.sf2@example.com',
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

    $stuId = DB::table('student')->insertGetId([
        'stu_fname' => 'Marco',
        'stu_lname' => 'Reyes',
        'gender' => 'male',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    $subj1Id = DB::table('subject')->insertGetId(['subj_code' => 'MATH', 'subj_name' => 'Math'], 'subj_id');
    $subj2Id = DB::table('subject')->insertGetId(['subj_code' => 'ENG', 'subj_name' => 'English'], 'subj_id');

    // Absent in period 1 (inserted first), present in period 2 on 2025-09-01
    DB::table('attendance')->insert([
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'subj_id' => $subj1Id,
            'sy_id' => $syId,
            'att_date' => '2025-09-01',
            'status' => 'absent',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'subj_id' => $subj2Id,
            'sy_id' => $syId,
            'att_date' => '2025-09-01',
            'status' => 'present',
        ],
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.index', [
            'sy_id' => $syId,
            'month' => 9,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('rows.0.days.1', 'present')
        );
});

test('sf2 export and index only mark X on recorded absent days up to today and leave tomorrow and unrecorded days blank', function () {
    $this->travelTo('2026-11-23 10:00:00');

    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2026-2027',
        'start_date' => '2026-06-01',
        'end_date' => '2027-03-31',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Neptune',
        'gr_level' => '8',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Rosa',
        'tch_lname' => 'Mendoza',
        'tch_email' => 'rosa.mendoza.sf2@example.com',
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

    $stuId = DB::table('student')->insertGetId([
        'stu_fname' => 'Paolo',
        'stu_lname' => 'Garcia',
        'gender' => 'male',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    // Nov 20 (Fri) = present, Nov 23 (Mon, today) = absent, Nov 19 (Thu) = no record, Nov 24 (Tue, tomorrow) = future
    DB::table('attendance')->insert([
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-11-20',
            'status' => 'present',
        ],
        [
            'stu_id' => $stuId,
            'sect_id' => $sectId,
            'sy_id' => $syId,
            'att_date' => '2026-11-23',
            'status' => 'absent',
        ],
    ]);

    // Verify web preview does not mark future or unrecorded days absent
    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.index', [
            'sy_id' => $syId,
            'month' => 11,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('rows.0.days.19', null)
            ->where('rows.0.days.20', 'present')
            ->where('rows.0.days.23', 'absent')
            ->where('rows.0.days.24', null)
            ->where('rows.0.totals.absent', 1)
            ->where('rows.0.totals.present', 1)
        );

    // Verify Excel export puts X ONLY on day 23 and leaves day 19, 20, and tomorrow (24) blank
    $response = $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.export', [
            'sy_id' => $syId,
            'month' => 11,
        ]))
        ->assertOk();

    ob_start();
    $response->sendContent();
    $content = ob_get_clean();

    $tempFile = storage_path('framework/cache/test_sf2_future_'.uniqid('', true).'.xlsx');
    file_put_contents($tempFile, $content);

    try {
        $spreadsheet = IOFactory::load($tempFile);
        $sheet = $spreadsheet->getActiveSheet();

        $dayCols = [];
        foreach (['K', 'M', 'N', 'O', 'S', 'V', 'W', 'Z', 'AA', 'AB', 'AE', 'AH', 'AI', 'AL', 'AN', 'AP', 'AR', 'AS', 'AU', 'AV', 'AW', 'AY', 'BB', 'BD', 'BE'] as $col) {
            $dayVal = $sheet->getCell($col.'16')->getValue();
            if ($dayVal !== null && $dayVal !== '') {
                $dayCols[(int) $dayVal] = $col;
            }
        }

        expect($sheet->getCell($dayCols[23].'18')->getValue())->toBe('X');
        expect((string) $sheet->getCell($dayCols[24].'18')->getValue())->toBe('');
        expect((string) $sheet->getCell($dayCols[19].'18')->getValue())->toBe('');
        expect((string) $sheet->getCell($dayCols[20].'18')->getValue())->toBe('');
        expect($sheet->getCell('BI18')->getValue())->toBe(1);
        expect($sheet->getCell('BL18')->getValue())->toBe(1);
        expect($sheet->getCell($dayCols[23].'33')->getValue())->toBe(1);
        expect((string) $sheet->getCell($dayCols[24].'33')->getValue())->toBe('');
    } finally {
        @unlink($tempFile);
    }
});
