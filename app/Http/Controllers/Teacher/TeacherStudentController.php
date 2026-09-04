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

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        $sectionIds = collect();

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
        }

        $query = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
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

        return Inertia::render('Teacher/My Students/index', [
            'students' => $students,
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'gradeLevel' => (is_string($gradeLevel) && $gradeLevel !== '' && $gradeLevel !== 'all') ? $gradeLevel : null,
                'section' => (is_string($section) && $section !== '' && $section !== 'all') ? $section : null,
            ],
            'gradeLevels' => $filterSections->pluck('gr_level')->filter()->unique()->values()->all(),
            'sections' => $filterSections->pluck('sect_name')->filter()->unique()->values()->all(),
        ]);
    }
}
