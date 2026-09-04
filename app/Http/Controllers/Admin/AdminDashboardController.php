<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function index(): Response
    {
        $today = now()->toDateString();
        $yesterday = now()->subDay()->toDateString();

        $activeSyId = DB::table('school_year')->where('is_active', true)->value('sy_id');

        // ── Eager stats ───────────────────────────────────────────────────────

        $totalStudents = DB::table('student')->where('is_deleted', false)->count();

        $presentToday = DB::table('attendance')
            ->whereDate('att_date', $today)
            ->where('status', 'present')
            ->distinct('stu_id')
            ->count('stu_id');

        $lateToday = DB::table('attendance')
            ->whereDate('att_date', $today)
            ->where('status', 'late')
            ->distinct('stu_id')
            ->count('stu_id');

        $checkedInToday = $presentToday + $lateToday;

        $presentYesterday = DB::table('attendance')
            ->whereDate('att_date', $yesterday)
            ->whereIn('status', ['present', 'late'])
            ->distinct('stu_id')
            ->count('stu_id');

        $activeRfid = DB::table('student')
            ->where('is_deleted', false)
            ->whereNotNull('rfid_uid')
            ->where('rfid_uid', '!=', '')
            ->count();

        // Enrolled in active school year
        $enrolledCount = $activeSyId
            ? DB::table('student_section')->where('sy_id', $activeSyId)->count()
            : $totalStudents;

        $absentToday = max(0, $enrolledCount - $checkedInToday);

        $avgRateToday = $enrolledCount > 0
            ? round(($checkedInToday / $enrolledCount) * 100, 1)
            : 0.0;

        $avgRateYesterday = $enrolledCount > 0
            ? round(($presentYesterday / $enrolledCount) * 100, 1)
            : 0.0;

        $presentChange = $presentYesterday > 0
            ? round((($checkedInToday - $presentYesterday) / $presentYesterday) * 100, 1)
            : 0.0;

        $avgChange = round($avgRateToday - $avgRateYesterday, 1);

        // ── Recent check-ins ──────────────────────────────────────────────────

        $recentCheckins = DB::table('attendance as a')
            ->join('student as s', 's.stu_id', '=', 'a.stu_id')
            ->leftJoin('student_section as ss', function ($join) use ($activeSyId) {
                $join->on('ss.stu_id', '=', 'a.stu_id');
                if ($activeSyId) {
                    $join->where('ss.sy_id', $activeSyId);
                }
            })
            ->leftJoin('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->whereDate('a.att_date', $today)
            ->orderByDesc('a.time_in')
            ->limit(10)
            ->select([
                'a.att_id',
                's.stu_id',
                's.stu_fname',
                's.stu_mname',
                's.stu_lname',
                's.rfid_uid',
                'sec.gr_level',
                'sec.sect_name',
                'a.status',
                'a.time_in',
            ])
            ->get()
            ->map(function ($row) {
                $name = trim(collect([$row->stu_fname, $row->stu_mname, $row->stu_lname])->filter()->join(' '));
                $section = $row->gr_level && $row->sect_name
                    ? "{$row->gr_level} - {$row->sect_name}"
                    : '—';

                return [
                    'att_id' => $row->att_id,
                    'stu_id' => $row->stu_id,
                    'student' => $name,
                    'section' => $section,
                    'status' => ucfirst($row->status),
                    'time_in' => $row->time_in
                        ? Carbon::parse($row->time_in)->format('g:i A')
                        : '—',
                    'rfid_uid' => $row->rfid_uid ?? '—',
                ];
            });

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalStudents' => $totalStudents,
                'checkedInToday' => $checkedInToday,
                'presentToday' => $presentToday,
                'lateToday' => $lateToday,
                'absentToday' => $absentToday,
                'activeRfid' => $activeRfid,
                'avgRateToday' => $avgRateToday,
                'presentChange' => $presentChange,
                'avgChange' => $avgChange,
            ],
            'attendanceBreakdown' => [
                ['label' => 'Present', 'count' => $presentToday, 'color' => '#10b981'],
                ['label' => 'Late', 'count' => $lateToday, 'color' => '#f59e0b'],
                ['label' => 'Absent', 'count' => $absentToday, 'color' => '#ef4444'],
            ],
            'recentCheckins' => $recentCheckins,

            'hourlyCheckins' => $this->buildHourlyCheckins(),

            // Non-school-day banner (holiday, break, suspension)
            'nonSchoolDay' => CalendarEvent::nonSchoolDayInfo($today),

            // Deferred: heavier queries loaded after initial paint
            'attendanceChart' => Inertia::defer(fn () => $this->buildAttendanceChart()),
            'sectionPerformance' => Inertia::defer(fn () => $this->buildSectionPerformance($activeSyId)),
            'gradeBreakdown' => Inertia::defer(fn () => $this->buildGradeBreakdown($activeSyId)),
        ]);
    }

    /**
     * Today's check-ins bucketed per hour (6 AM – 6 PM), driver-agnostic.
     *
     * @return list<array{hour: string, count: int}>
     */
    private function buildHourlyCheckins(): array
    {
        $times = DB::table('attendance')
            ->whereDate('att_date', now()->toDateString())
            ->whereNotNull('time_in')
            ->pluck('time_in');

        $buckets = array_fill(6, 13, 0); // hours 6..18

        foreach ($times as $time) {
            $hour = (int) Carbon::parse($time)->format('G');
            if ($hour >= 6 && $hour <= 18) {
                $buckets[$hour]++;
            }
        }

        return collect($buckets)
            ->map(fn (int $count, int $hour) => [
                'hour' => Carbon::createFromTime($hour)->format('gA'),
                'count' => $count,
            ])
            ->values()
            ->all();
    }

    /**
     * Attendance rate per grade level for today.
     *
     * @return list<array{grade: string, enrolled: int, present: int, rate: float}>
     */
    private function buildGradeBreakdown(?int $activeSyId): array
    {
        if (! $activeSyId) {
            return [];
        }

        $today = now()->toDateString();

        $enrolledByGrade = DB::table('student_section as ss')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->where('ss.sy_id', $activeSyId)
            ->select('sec.gr_level', DB::raw('COUNT(*) as total'))
            ->groupBy('sec.gr_level')
            ->pluck('total', 'gr_level');

        $presentByGrade = DB::table('attendance as a')
            ->join('student_section as ss', function ($join) use ($activeSyId) {
                $join->on('ss.stu_id', '=', 'a.stu_id')->where('ss.sy_id', $activeSyId);
            })
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->whereDate('a.att_date', $today)
            ->whereIn('a.status', ['present', 'late'])
            ->select('sec.gr_level', DB::raw('COUNT(DISTINCT a.stu_id) as cnt'))
            ->groupBy('sec.gr_level')
            ->pluck('cnt', 'gr_level');

        return $enrolledByGrade
            ->map(function ($total, $grade) use ($presentByGrade) {
                $present = (int) ($presentByGrade[$grade] ?? 0);

                return [
                    'grade' => (string) $grade,
                    'enrolled' => (int) $total,
                    'present' => $present,
                    'rate' => $total > 0 ? round(($present / $total) * 100, 1) : 0.0,
                ];
            })
            ->sortKeys(SORT_NATURAL)
            ->values()
            ->all();
    }

    /**
     * Daily attendance counts for the last 30 days.
     *
     * @return array{
     *     labels: list<string>,
     *     points: list<int>,
     *     maxY: int,
     * }
     */
    private function buildAttendanceChart(): array
    {
        $startDate = now()->subDays(29)->toDateString();

        $records = DB::table('attendance')
            ->whereIn('status', ['present', 'late'])
            ->whereDate('att_date', '>=', $startDate)
            ->get(['att_date', 'stu_id']);

        $grouped = [];
        foreach ($records as $rec) {
            $d = Carbon::parse($rec->att_date)->toDateString();
            $grouped[$d][$rec->stu_id] = true;
        }

        $days = collect(range(29, 0))->map(fn ($d) => now()->subDays($d)->toDateString());

        $points = $days->map(fn ($d) => isset($grouped[$d]) ? count($grouped[$d]) : 0)->values()->all();
        $labels = $days->map(fn ($d) => Carbon::parse($d)->format('M j'))->values()->all();
        $maxY = max(empty($points) ? 10 : max($points), 10);

        // Mark non-school days in the chart
        $nonSchoolDays = CalendarEvent::nonSchoolDayDatesInRange(
            $days->first(),
            $days->last(),
        );
        $isNonSchoolDay = $days->map(fn ($d) => isset($nonSchoolDays[$d]))->values()->all();

        return [
            'labels' => $labels,
            'points' => $points,
            'maxY' => (int) ceil($maxY / 50) * 50,
            'isNonSchoolDay' => $isNonSchoolDay,
        ];
    }

    /**
     * @return array{
     *     totalSections: int,
     *     activeTodaySections: int,
     *     avgRate: float,
     *     highCount: int,
     *     midCount: int,
     *     lowCount: int,
     *     topSection: array{name: string, rate: float}|null,
     *     bottomSection: array{name: string, rate: float}|null,
     * }
     */
    private function buildSectionPerformance(?int $activeSyId): array
    {
        if (! $activeSyId) {
            return [
                'totalSections' => 0,
                'activeTodaySections' => 0,
                'avgRate' => 0.0,
                'highCount' => 0,
                'midCount' => 0,
                'lowCount' => 0,
                'topSection' => null,
                'bottomSection' => null,
            ];
        }

        $today = now()->toDateString();

        // Students enrolled per section
        $enrolled = DB::table('student_section')
            ->where('sy_id', $activeSyId)
            ->select('sect_id', DB::raw('COUNT(*) as total'))
            ->groupBy('sect_id')
            ->pluck('total', 'sect_id');

        // Students checked in today per section
        $checkedIn = DB::table('attendance as a')
            ->join('student_section as ss', function ($join) use ($activeSyId) {
                $join->on('ss.stu_id', '=', 'a.stu_id')->where('ss.sy_id', $activeSyId);
            })
            ->whereDate('a.att_date', $today)
            ->whereIn('a.status', ['present', 'late'])
            ->select('ss.sect_id', DB::raw('COUNT(DISTINCT a.stu_id) as cnt'))
            ->groupBy('ss.sect_id')
            ->pluck('cnt', 'sect_id');

        $sections = DB::table('section')
            ->where('is_deleted', false)
            ->get(['sect_id', 'sect_name', 'gr_level']);

        $rates = $sections->map(function ($sec) use ($enrolled, $checkedIn) {
            $total = (int) ($enrolled[$sec->sect_id] ?? 0);
            $present = (int) ($checkedIn[$sec->sect_id] ?? 0);
            $rate = $total > 0 ? round(($present / $total) * 100, 1) : 0.0;

            return [
                'sect_id' => $sec->sect_id,
                'name' => "{$sec->gr_level} - {$sec->sect_name}",
                'rate' => $rate,
                'total' => $total,
                'present' => $present,
            ];
        });

        $activeSections = $rates->filter(fn ($s) => $s['present'] > 0)->count();
        $avg = $rates->avg('rate');

        $high = $rates->filter(fn ($s) => $s['rate'] >= 90)->count();
        $mid = $rates->filter(fn ($s) => $s['rate'] >= 80 && $s['rate'] < 90)->count();
        $low = $rates->filter(fn ($s) => $s['rate'] < 80)->count();

        $top = $rates->sortByDesc('rate')->first();
        $bottom = $rates->filter(fn ($s) => $s['total'] > 0)->sortBy('rate')->first();

        return [
            'totalSections' => $sections->count(),
            'activeTodaySections' => $activeSections,
            'avgRate' => round((float) $avg, 1),
            'highCount' => $high,
            'midCount' => $mid,
            'lowCount' => $low,
            'topSection' => $top ? ['name' => $top['name'], 'rate' => $top['rate']] : null,
            'bottomSection' => $bottom ? ['name' => $bottom['name'], 'rate' => $bottom['rate']] : null,
        ];
    }
}
