<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherStudentRecordController extends Controller
{
    /**
     * @return array{0: int|null, 1: Collection<int, int>}
     */
    private function teacherSectionContext(int $tchId, ?int $syId = null): array
    {
        $sectionIds = collect();

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

        return [$syId, $sectionIds];
    }

    /**
     * Display students with attendance summary for the authenticated teacher.
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

        [$targetSyId, $sectionIds] = $this->teacherSectionContext($tchId, $syId);

        $date = $request->query('date');

        $attendanceCountQuery = DB::table('attendance as a')
            ->selectRaw('count(*)')
            ->whereColumn('a.stu_id', 's.stu_id')
            ->whereIn('a.status', ['present', 'late'])
            ->when($targetSyId, fn ($builder) => $builder->where('a.sy_id', $targetSyId))
            ->when($date, fn ($builder) => $builder->whereDate('a.att_date', $date));

        $query = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->where('s.is_deleted', false)
            ->where('sec.is_deleted', false)
            ->when($targetSyId, fn ($builder) => $builder->where('ss.sy_id', $targetSyId))
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

        $students = $query->paginate(10)->withQueryString();

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

        $subjects = DB::table('class_schedule as cs')
            ->join('subject as sub', 'sub.subj_id', '=', 'cs.subj_id')
            ->when($targetSyId, fn ($builder) => $builder->where('cs.sy_id', $targetSyId))
            ->where('cs.tch_id', $tchId)
            ->select('sub.subj_id', 'sub.subj_code', 'sub.subj_name')
            ->distinct()
            ->orderBy('sub.subj_name')
            ->get();

        return Inertia::render('Teacher/Student Records/index', [
            'students' => $students,
            'subjects' => $subjects,
            'schoolYears' => $schoolYears,
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'gradeLevel' => (is_string($gradeLevel) && $gradeLevel !== '' && $gradeLevel !== 'all') ? $gradeLevel : null,
                'section' => (is_string($section) && $section !== '' && $section !== 'all') ? $section : null,
                'syId' => $request->query('syId', $activeSyId ? (string) $activeSyId : 'all'),
                'date' => $date ? $date : null,
            ],
            'gradeLevels' => $filterSections->pluck('gr_level')->filter()->unique()->values()->all(),
            'sections' => $filterSections->pluck('sect_name')->filter()->unique()->values()->all(),
        ]);
    }

    /**
     * Display attendance logs for a single student.
     */
    public function show(Request $request, int $student): Response
    {
        $teacher = $request->user('teacher');
        $tchId = $teacher->tch_id;

        [$activeSyId, $sectionIds] = $this->teacherSectionContext($tchId);

        $studentRow = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->where('s.stu_id', $student)
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
                's.stu_mname',
                's.stu_lname',
                's.gender',
                's.photo',
                's.status',
                'sec.gr_level',
                'sec.sect_name as sect',
            )
            ->first();

        abort_unless($studentRow !== null, 404);

        $logs = DB::table('attendance as a')
            ->leftJoin('subject as sub', 'sub.subj_id', '=', 'a.subj_id')
            ->where('a.stu_id', $student)
            ->when($activeSyId, fn ($builder) => $builder->where('a.sy_id', $activeSyId))
            ->orderByDesc('a.att_date')
            ->orderByDesc('a.time_in')
            ->orderByDesc('a.att_id')
            ->select(
                'a.att_id',
                'a.status',
                'a.session_id',
                'a.att_date as session_date',
                'a.time_in',
                'a.subj_id',
                'sub.subj_name',
                'sub.subj_code',
            )
            ->get()
            ->map(function ($row) {
                $timeIn = $row->time_in ? Carbon::parse($row->time_in) : null;

                return [
                    'att_id' => (int) $row->att_id,
                    'status' => (string) $row->status,
                    'session_id' => $row->session_id !== null ? (int) $row->session_id : null,
                    'session_date' => $row->session_date
                        ? Carbon::parse($row->session_date)->toDateString()
                        : null,
                    'start_time' => $timeIn?->format('H:i:s'),
                    'end_time' => null,
                    'subj_id' => $row->subj_id !== null ? (int) $row->subj_id : null,
                    'subj_name' => $row->subj_name,
                    'subj_code' => $row->subj_code,
                ];
            })
            ->values()
            ->all();

        return Inertia::render('Teacher/Student Records/individual', [
            'student' => $studentRow,
            'logs' => $logs,
        ]);
    }
}
