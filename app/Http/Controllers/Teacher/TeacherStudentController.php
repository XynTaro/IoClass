<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherStudentController extends Controller
{
    /**
     * Display students assigned to the authenticated teacher's sections.
     */
    public function index(Request $request): Response
    {
        $teacher = $request->user('teacher');
        $tchId = $teacher->tch_id;

        $schoolYears = DB::table('school_year')
            ->where('is_deleted', false)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['sy_id', 'sy_label', 'is_active']);

        $activeSyId = $schoolYears->firstWhere('is_active', true)?->sy_id;

        $selectedSyId = $request->query('syId');
        if ($selectedSyId === 'all') {
            $syId = null;
        } elseif (is_numeric($selectedSyId)) {
            $syId = (int) $selectedSyId;
        } else {
            $syId = $activeSyId ? (int) $activeSyId : null;
        }

        $sectionIds = collect();
        $advisorySectionIds = collect();

        if ($syId) {
            $advisorySectionIds = DB::table('adviser')
                ->where('tch_id', $tchId)
                ->where('sy_id', $syId)
                ->where('is_active', true)
                ->pluck('sect_id');

            $scheduleSectionIds = DB::table('class_schedule')
                ->where('tch_id', $tchId)
                ->where('sy_id', $syId)
                ->pluck('sect_id');

            $sectionIds = $advisorySectionIds
                ->merge($scheduleSectionIds)
                ->unique()
                ->values();
        } else {
            $advisorySectionIds = DB::table('adviser')
                ->where('tch_id', $tchId)
                ->where('is_active', true)
                ->pluck('sect_id');

            $scheduleSectionIds = DB::table('class_schedule')
                ->where('tch_id', $tchId)
                ->pluck('sect_id');

            $sectionIds = $advisorySectionIds
                ->merge($scheduleSectionIds)
                ->unique()
                ->values();
        }

        $attendanceCountQuery = DB::table('attendance as a')
            ->selectRaw('count(*)')
            ->whereColumn('a.stu_id', 's.stu_id')
            ->whereIn('a.status', ['present', 'late'])
            ->when($syId, fn ($builder) => $builder->where('a.sy_id', $syId));

        $query = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->where('s.is_deleted', false)
            ->where('sec.is_deleted', false)
            ->when($syId, fn ($builder) => $builder->where('ss.sy_id', $syId))
            ->when(
                $sectionIds->isNotEmpty(),
                fn ($builder) => $builder->whereIn('sec.sect_id', $sectionIds),
                fn ($builder) => $builder->whereRaw('1 = 0'),
            )
            ->select(
                's.stu_id',
                's.lrn',
                's.stu_fname',
                's.stu_mname',
                's.stu_lname',
                's.gender',
                's.photo',
                's.status',
                'sec.sect_id',
                'sec.gr_level',
                'sec.sect_name as sect',
            )
            ->selectSub($attendanceCountQuery, 'attendance_count')
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

        $statusFilter = $request->query('status');
        if (is_string($statusFilter) && $statusFilter !== '' && $statusFilter !== 'all') {
            $query->where('s.status', $statusFilter);
        }

        $students = $query->paginate(15)->withQueryString();

        $students->getCollection()->transform(function ($row) use ($advisorySectionIds) {
            $row->is_advisory = $advisorySectionIds->contains($row->sect_id);
            $row->attendance_count = (int) ($row->attendance_count ?? 0);

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

        return Inertia::render('Teacher/My Students/index', [
            'students' => $students,
            'schoolYears' => $schoolYears,
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'gradeLevel' => (is_string($gradeLevel) && $gradeLevel !== '' && $gradeLevel !== 'all') ? $gradeLevel : null,
                'section' => (is_string($section) && $section !== '' && $section !== 'all') ? $section : null,
                'status' => (is_string($statusFilter) && $statusFilter !== '' && $statusFilter !== 'all') ? $statusFilter : null,
                'syId' => $request->query('syId', $activeSyId ? (string) $activeSyId : 'all'),
            ],
            'gradeLevels' => $filterSections->pluck('gr_level')->filter()->unique()->values()->all(),
            'sections' => $filterSections->pluck('sect_name')->filter()->unique()->values()->all(),
        ]);
    }
}
