<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherAttendanceController extends Controller
{
    /**
     * Daily attendance for students in the teacher's sections.
     */
    public function index(Request $request): Response
    {
        $teacher = $request->user('teacher');
        $tchId = $teacher->tch_id;

        $dateInput = $request->query('date');
        $attDate = is_string($dateInput) && $dateInput !== ''
            ? Carbon::parse($dateInput)->toDateString()
            : now()->toDateString();

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');
        $activeSyId = $activeSyId !== null ? (int) $activeSyId : null;

        $dayOfWeek = Carbon::parse($attDate)->format('l');
        $isNonSchoolDay = CalendarEvent::isNonSchoolDay($attDate, $activeSyId);

        $sectionIds = collect();
        $scheduledSectionIdsOnDate = collect();

        if ($activeSyId) {
            $advisorySectionIds = DB::table('adviser')
                ->where('tch_id', $tchId)
                ->where('sy_id', $activeSyId)
                ->where('is_active', true)
                ->pluck('sect_id');

            $scheduleSectionIds = DB::table('class_schedule')
                ->where('tch_id', $tchId)
                ->where('sy_id', $activeSyId)
                ->pluck('sect_id');

            $sectionIds = $advisorySectionIds
                ->merge($scheduleSectionIds)
                ->unique()
                ->values();

            if (! $isNonSchoolDay && $sectionIds->isNotEmpty()) {
                $teacherScheduledSects = DB::table('class_schedule')
                    ->where('tch_id', $tchId)
                    ->where('sy_id', $activeSyId)
                    ->where('day_of_week', $dayOfWeek)
                    ->pluck('sect_id');

                $advisoryScheduledSects = $advisorySectionIds->isNotEmpty()
                    ? DB::table('class_schedule')
                        ->whereIn('sect_id', $advisorySectionIds)
                        ->where('sy_id', $activeSyId)
                        ->where('day_of_week', $dayOfWeek)
                        ->pluck('sect_id')
                    : collect();

                $scheduledSectionIdsOnDate = $teacherScheduledSects
                    ->merge($advisoryScheduledSects)
                    ->unique()
                    ->map(fn ($id) => (int) $id)
                    ->values();
            }
        }

        $scheduledSectionList = $scheduledSectionIdsOnDate->all();
        $scheduledSectionSet = array_flip($scheduledSectionList);

        $query = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->leftJoin('attendance as a', function ($join) use ($attDate): void {
                $join->on('a.stu_id', '=', 's.stu_id')
                    ->whereDate('a.att_date', $attDate);
            })
            ->where('s.is_deleted', false)
            ->where('sec.is_deleted', false)
            ->when($activeSyId, fn ($builder) => $builder->where('ss.sy_id', $activeSyId))
            ->when(
                $sectionIds->isNotEmpty(),
                fn ($builder) => $builder->whereIn('sec.sect_id', $sectionIds),
                fn ($builder) => $builder->whereRaw('1 = 0'),
            )
            ->select(
                's.stu_id',
                's.lrn',
                's.stu_fname',
                's.stu_lname',
                'sec.sect_id',
                'sec.gr_level',
                'sec.sect_name as sect',
                'a.status as attendance_status',
                'a.time_in',
                'a.time_out',
            )
            ->distinct()
            ->orderBy('sec.gr_level')
            ->orderBy('sec.sect_name')
            ->orderBy('s.stu_lname')
            ->orderBy('s.stu_fname');

        $search = trim((string) $request->query('q', ''));

        if ($search !== '') {
            $query->where(function ($builder) use ($search) {
                $builder->where('s.stu_fname', 'like', "%{$search}%")
                    ->orWhere('s.stu_lname', 'like', "%{$search}%")
                    ->orWhere('s.lrn', 'like', "%{$search}%");
            });
        }

        $gradeLevel = $request->query('gradeLevel');
        if (is_string($gradeLevel) && $gradeLevel !== '' && $gradeLevel !== 'all') {
            $query->where('sec.gr_level', $gradeLevel);
        }

        $section = $request->query('section');
        if (is_string($section) && $section !== '' && $section !== 'all') {
            $query->where('sec.sect_name', $section);
        }

        $attendanceFilter = $request->query('attendance');
        if ($attendanceFilter === 'present' || $attendanceFilter === 'late') {
            $query->where('a.status', $attendanceFilter);
        } elseif ($attendanceFilter === 'absent') {
            $query->where(function ($builder) use ($isNonSchoolDay, $scheduledSectionList): void {
                $builder->where('a.status', 'absent');
                if (! $isNonSchoolDay && ! empty($scheduledSectionList)) {
                    $builder->orWhere(function ($sub) use ($scheduledSectionList): void {
                        $sub->whereNull('a.status')
                            ->whereIn('sec.sect_id', $scheduledSectionList);
                    });
                }
            });
        } elseif ($attendanceFilter === 'excused') {
            $query->where('a.status', 'excused');
        } elseif ($attendanceFilter === 'no_class') {
            $query->whereNull('a.status');
            if (! $isNonSchoolDay && ! empty($scheduledSectionList)) {
                $query->whereNotIn('sec.sect_id', $scheduledSectionList);
            }
        }

        $rows = $query->paginate(15)->withQueryString();

        $rows->getCollection()->transform(function ($row) use ($isNonSchoolDay, $scheduledSectionSet) {
            $hasClassToday = ! $isNonSchoolDay && isset($scheduledSectionSet[(int) $row->sect_id]);
            $row->attendance_status = $row->attendance_status ?? ($hasClassToday ? 'absent' : 'no_class');
            $row->time_in = $row->time_in
                ? Carbon::parse($row->time_in)->format('H:i')
                : null;
            $row->time_out = $row->time_out
                ? Carbon::parse($row->time_out)->format('H:i')
                : null;

            return $row;
        });

        $filterSections = DB::table('section as sec')
            ->where('sec.is_deleted', false)
            ->when(
                $sectionIds->isNotEmpty(),
                fn ($builder) => $builder->whereIn('sec.sect_id', $sectionIds),
                fn ($builder) => $builder->whereRaw('1 = 0'),
            )
            ->select('sec.sect_name', 'sec.gr_level')
            ->distinct()
            ->get();

        $summaryQuery = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->leftJoin('attendance as a', function ($join) use ($attDate): void {
                $join->on('a.stu_id', '=', 's.stu_id')
                    ->whereDate('a.att_date', $attDate);
            })
            ->where('s.is_deleted', false)
            ->where('sec.is_deleted', false)
            ->when($activeSyId, fn ($builder) => $builder->where('ss.sy_id', $activeSyId))
            ->when(
                $sectionIds->isNotEmpty(),
                fn ($builder) => $builder->whereIn('sec.sect_id', $sectionIds),
                fn ($builder) => $builder->whereRaw('1 = 0'),
            );

        $totalStudents = (clone $summaryQuery)->distinct()->count('s.stu_id');
        $presentCount = (clone $summaryQuery)->where('a.status', 'present')->distinct()->count('s.stu_id');
        $lateCount = (clone $summaryQuery)->where('a.status', 'late')->distinct()->count('s.stu_id');
        $excusedCount = (clone $summaryQuery)->where('a.status', 'excused')->distinct()->count('s.stu_id');
        $absentCount = (clone $summaryQuery)
            ->where(function ($builder) use ($isNonSchoolDay, $scheduledSectionList): void {
                $builder->where('a.status', 'absent');
                if (! $isNonSchoolDay && ! empty($scheduledSectionList)) {
                    $builder->orWhere(function ($sub) use ($scheduledSectionList): void {
                        $sub->whereNull('a.status')
                            ->whereIn('sec.sect_id', $scheduledSectionList);
                    });
                }
            })
            ->distinct()
            ->count('s.stu_id');

        return Inertia::render('Teacher/Attendance/index', [
            'attendance' => $rows,
            'summary' => [
                'total' => $totalStudents,
                'present' => $presentCount,
                'late' => $lateCount,
                'excused' => $excusedCount,
                'absent' => $absentCount,
            ],
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'date' => $attDate,
                'gradeLevel' => (is_string($gradeLevel) && $gradeLevel !== '' && $gradeLevel !== 'all') ? $gradeLevel : null,
                'section' => (is_string($section) && $section !== '' && $section !== 'all') ? $section : null,
                'attendance' => (is_string($attendanceFilter) && $attendanceFilter !== '' && $attendanceFilter !== 'all')
                    ? $attendanceFilter
                    : null,
            ],
            'gradeLevels' => $filterSections->pluck('gr_level')->filter()->unique()->values()->all(),
            'sections' => $filterSections->pluck('sect_name')->filter()->unique()->values()->all(),
        ]);
    }
}
