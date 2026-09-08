<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\CalendarEvent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx as XlsxWriter;
use stdClass;
use Symfony\Component\HttpFoundation\Response;

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

        $templateCandidates = [
            storage_path('app/templates/sf2-template.xlsx'),
            storage_path('app/private/templates/sf2-template.xlsx'),
            resource_path('templates/sf2-template.xlsx'),
            database_path('templates/sf2-template.xlsx'),
        ];
        $templatePath = null;
        foreach ($templateCandidates as $candidate) {
            if (file_exists($candidate)) {
                $templatePath = $candidate;
                break;
            }
        }

        abort_unless($templatePath !== null, 500, 'SF2 template file not found.');

        $reader = IOFactory::createReaderForFile($templatePath);
        $reader->setReadDataOnly(false);
        $spreadsheet = $reader->load($templatePath);

        $monthNames = [
            1 => 'JANUARY', 2 => 'FEBRUARY', 3 => 'MARCH', 4 => 'APRIL',
            5 => 'MAY', 6 => 'JUNE', 7 => 'JULY', 8 => 'AUGUST',
            9 => 'SEPTEMBER', 10 => 'OCTOBER', 11 => 'NOVEMBER', 12 => 'DECEMBER',
        ];
        $monthName = $monthNames[$selectedMonth];

        $targetSheet = null;
        foreach ($spreadsheet->getAllSheets() as $s) {
            if (strtoupper(trim($s->getTitle())) === $monthName) {
                $targetSheet = $s;
                break;
            }
        }

        if ($targetSheet === null) {
            $sheet = $spreadsheet->getSheet(0);
            $sheet->setTitle($monthName);
        } else {
            $sheet = $targetSheet;
        }

        // Remove all other sheets so only the selected month's sheet is included
        foreach ($spreadsheet->getAllSheets() as $s) {
            if ($s !== $sheet) {
                $spreadsheet->removeSheetByIndex($spreadsheet->getIndex($s));
            }
        }
        $spreadsheet->setActiveSheetIndex(0);

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

        // Official DepEd SF2 grid columns: 5 weeks x 5 days (Mon to Fri)
        $weekCols = [
            0 => [1 => 'K', 2 => 'M', 3 => 'N', 4 => 'O', 5 => 'S'],
            1 => [1 => 'V', 2 => 'W', 3 => 'Z', 4 => 'AA', 5 => 'AB'],
            2 => [1 => 'AE', 2 => 'AH', 3 => 'AI', 4 => 'AL', 5 => 'AN'],
            3 => [1 => 'AP', 2 => 'AR', 3 => 'AS', 4 => 'AU', 5 => 'AV'],
            4 => [1 => 'AW', 2 => 'AY', 3 => 'BB', 4 => 'BD', 5 => 'BE'],
        ];

        $allDayColumns = [
            'K', 'M', 'N', 'O', 'S',
            'V', 'W', 'Z', 'AA', 'AB',
            'AE', 'AH', 'AI', 'AL', 'AN',
            'AP', 'AR', 'AS', 'AU', 'AV',
            'AW', 'AY', 'BB', 'BD', 'BE',
        ];

        $dayToCol = [];
        $weekIndex = 0;
        $hasSeenWeekday = false;

        for ($day = 1; $day <= $daysInMonth; $day++) {
            $date = Carbon::createFromDate($selectedYear, $selectedMonth, $day);
            $dow = (int) $date->isoFormat('E'); // 1 (Mon) to 7 (Sun)
            if ($dow === 1 && $hasSeenWeekday) {
                $weekIndex++;
            }
            if ($dow <= 5 && $weekIndex < 5) {
                $hasSeenWeekday = true;
                $col = $weekCols[$weekIndex][$dow] ?? null;
                if ($col) {
                    $dayToCol[$day] = $col;
                }
            }
        }

        // Center-align day column cells (dates, attendance status marks 'X', and daily summaries)
        $sheet->getStyle('K16:BH52')->getAlignment()
            ->setHorizontal(Alignment::HORIZONTAL_CENTER)
            ->setVertical(Alignment::VERTICAL_CENTER);

        // Clear row 16 for all 25 day columns, then set active day numbers
        foreach ($allDayColumns as $col) {
            $sheet->setCellValue($col.'16', '');
        }
        foreach ($dayToCol as $dayNum => $col) {
            $sheet->setCellValue($col.'16', $dayNum);
        }

        // Ensure row 17 days of week
        $dowHeaders = [
            'K' => 'M', 'M' => 'T', 'N' => 'W', 'O' => 'TH', 'S' => 'F',
            'V' => 'M', 'W' => 'T', 'Z' => 'W', 'AA' => 'TH', 'AB' => 'F',
            'AE' => 'M', 'AH' => 'T', 'AI' => 'W', 'AL' => 'TH', 'AN' => 'F',
            'AP' => 'M', 'AR' => 'T', 'AS' => 'W', 'AU' => 'TH', 'AV' => 'F',
            'AW' => 'M', 'AY' => 'T', 'BB' => 'W', 'BD' => 'TH', 'BE' => 'F',
        ];
        foreach ($dowHeaders as $col => $header) {
            $sheet->setCellValue($col.'17', $header);
        }

        $maleRowSlots = range(18, 32);
        $femaleRowSlots = range(34, 50);
        $allStudentSlots = array_merge($maleRowSlots, $femaleRowSlots);

        foreach ($allStudentSlots as $row) {
            $sheet->setCellValue('A'.$row, '');
            $sheet->setCellValue('G'.$row, '');
            $sheet->setCellValue('BI'.$row, '');
            $sheet->setCellValue('BL'.$row, '');
            foreach ($allDayColumns as $col) {
                $sheet->setCellValue($col.$row, '');
            }
            $sheet->getRowDimension($row)->setVisible(false);
        }

        // Clear summary rows 33, 51, 52 across all 25 columns
        foreach ($allDayColumns as $col) {
            $sheet->setCellValue($col.'33', '');
            $sheet->setCellValue($col.'51', '');
            $sheet->setCellValue($col.'52', '');
        }
        $sheet->setCellValue('BI33', '');
        $sheet->setCellValue('BL33', '');
        $sheet->setCellValue('BI51', '');
        $sheet->setCellValue('BL51', '');
        $sheet->setCellValue('BI52', '');
        $sheet->setCellValue('BL52', '');

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

        $gradeClean = preg_replace('/^grade\s*/i', '', (string) ($sectionInfo?->gr_level ?? ''));
        $filename = sprintf(
            'SF2_%s_Grade%s_%s_%s.xlsx',
            str_replace(' ', '_', $sectionInfo?->sect_name ?? 'Section'),
            str_replace(' ', '_', $gradeClean),
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

        $tempDir = storage_path('framework/cache');
        if (! is_dir($tempDir)) {
            mkdir($tempDir, 0755, true);
        }
        $tempFile = $tempDir.'/sf2_export_'.uniqid('', true).'.xlsx';
        $writer = new XlsxWriter($spreadsheet);
        $writer->save($tempFile);

        return response()->download(
            $tempFile,
            $filename,
            [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ],
        )->deleteFileAfterSend(true);
    }
}
