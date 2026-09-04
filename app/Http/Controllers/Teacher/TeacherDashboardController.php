<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherDashboardController extends Controller
{
    /**
     * Teacher overview with student/subject counts and attendance analytics.
     */
    public function index(Request $request): Response
    {
        $teacher = $request->user('teacher');
        $tchId = $teacher->tch_id;

        $rangeInput = $request->query('range');
        $range = in_array($rangeInput, ['daily', 'weekly', 'monthly', 'yearly'], true)
            ? $rangeInput
            : 'weekly';

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        $sectionIds = $this->sectionIdsForTeacher($tchId, $activeSyId);

        $studentsCount = $this->studentsCount($sectionIds, $activeSyId);
        $subjectsCount = $this->subjectsCount($tchId, $activeSyId);
        $analytics = $this->buildAnalytics($sectionIds, $activeSyId, $range);

        return Inertia::render('Teacher/Dashboard', [
            'stats' => [
                'studentsCount' => $studentsCount,
                'subjectsCount' => $subjectsCount,
            ],
            'analytics' => $analytics,
        ]);
    }

    /**
     * @return Collection<int, int>
     */
    private function sectionIdsForTeacher(int $tchId, ?int $activeSyId): Collection
    {
        if (! $activeSyId) {
            return collect();
        }

        $advisorySectionIds = DB::table('adviser')
            ->where('tch_id', $tchId)
            ->where('sy_id', $activeSyId)
            ->where('is_active', true)
            ->pluck('sect_id');

        $scheduleSectionIds = DB::table('class_schedule')
            ->where('tch_id', $tchId)
            ->where('sy_id', $activeSyId)
            ->pluck('sect_id');

        return $advisorySectionIds
            ->merge($scheduleSectionIds)
            ->unique()
            ->values();
    }

    /**
     * @param  Collection<int, int>  $sectionIds
     */
    private function studentsCount(Collection $sectionIds, ?int $activeSyId): int
    {
        if ($sectionIds->isEmpty() || ! $activeSyId) {
            return 0;
        }

        return (int) DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->where('s.is_deleted', false)
            ->where('ss.sy_id', $activeSyId)
            ->whereIn('ss.sect_id', $sectionIds)
            ->distinct()
            ->count('s.stu_id');
    }

    private function subjectsCount(int $tchId, ?int $activeSyId): int
    {
        if (! $activeSyId) {
            return 0;
        }

        return (int) DB::table('class_schedule')
            ->where('tch_id', $tchId)
            ->where('sy_id', $activeSyId)
            ->distinct()
            ->count('subj_id');
    }

    /**
     * @param  Collection<int, int>  $sectionIds
     * @return array{
     *     range: string,
     *     statusTotals: array{present: int, late: int, absent: int},
     *     statusTrend: list<array{date: string, present: int, late: int, absent: int}>
     * }
     */
    private function buildAnalytics(Collection $sectionIds, ?int $activeSyId, string $range): array
    {
        $emptyTotals = ['present' => 0, 'late' => 0, 'absent' => 0];
        $buckets = $this->trendBuckets($range);

        if ($sectionIds->isEmpty() || ! $activeSyId || $buckets->isEmpty()) {
            return [
                'range' => $range,
                'statusTotals' => $emptyTotals,
                'statusTrend' => $buckets->map(fn (array $bucket) => [
                    'date' => $bucket['date'],
                    'present' => 0,
                    'late' => 0,
                    'absent' => 0,
                ])->all(),
                'atRiskStudents' => [],
                'sectionAttendance' => [],
            ];
        }

        $startDate = $buckets->first()['start']->toDateString();
        $endDate = $buckets->last()['end']->toDateString();

        $studentIds = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->where('s.is_deleted', false)
            ->where('ss.sy_id', $activeSyId)
            ->whereIn('ss.sect_id', $sectionIds)
            ->distinct()
            ->pluck('s.stu_id');

        if ($studentIds->isEmpty()) {
            return [
                'range' => $range,
                'statusTotals' => $emptyTotals,
                'statusTrend' => $buckets->map(fn (array $bucket) => [
                    'date' => $bucket['date'],
                    'present' => 0,
                    'late' => 0,
                    'absent' => 0,
                ])->all(),
                'atRiskStudents' => [],
                'sectionAttendance' => [],
            ];
        }

        $records = DB::table('attendance')
            ->whereIn('stu_id', $studentIds)
            ->whereBetween('att_date', [$startDate, $endDate])
            ->whereIn('status', ['present', 'late', 'absent'])
            ->get(['att_date', 'status']);

        $totals = [
            'present' => $records->where('status', 'present')->count(),
            'late' => $records->where('status', 'late')->count(),
            'absent' => $records->where('status', 'absent')->count(),
        ];

        $statusTrend = $buckets->map(function (array $bucket) use ($records) {
            $inBucket = $records->filter(function ($row) use ($bucket) {
                $date = Carbon::parse($row->att_date)->startOfDay();

                return $date->betweenIncluded($bucket['start'], $bucket['end']);
            });

            return [
                'date' => $bucket['date'],
                'present' => $inBucket->where('status', 'present')->count(),
                'late' => $inBucket->where('status', 'late')->count(),
                'absent' => $inBucket->where('status', 'absent')->count(),
            ];
        })->all();

        // Section Attendance Breakdown
        $sectionAttendance = DB::table('attendance as a')
            ->join('section as sec', 'sec.sect_id', '=', 'a.sect_id')
            ->whereIn('a.sect_id', $sectionIds)
            ->where('a.sy_id', $activeSyId)
            ->whereBetween('a.att_date', [$startDate, $endDate])
            ->select(
                'sec.sect_id',
                'sec.sect_name',
                'sec.gr_level',
                DB::raw("COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count"),
                DB::raw("COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count"),
                DB::raw('COUNT(*) as total_count')
            )
            ->groupBy('sec.sect_id', 'sec.sect_name', 'sec.gr_level')
            ->get()
            ->map(function ($row) {
                $presentAndLate = $row->present_count + $row->late_count;
                $rate = $row->total_count > 0 ? (int) round(($presentAndLate / $row->total_count) * 100) : 100;

                return [
                    'sect_id' => $row->sect_id,
                    'name' => "{$row->gr_level} - {$row->sect_name}",
                    'attendance_rate' => $rate,
                    'total_records' => $row->total_count,
                ];
            })
            ->sortByDesc('attendance_rate')
            ->values()
            ->all();

        // At-risk students
        $studentAbsences = DB::table('attendance as a')
            ->join('student as s', 's.stu_id', '=', 'a.stu_id')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->whereIn('s.stu_id', $studentIds)
            ->where('ss.sy_id', $activeSyId)
            ->whereBetween('a.att_date', [$startDate, $endDate])
            ->select(
                's.stu_id',
                's.stu_fname',
                's.stu_lname',
                'sec.sect_name',
                'sec.gr_level',
                DB::raw("COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absent_count"),
                DB::raw("COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count"),
                DB::raw("COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count"),
                DB::raw('COUNT(*) as total_count')
            )
            ->groupBy('s.stu_id', 's.stu_fname', 's.stu_lname', 'sec.sect_name', 'sec.gr_level')
            ->get();

        $atRiskStudents = $studentAbsences->map(function ($row) {
            $presentAndLate = $row->present_count + $row->late_count;
            $rate = $row->total_count > 0 ? (int) round(($presentAndLate / $row->total_count) * 100) : 100;

            return [
                'stu_id' => $row->stu_id,
                'name' => trim("{$row->stu_fname} {$row->stu_lname}"),
                'section' => "{$row->gr_level} - {$row->sect_name}",
                'absent_count' => (int) $row->absent_count,
                'attendance_rate' => $rate,
            ];
        })
            ->filter(fn ($s) => $s['attendance_rate'] < 90 || $s['absent_count'] > 0)
            ->sortBy('attendance_rate')
            ->take(5)
            ->values()
            ->all();

        return [
            'range' => $range,
            'statusTotals' => $totals,
            'statusTrend' => $statusTrend,
            'atRiskStudents' => $atRiskStudents,
            'sectionAttendance' => $sectionAttendance,
        ];
    }

    /**
     * Last 7 daily / weekly / monthly / yearly buckets for the trend chart.
     *
     * @return Collection<int, array{date: string, start: Carbon, end: Carbon}>
     */
    private function trendBuckets(string $range): Collection
    {
        $now = now();

        return collect(range(6, 0))->map(function (int $offset) use ($range, $now) {
            return match ($range) {
                'daily' => (function () use ($now, $offset) {
                    $day = $now->copy()->subDays($offset)->startOfDay();

                    return [
                        'date' => $day->toDateString(),
                        'start' => $day->copy(),
                        'end' => $day->copy()->endOfDay(),
                    ];
                })(),
                'weekly' => (function () use ($now, $offset) {
                    $weekStart = $now->copy()->startOfWeek()->subWeeks($offset)->startOfDay();

                    return [
                        'date' => $weekStart->toDateString(),
                        'start' => $weekStart->copy(),
                        'end' => $weekStart->copy()->endOfWeek()->endOfDay(),
                    ];
                })(),
                'monthly' => (function () use ($now, $offset) {
                    $monthStart = $now->copy()->startOfMonth()->subMonths($offset)->startOfDay();

                    return [
                        'date' => $monthStart->toDateString(),
                        'start' => $monthStart->copy(),
                        'end' => $monthStart->copy()->endOfMonth()->endOfDay(),
                    ];
                })(),
                'yearly' => (function () use ($now, $offset) {
                    $yearStart = $now->copy()->startOfYear()->subYears($offset)->startOfDay();

                    return [
                        'date' => $yearStart->toDateString(),
                        'start' => $yearStart->copy(),
                        'end' => $yearStart->copy()->endOfYear()->endOfDay(),
                    ];
                })(),
                default => [
                    'date' => $now->toDateString(),
                    'start' => $now->copy()->startOfDay(),
                    'end' => $now->copy()->endOfDay(),
                ],
            };
        })->values();
    }
}
