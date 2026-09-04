<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Services\StudentAbsenceNotifier;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TeacherVerificationController extends Controller
{
    public function __construct(private StudentAbsenceNotifier $absenceNotifier) {}

    /**
     * Subject + section pairings the teacher is scheduled to teach.
     *
     * @return Collection<int, object{
     *     subj_id: int,
     *     sect_id: int,
     *     subj_code: string|null,
     *     subj_name: string,
     *     sect_name: string,
     *     gr_level: string
     * }>
     */
    private function teacherAssignments(int $tchId, ?int $activeSyId): Collection
    {
        if ($activeSyId === null) {
            return collect();
        }

        return DB::table('class_schedule as cs')
            ->join('subject as sub', 'sub.subj_id', '=', 'cs.subj_id')
            ->join('section as sec', 'sec.sect_id', '=', 'cs.sect_id')
            ->where('cs.tch_id', $tchId)
            ->where('cs.sy_id', $activeSyId)
            ->where('sec.is_deleted', false)
            ->where(function ($query): void {
                $query->where('sub.is_deleted', false)
                    ->orWhereNull('sub.is_deleted');
            })
            ->select(
                'cs.subj_id',
                'cs.sect_id',
                'sub.subj_code',
                'sub.subj_name',
                'sec.sect_name',
                'sec.gr_level',
            )
            ->distinct()
            ->orderBy('sub.subj_name')
            ->orderBy('sec.gr_level')
            ->orderBy('sec.sect_name')
            ->get()
            ->map(fn ($row) => (object) [
                'subj_id' => (int) $row->subj_id,
                'sect_id' => (int) $row->sect_id,
                'subj_code' => $row->subj_code !== null ? (string) $row->subj_code : null,
                'subj_name' => (string) $row->subj_name,
                'sect_name' => (string) $row->sect_name,
                'gr_level' => (string) $row->gr_level,
            ])
            ->values();
    }

    public function index(Request $request): Response
    {
        $teacher = $request->user('teacher');
        $tchId = (int) $teacher->tch_id;

        $dateInput = $request->query('date');
        $attDate = is_string($dateInput) && $dateInput !== ''
            ? Carbon::parse($dateInput)->toDateString()
            : now()->toDateString();

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');
        $activeSyId = $activeSyId !== null ? (int) $activeSyId : null;

        $assignments = $this->teacherAssignments($tchId, $activeSyId);

        if ($assignments->isEmpty()) {
            return Inertia::render('Teacher/Verification/index', [
                'date' => $attDate,
                'assignments' => [],
                'selected' => null,
                'rows' => [],
                'summary' => [
                    'present' => 0,
                    'late' => 0,
                    'excused' => 0,
                    'absent' => 0,
                ],
                'message' => 'No subjects are scheduled for you in the active school year.',
            ]);
        }

        $requestedSubjId = $request->integer('subj_id') ?: null;
        $requestedSectId = $request->integer('sect_id') ?: null;

        $selected = $assignments->first(
            fn ($assignment) => $requestedSubjId !== null
                && $requestedSectId !== null
                && $assignment->subj_id === $requestedSubjId
                && $assignment->sect_id === $requestedSectId,
        );

        if ($selected === null && $assignments->count() === 1) {
            $selected = $assignments->first();
        }

        if ($selected === null) {
            return Inertia::render('Teacher/Verification/index', [
                'date' => $attDate,
                'assignments' => $assignments,
                'selected' => null,
                'rows' => [],
                'summary' => [
                    'present' => 0,
                    'late' => 0,
                    'excused' => 0,
                    'absent' => 0,
                ],
                'message' => 'Select a subject and section to verify attendance.',
            ]);
        }

        $subjId = (int) $selected->subj_id;
        $sectId = (int) $selected->sect_id;

        $rows = DB::table('student as s')
            ->join('student_section as ss', 'ss.stu_id', '=', 's.stu_id')
            ->join('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->leftJoin('attendance as a', function ($join) use ($attDate, $subjId): void {
                $join->on('a.stu_id', '=', 's.stu_id')
                    ->whereDate('a.att_date', $attDate)
                    ->where('a.subj_id', $subjId);
            })
            ->where('s.is_deleted', false)
            ->where('sec.is_deleted', false)
            ->where('sec.sect_id', $sectId)
            ->when($activeSyId, fn ($builder) => $builder->where('ss.sy_id', $activeSyId))
            ->select(
                's.stu_id',
                's.lrn',
                's.stu_fname',
                's.stu_lname',
                'sec.gr_level',
                'sec.sect_name as sect',
                'a.status as attendance_status',
                'a.time_in',
            )
            ->orderBy('s.stu_lname')
            ->orderBy('s.stu_fname')
            ->get()
            ->map(function ($row) {
                $row->attendance_status = $row->attendance_status ?? 'absent';
                $row->time_in = $row->time_in
                    ? Carbon::parse($row->time_in)->format('H:i')
                    : null;

                return $row;
            });

        $summary = [
            'present' => $rows->where('attendance_status', 'present')->count(),
            'late' => $rows->where('attendance_status', 'late')->count(),
            'excused' => $rows->where('attendance_status', 'excused')->count(),
            'absent' => $rows->where('attendance_status', 'absent')->count(),
        ];

        $rows = $rows
            ->filter(fn ($row) => $row->attendance_status === 'absent')
            ->values();

        return Inertia::render('Teacher/Verification/index', [
            'date' => $attDate,
            'assignments' => $assignments,
            'selected' => [
                'subj_id' => $subjId,
                'sect_id' => $sectId,
                'subj_code' => $selected->subj_code,
                'subj_name' => $selected->subj_name,
                'sect_name' => $selected->sect_name,
                'gr_level' => $selected->gr_level,
            ],
            'rows' => $rows,
            'summary' => $summary,
            'message' => null,
        ]);
    }

    public function confirm(Request $request): RedirectResponse
    {
        $teacher = $request->user('teacher');
        $tchId = (int) $teacher->tch_id;

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');
        $activeSyId = $activeSyId !== null ? (int) $activeSyId : null;

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'subj_id' => ['required', 'integer'],
            'sect_id' => ['required', 'integer'],
            'rows' => ['required', 'array'],
            'rows.*.stu_id' => ['required', 'integer'],
            'rows.*.status' => [
                'required',
                'string',
                Rule::in(['absent', 'excused', 'present', 'late']),
            ],
        ]);

        $subjId = (int) $validated['subj_id'];
        $sectId = (int) $validated['sect_id'];

        $ownsAssignment = $this->teacherAssignments($tchId, $activeSyId)
            ->contains(fn ($assignment) => $assignment->subj_id === $subjId
                && $assignment->sect_id === $sectId);

        if (! $ownsAssignment) {
            return back()->withErrors([
                'verification' => 'You are not scheduled to teach that subject for this section.',
            ]);
        }

        $attDate = Carbon::parse($validated['date'])->toDateString();

        $allowedStuIds = DB::table('student_section')
            ->where('sect_id', $sectId)
            ->when($activeSyId, fn ($builder) => $builder->where('sy_id', $activeSyId))
            ->pluck('stu_id')
            ->map(fn ($v) => (int) $v)
            ->all();

        $allowedSet = array_flip($allowedStuIds);
        $absentStuIds = [];

        DB::transaction(function () use ($validated, $allowedSet, $attDate, $activeSyId, $sectId, $subjId, &$absentStuIds): void {
            foreach ($validated['rows'] as $row) {
                $stuId = (int) $row['stu_id'];
                if (! isset($allowedSet[$stuId])) {
                    continue;
                }

                $status = (string) $row['status'];

                if ($status === 'absent') {
                    $absentStuIds[] = $stuId;

                    $payload = [
                        'stu_id' => $stuId,
                        'session_id' => null,
                        'sect_id' => $sectId,
                        'sy_id' => $activeSyId,
                        'subj_id' => $subjId,
                        'att_date' => $attDate,
                        'status' => 'absent',
                        'time_in' => null,
                    ];

                    DB::table('attendance')->updateOrInsert(
                        [
                            'stu_id' => $stuId,
                            'att_date' => $attDate,
                            'subj_id' => $subjId,
                        ],
                        $payload,
                    );

                    continue;
                }

                $payload = [
                    'stu_id' => $stuId,
                    'session_id' => null,
                    'sect_id' => $sectId,
                    'sy_id' => $activeSyId,
                    'subj_id' => $subjId,
                    'att_date' => $attDate,
                    'status' => $status,
                    'time_in' => in_array($status, ['present', 'late'], true) ? now() : null,
                ];

                DB::table('attendance')->updateOrInsert(
                    [
                        'stu_id' => $stuId,
                        'att_date' => $attDate,
                        'subj_id' => $subjId,
                    ],
                    $payload,
                );
            }
        });

        $subjectName = DB::table('subject')->where('subj_id', $subjId)->value('subj_name');
        $sectionName = DB::table('section')->where('sect_id', $sectId)->value('sect_name');

        if (! empty($absentStuIds)) {
            $this->absenceNotifier->notifyMultiple(
                students: $absentStuIds,
                date: $attDate,
                subjectName: $subjectName,
                sectionName: $sectionName,
            );
        }

        AuditTrail::record(
            $teacher,
            'attendance.verify',
            sprintf(
                'Verified attendance for %s — %s on %s (%d student record(s))',
                $subjectName ?? 'subject',
                $sectionName ?? 'section',
                $attDate,
                count($validated['rows']),
            ),
            [
                'subject' => $subjectName,
                'section' => $sectionName,
                'subj_id' => $subjId,
                'sect_id' => $sectId,
                'date' => $attDate,
                'records' => count($validated['rows']),
            ],
        );

        return redirect()
            ->route('teacher.verification.index', [
                'date' => $attDate,
                'subj_id' => $subjId,
                'sect_id' => $sectId,
            ])
            ->with('success', 'Subject attendance verification saved.');
    }
}
