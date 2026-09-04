<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\CalendarEvent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use stdClass;

class TeacherSF2Controller extends Controller
{
    /**
     * Resolve the calendar year for a month inside a school year.
     * Example: SY 2025-2026 (Jun–May) → June uses 2025, January uses 2026.
     */
    private function calendarYearForMonth(?stdClass $schoolYear, int $month): int
    {
        if ($schoolYear?->start_date && $schoolYear?->end_date) {
            $start = Carbon::parse($schoolYear->start_date)->startOfDay();
            $end = Carbon::parse($schoolYear->end_date)->endOfDay();

            $rangeStart = $start->copy()->startOfMonth();
            $rangeEnd = $end->copy()->endOfMonth();

            $candidate = Carbon::createFromDate($start->year, $month, 1)->startOfMonth();
            if ($candidate->gte($rangeStart) && $candidate->lte($rangeEnd)) {
                return (int) $candidate->year;
            }

            $candidate = Carbon::createFromDate($end->year, $month, 1)->startOfMonth();
            if ($candidate->gte($rangeStart) && $candidate->lte($rangeEnd)) {
                return (int) $candidate->year;
            }

            return $month >= $start->month
                ? (int) $start->year
                : (int) $end->year;
        }

        return (int) now()->format('Y');
    }

    /**
     * @return array{
     *     schoolYears: list<array{sy_id: int, sy_label: string, is_active: bool}>,
     *     selectedSyId: int|null,
     *     schoolYear: stdClass|null,
     *     selectedMonth: int,
     *     selectedYear: int,
     *     advisorySectId: int|null
     * }
     */
    private function resolvePeriodContext(Request $request, int $tchId): array
    {
        $schoolYears = DB::table('school_year')
            ->where('is_deleted', false)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['sy_id', 'sy_label', 'start_date', 'end_date', 'is_active']);

        $activeSyId = $schoolYears->firstWhere('is_active', true)?->sy_id
            ?? $schoolYears->first()?->sy_id;

        $syIdInput = $request->query('sy_id');
        $selectedSyId = is_numeric($syIdInput) ? (int) $syIdInput : ($activeSyId !== null ? (int) $activeSyId : null);

        $schoolYear = $selectedSyId !== null
            ? $schoolYears->firstWhere('sy_id', $selectedSyId)
            : null;

        if ($schoolYear === null && $activeSyId !== null) {
            $selectedSyId = (int) $activeSyId;
            $schoolYear = $schoolYears->firstWhere('sy_id', $selectedSyId);
        }

        $monthInput = $request->query('month');
        $selectedMonth = is_numeric($monthInput) ? (int) $monthInput : (int) now()->format('n');
        $selectedMonth = max(1, min(12, $selectedMonth));

        $selectedYear = $this->calendarYearForMonth($schoolYear, $selectedMonth);

        $advisorySectId = DB::table('adviser')
            ->where('tch_id', $tchId)
            ->when($selectedSyId, fn ($q) => $q->where('sy_id', $selectedSyId))
            ->where('is_active', true)
            ->value('sect_id');

        return [
            'schoolYears' => $schoolYears
                ->map(fn ($sy) => [
                    'sy_id' => (int) $sy->sy_id,
                    'sy_label' => (string) $sy->sy_label,
                    'is_active' => (bool) $sy->is_active,
                ])
                ->values()
                ->all(),
            'selectedSyId' => $selectedSyId,
            'schoolYear' => $schoolYear,
            'selectedMonth' => $selectedMonth,
            'selectedYear' => $selectedYear,
            'advisorySectId' => $advisorySectId !== null ? (int) $advisorySectId : null,
        ];
    }

    /**
     * Monthly attendance grid for the teacher's advisory section (SF2).
     * Only accessible by the section's active adviser.
     */
    public function index(Request $request): InertiaResponse
    {
        $teacher = $request->user('teacher');
        $tchId = (int) $teacher->tch_id;

        $context = $this->resolvePeriodContext($request, $tchId);
        $selectedSyId = $context['selectedSyId'];
        $schoolYear = $context['schoolYear'];
        $selectedMonth = $context['selectedMonth'];
        $selectedYear = $context['selectedYear'];
        $selectedSectId = $context['advisorySectId'];

        $periodStart = Carbon::createFromDate($selectedYear, $selectedMonth, 1)->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();
        $daysInMonth = $periodEnd->day;

        $rows = [];
        $maleSummaryByDay = array_fill(1, $daysInMonth, ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0]);
        $femaleSummaryByDay = array_fill(1, $daysInMonth, ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0]);
        $summaryByDay = array_fill(1, $daysInMonth, ['present' => 0, 'late' => 0, 'absent' => 0, 'excused' => 0]);

        if ($selectedSectId !== null) {
            // Pre-load non-school days for this month (holidays, breaks, suspensions)
            $nonSchoolDays = CalendarEvent::nonSchoolDayDatesInRange(
                $periodStart->toDateString(),
                $periodEnd->toDateString(),
                $selectedSyId,
            );

            $students = DB::table('student as s')
                ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
                ->where('ss.sect_id', $selectedSectId)
                ->when($selectedSyId, fn ($q) => $q->where('ss.sy_id', $selectedSyId))
                ->where('s.is_deleted', false)
                ->select('s.stu_id', 's.lrn', 's.stu_fname', 's.stu_mname', 's.stu_lname', 's.gender', 's.photo')
                ->orderBy('s.stu_lname')
                ->orderBy('s.stu_fname')
                ->get();

            $attendanceRecords = DB::table('attendance')
                ->where('sect_id', $selectedSectId)
                ->whereBetween('att_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
                ->select('stu_id', 'att_date', 'status')
                ->get()
                ->groupBy('stu_id');

            foreach ($students as $student) {
                $stuRecords = $attendanceRecords->get($student->stu_id, collect());
                $gender = strtolower((string) ($student->gender ?? 'male')) === 'female' ? 'female' : 'male';

                /** @var array<int, string> $days */
                $days = [];

                $absent = 0;
                $present = 0;
                $late = 0;
                $excused = 0;

                for ($day = 1; $day <= $daysInMonth; $day++) {
                    $date = Carbon::createFromDate($selectedYear, $selectedMonth, $day)->toDateString();
                    $record = $stuRecords->firstWhere('att_date', $date);

                    if ($record) {
                        $status = strtolower((string) $record->status);
                    } else {
                        $currentDate = Carbon::createFromDate($selectedYear, $selectedMonth, $day);
                        $dateStr = $currentDate->toDateString();
                        if ($currentDate->isWeekend()) {
                            $status = 'weekend';
                        } elseif (isset($nonSchoolDays[$dateStr])) {
                            $status = 'no_class';
                        } else {
                            $status = 'absent';
                        }
                    }

                    $days[$day] = $status;

                    match ($status) {
                        'present' => $present++,
                        'late' => $late++,
                        'excused' => $excused++,
                        'absent' => $absent++,
                        default => null,
                    };

                    if (in_array($status, ['present', 'late', 'absent', 'excused'], true)) {
                        $summaryByDay[$day][$status]++;
                        if ($gender === 'female') {
                            $femaleSummaryByDay[$day][$status]++;
                        } else {
                            $maleSummaryByDay[$day][$status]++;
                        }
                    }
                }

                $rows[] = [
                    'stu_id' => $student->stu_id,
                    'lrn' => $student->lrn,
                    'name' => $student->stu_lname.', '.$student->stu_fname.($student->stu_mname ? ' '.$student->stu_mname : ''),
                    'gender' => $gender,
                    'photo' => $student->photo,
                    'days' => $days,
                    'totals' => compact('present', 'late', 'excused', 'absent'),
                ];
            }
        }

        $sectionInfo = $selectedSectId
            ? DB::table('section')->where('sect_id', $selectedSectId)->first(['sect_name', 'gr_level'])
            : null;

        return Inertia::render('Teacher/SF2-REPORTS/index', [
            'sectionInfo' => $sectionInfo ? [
                'sect_name' => $sectionInfo->sect_name,
                'gr_level' => $sectionInfo->gr_level,
            ] : null,
            'schoolYears' => $context['schoolYears'],
            'selectedSyId' => $selectedSyId,
            'schoolYearLabel' => $schoolYear?->sy_label,
            'selectedMonth' => $selectedMonth,
            'selectedYear' => $selectedYear,
            'daysInMonth' => $daysInMonth,
            'rows' => $rows,
            'maleSummaryByDay' => $maleSummaryByDay,
            'femaleSummaryByDay' => $femaleSummaryByDay,
            'summaryByDay' => $summaryByDay,
            'isAdviser' => $selectedSectId !== null,
        ]);
    }

    /**
     * Export monthly attendance as a downloadable Excel file (SF2) using the official template.
     */
    public function export(Request $request): Response
    {
        $teacher = $request->user('teacher');
        $tchId = (int) $teacher->tch_id;

        $teacherRecord = DB::table('teacher')->where('tch_id', $tchId)->first(['tch_fname', 'tch_mname', 'tch_lname']);
        $middleInitial = $teacherRecord?->tch_mname
            ? strtoupper(substr(trim((string) $teacherRecord->tch_mname), 0, 1)).'.'
            : null;
        $adviserName = strtoupper(collect([
            $teacherRecord?->tch_fname,
            $middleInitial,
            $teacherRecord?->tch_lname,
        ])->filter()->implode(' '));

        $context = $this->resolvePeriodContext($request, $tchId);
        $selectedSyId = $context['selectedSyId'];
        $schoolYear = $context['schoolYear'];
        $selectedMonth = $context['selectedMonth'];
        $selectedYear = $context['selectedYear'];
        $selectedSectId = $context['advisorySectId'];

        abort_if(
            $selectedSectId === null,
            403,
            'You are not the adviser of a section for this school year.'
        );

        $periodStart = Carbon::createFromDate($selectedYear, $selectedMonth, 1)->startOfMonth();
        $periodEnd = $periodStart->copy()->endOfMonth();
        $daysInMonth = $periodEnd->day;

        $sectionInfo = DB::table('section')->where('sect_id', $selectedSectId)->first(['sect_name', 'gr_level']);
        $schoolYearLabel = $schoolYear?->sy_label;

        $semester = 'First Semester';
        if ($schoolYear?->start_date && $schoolYear?->end_date) {
            $syStart = Carbon::parse($schoolYear->start_date);
            $syEnd = Carbon::parse($schoolYear->end_date);
            $midpoint = $syStart->copy()->addDays((int) ($syStart->diffInDays($syEnd) / 2));
            $semester = Carbon::createFromDate($selectedYear, $selectedMonth, 1)->lte($midpoint)
                ? 'First Semester'
                : 'Second Semester';
        }

        $students = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->where('ss.sect_id', $selectedSectId)
            ->when($selectedSyId, fn ($q) => $q->where('ss.sy_id', $selectedSyId))
            ->where('s.is_deleted', false)
            ->select('s.stu_id', 's.lrn', 's.stu_fname', 's.stu_mname', 's.stu_lname', 's.gender')
            ->orderBy('s.stu_lname')
            ->orderBy('s.stu_fname')
            ->get();

        $attendanceRecords = DB::table('attendance')
            ->where('sect_id', $selectedSectId)
            ->whereBetween('att_date', [$periodStart->toDateString(), $periodEnd->toDateString()])
            ->select('stu_id', 'att_date', 'status')
            ->get()
            ->groupBy('stu_id');

        $templatePath = storage_path('app/templates/sf2-template.xlsx');
        abort_unless(file_exists($templatePath), 500, 'SF2 template file not found.');

        $reader = IOFactory::createReaderForFile($templatePath);
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($templatePath);

        $monthNames = [
            1 => 'JANUARY', 2 => 'FEBRUARY', 3 => 'MARCH', 4 => 'APRIL',
            5 => 'MAY', 6 => 'JUNE', 7 => 'JULY', 8 => 'AUGUST',
            9 => 'SEPTEMBER', 10 => 'OCTOBER', 11 => 'NOVEMBER', 12 => 'DECEMBER',
        ];
        $monthName = $monthNames[$selectedMonth];

        $sheetIndex = 0;
        foreach ($spreadsheet->getAllSheets() as $i => $s) {
            if (strtoupper(trim($s->getTitle())) === $monthName) {
                $sheetIndex = $i;
                break;
            }
        }

        $spreadsheet->setActiveSheetIndex($sheetIndex);
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('I7', $semester);
        $sheet->setCellValue('I12', $sectionInfo?->sect_name ?? '');
        $sheet->setCellValue('AN8', $sectionInfo?->gr_level ?? '');
        $sheet->setCellValue('BN11', $monthName);
        if ($schoolYearLabel) {
            $sheet->setCellValue('U8', $schoolYearLabel);
        }
        if ($adviserName) {
            $sheet->setCellValue('BJ89', $adviserName);
        }

        $dayColumns = [];
        $scanLimit = Coordinate::columnIndexFromString('BF');
        for ($col = 1; $col <= $scanLimit; $col++) {
            $colLetter = Coordinate::stringFromColumnIndex($col);
            $cellValue = $sheet->getCell($colLetter.'16')->getValue();
            if (is_numeric($cellValue) && $cellValue >= 1 && $cellValue <= 31) {
                $dayColumns[] = $colLetter;
            }
        }

        $schoolDays = [];
        for ($day = 1; $day <= $daysInMonth; $day++) {
            if (! Carbon::createFromDate($selectedYear, $selectedMonth, $day)->isWeekend()) {
                $schoolDays[] = $day;
            }
        }

        $dowMap = ['Monday' => 'M', 'Tuesday' => 'T', 'Wednesday' => 'W', 'Thursday' => 'TH', 'Friday' => 'F'];

        foreach ($dayColumns as $i => $col) {
            if (isset($schoolDays[$i])) {
                $dayNum = $schoolDays[$i];
                $sheet->setCellValue($col.'16', $dayNum);
                $dow = Carbon::createFromDate($selectedYear, $selectedMonth, $dayNum)->format('l');
                $sheet->setCellValue($col.'17', $dowMap[$dow] ?? '');
            } else {
                $sheet->setCellValue($col.'16', '');
                $sheet->setCellValue($col.'17', '');
            }
        }

        /** @var array<int, string> $dayToCol */
        $dayToCol = [];
        foreach ($schoolDays as $i => $dayNum) {
            if (isset($dayColumns[$i])) {
                $dayToCol[$dayNum] = $dayColumns[$i];
            }
        }

        $maleRowSlots = range(18, 32);
        $femaleRowSlots = range(34, 50);
        $allStudentSlots = array_merge($maleRowSlots, $femaleRowSlots);

        foreach ($allStudentSlots as $row) {
            $sheet->setCellValue('A'.$row, '');
            $sheet->setCellValue('G'.$row, '');
            $sheet->setCellValue('BI'.$row, '');
            $sheet->setCellValue('BL'.$row, '');
            foreach ($dayColumns as $col) {
                $sheet->setCellValue($col.$row, '');
            }
            $sheet->getRowDimension($row)->setVisible(false);
        }

        // Split students by gender (Male / Female)
        $maleStudents = $students->filter(fn ($s) => strtolower((string) ($s->gender ?? 'male')) !== 'female')->values();
        $femaleStudents = $students->filter(fn ($s) => strtolower((string) ($s->gender ?? '')) === 'female')->values();

        $maleDailyAbsent = array_fill_keys(array_values($dayToCol), 0);
        $femaleDailyAbsent = array_fill_keys(array_values($dayToCol), 0);
        $maleTotalAbsent = 0;
        $maleTotalPresent = 0;
        $femaleTotalAbsent = 0;
        $femaleTotalPresent = 0;

        // Populate Male rows (18 - 32)
        foreach ($maleStudents as $index => $student) {
            if (! isset($maleRowSlots[$index])) {
                break;
            }

            $row = $maleRowSlots[$index];
            $sheet->getRowDimension($row)->setVisible(true);
            $stuRecords = $attendanceRecords->get($student->stu_id, collect());

            $absent = 0;
            $present = 0;

            foreach ($dayToCol as $dayNum => $col) {
                $date = Carbon::createFromDate($selectedYear, $selectedMonth, $dayNum)->toDateString();
                $record = $stuRecords->firstWhere('att_date', $date);
                $status = $record ? strtolower((string) $record->status) : 'absent';

                if ($status === 'absent') {
                    $sheet->setCellValue($col.$row, 'X');
                    $absent++;
                    $maleDailyAbsent[$col]++;
                } else {
                    $present++;
                }
            }

            $fullName = $student->stu_lname.', '.$student->stu_fname.($student->stu_mname ? ' '.$student->stu_mname : '');
            $sheet->setCellValue('A'.$row, $index + 1);
            $sheet->setCellValue('G'.$row, $fullName);
            $sheet->setCellValue('BI'.$row, $absent);
            $sheet->setCellValue('BL'.$row, $present);

            $maleTotalAbsent += $absent;
            $maleTotalPresent += $present;
        }

        // Row 33: Male Summary
        $sheet->getRowDimension(33)->setVisible(true);
        $sheet->setCellValue('BI33', $maleTotalAbsent);
        $sheet->setCellValue('BL33', $maleTotalPresent);
        foreach ($dayToCol as $col) {
            $sheet->setCellValue($col.'33', $maleDailyAbsent[$col] > 0 ? $maleDailyAbsent[$col] : '');
        }

        // Populate Female rows (34 - 50)
        foreach ($femaleStudents as $index => $student) {
            if (! isset($femaleRowSlots[$index])) {
                break;
            }

            $row = $femaleRowSlots[$index];
            $sheet->getRowDimension($row)->setVisible(true);
            $stuRecords = $attendanceRecords->get($student->stu_id, collect());

            $absent = 0;
            $present = 0;

            foreach ($dayToCol as $dayNum => $col) {
                $date = Carbon::createFromDate($selectedYear, $selectedMonth, $dayNum)->toDateString();
                $record = $stuRecords->firstWhere('att_date', $date);
                $status = $record ? strtolower((string) $record->status) : 'absent';

                if ($status === 'absent') {
                    $sheet->setCellValue($col.$row, 'X');
                    $absent++;
                    $femaleDailyAbsent[$col]++;
                } else {
                    $present++;
                }
            }

            $fullName = $student->stu_lname.', '.$student->stu_fname.($student->stu_mname ? ' '.$student->stu_mname : '');
            $sheet->setCellValue('A'.$row, $index + 1);
            $sheet->setCellValue('G'.$row, $fullName);
            $sheet->setCellValue('BI'.$row, $absent);
            $sheet->setCellValue('BL'.$row, $present);

            $femaleTotalAbsent += $absent;
            $femaleTotalPresent += $present;
        }

        // Row 51: Female Summary
        $sheet->getRowDimension(51)->setVisible(true);
        $sheet->setCellValue('BI51', $femaleTotalAbsent);
        $sheet->setCellValue('BL51', $femaleTotalPresent);
        foreach ($dayToCol as $col) {
            $sheet->setCellValue($col.'51', $femaleDailyAbsent[$col] > 0 ? $femaleDailyAbsent[$col] : '');
        }

        // Row 52: Combined Total Per Day
        $sheet->getRowDimension(52)->setVisible(true);
        $sheet->setCellValue('BI52', $maleTotalAbsent + $femaleTotalAbsent);
        $sheet->setCellValue('BL52', $maleTotalPresent + $femaleTotalPresent);
        foreach ($dayToCol as $col) {
            $combinedDayAbsent = $maleDailyAbsent[$col] + $femaleDailyAbsent[$col];
            $sheet->setCellValue($col.'52', $combinedDayAbsent > 0 ? $combinedDayAbsent : '');
        }

        $writer = new XlsxWriter($spreadsheet);
        $tempFile = tempnam(sys_get_temp_dir(), 'sf2_');

        try {
            $writer->save($tempFile);
            $content = (string) file_get_contents($tempFile);
        } finally {
            @unlink($tempFile);
        }

        $filename = sprintf(
            'SF2_%s_Grade%s_%s_%s.xlsx',
            str_replace(' ', '_', $sectionInfo?->sect_name ?? 'Section'),
            $sectionInfo?->gr_level ?? '',
            $periodStart->format('F'),
            str_replace([' ', '/'], ['_', '-'], (string) ($schoolYearLabel ?? $selectedYear)),
        );

        AuditTrail::record(
            $teacher,
            'sf2.export',
            sprintf(
                'Exported SF2 report for %s (%s) — %s %s',
                $sectionInfo?->sect_name ?? 'Unknown section',
                $sectionInfo?->gr_level ?? 'N/A',
                $periodStart->format('F'),
                $schoolYearLabel ?? (string) $selectedYear,
            ),
            [
                'section' => $sectionInfo?->sect_name,
                'grade_level' => $sectionInfo?->gr_level,
                'month' => $selectedMonth,
                'year' => $selectedYear,
                'sy_id' => $selectedSyId,
                'school_year' => $schoolYearLabel,
                'filename' => $filename,
                'students' => $students->count(),
            ],
        );

        return response($content, 200, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
