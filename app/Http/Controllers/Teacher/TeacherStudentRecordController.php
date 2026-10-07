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
     * Redirect to the merged My Students directory.
     */
    public function index(Request $request): \Symfony\Component\HttpFoundation\Response
    {
        return redirect()->route('teacher.students.index', $request->query());
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
                'a.time_out',
                'a.subj_id',
                'sub.subj_name',
                'sub.subj_code',
            )
            ->get()
            ->map(function ($row) {
                $timeIn = $row->time_in ? Carbon::parse($row->time_in) : null;
                $timeOut = $row->time_out ? Carbon::parse($row->time_out) : null;

                return [
                    'att_id' => (int) $row->att_id,
                    'status' => (string) $row->status,
                    'session_id' => $row->session_id !== null ? (int) $row->session_id : null,
                    'session_date' => $row->session_date
                        ? Carbon::parse($row->session_date)->toDateString()
                        : null,
                    'start_time' => $timeIn?->format('H:i:s'),
                    'end_time' => $timeOut?->format('H:i:s'),
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
