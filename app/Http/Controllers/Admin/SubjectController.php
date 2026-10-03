<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\Subject;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    public function index(Request $request)
    {
        $archived = $request->boolean('archived');
        $gradeLevel = $request->query('gradeLevel');

        $query = Subject::select('subj_id', 'subj_code', 'subj_name', 'gr_level', 'is_deleted')
            ->where('is_deleted', $archived)
            ->when($gradeLevel && $gradeLevel !== 'all', function ($q) use ($gradeLevel) {
                $q->where('gr_level', $gradeLevel);
            })
            ->orderBy('gr_level')
            ->orderBy('subj_code');

        $subjects = $query->paginate(8)->withQueryString();

        return inertia('Admin/Subject/Index', [
            'subjects' => $subjects,
            'archived' => $archived,
            'gradeLevels' => $this->getAvailableGradeLevels(),
            'filters' => [
                'gradeLevel' => $gradeLevel && $gradeLevel !== 'all' ? $gradeLevel : 'all',
            ],
        ]);
    }

    public function show(Request $request, int $id)
    {
        $subject = Subject::findOrFail($id);

        $teachers = DB::table('class_schedule as cs')
            ->join('teacher as t', 't.tch_id', '=', 'cs.tch_id')
            ->where('cs.subj_id', $id)
            ->where('t.is_deleted', false)
            ->select('t.tch_id', 't.tch_fname', 't.tch_mname', 't.tch_lname', 't.tch_email', 't.contact_number')
            ->distinct()
            ->orderBy('t.tch_lname')
            ->get();

        $enrolledStudents = DB::table('student_subject as ss')
            ->join('student as s', 's.stu_id', '=', 'ss.stu_id')
            ->where('ss.subj_id', $id)
            ->where('s.is_deleted', false)
            ->select('s.stu_id', 's.lrn', 's.stu_fname', 's.stu_mname', 's.stu_lname', 'ss.enrolled_at')
            ->orderBy('s.stu_lname')
            ->get();

        $enrolledIds = $enrolledStudents->pluck('stu_id');

        $sections = DB::table('section as sec')
            ->join('student_section as ss2', 'ss2.sect_id', '=', 'sec.sect_id')
            ->join('student as s', 's.stu_id', '=', 'ss2.stu_id')
            ->where('sec.is_deleted', false)
            ->where('s.is_deleted', false)
            ->whereNotIn('s.stu_id', $enrolledIds)
            ->select('sec.sect_id', 'sec.sect_name', 'sec.gr_level', 's.stu_id', 's.lrn', 's.stu_fname', 's.stu_mname', 's.stu_lname')
            ->orderBy('sec.gr_level')
            ->orderBy('sec.sect_name')
            ->orderBy('s.stu_lname')
            ->get()
            ->groupBy('sect_id')
            ->map(fn ($rows) => [
                'sect_id' => $rows->first()->sect_id,
                'sect_name' => $rows->first()->sect_name,
                'gr_level' => $rows->first()->gr_level,
                'students' => $rows->map(fn ($r) => [
                    'stu_id' => $r->stu_id,
                    'lrn' => $r->lrn,
                    'stu_fname' => $r->stu_fname,
                    'stu_mname' => $r->stu_mname,
                    'stu_lname' => $r->stu_lname,
                ])->values(),
            ])
            ->values();

        $data = [
            'subject' => $subject,
            'teachers' => $teachers,
            'enrolledStudents' => $enrolledStudents,
            'sections' => $sections,
            'gradeLevels' => $this->getAvailableGradeLevels(),
        ];

        if ($request->wantsJson()) {
            return response()->json($data);
        }

        return inertia('Admin/Subject/Show', $data);
    }

    /**
     * Get unique, naturally sorted grade levels from sections, subjects, and defaults.
     *
     * @return array<int, string>
     */
    private function getAvailableGradeLevels(): array
    {
        return Section::query()
            ->whereNotNull('gr_level')
            ->where('gr_level', '!=', '')
            ->distinct()
            ->pluck('gr_level')
            ->merge(
                Subject::query()
                    ->whereNotNull('gr_level')
                    ->where('gr_level', '!=', '')
                    ->distinct()
                    ->pluck('gr_level')
            )
            ->merge(['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'])
            ->unique()
            ->values()
            ->sort(fn ($a, $b) => strnatcasecmp($a, $b))
            ->values()
            ->all();
    }

    public function attachStudents(Request $request, int $id)
    {
        $subject = Subject::findOrFail($id);

        $validated = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'integer|exists:student,stu_id',
        ], [
            'student_ids.required' => 'Please select at least one student to enroll.',
            'student_ids.min' => 'Please select at least one student to enroll.',
            'student_ids.*.exists' => 'One or more selected students do not exist.',
        ]);

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        $rows = array_map(fn ($stuId) => [
            'stu_id' => $stuId,
            'subj_id' => $subject->subj_id,
            'sy_id' => $activeSyId,
            'enrolled_at' => now(),
        ], $validated['student_ids']);

        DB::table('student_subject')->insertOrIgnore($rows);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => count($rows).' student(s) enrolled successfully.',
            ]);
        }

        return redirect()->back()
            ->with('success', count($rows).' student(s) enrolled successfully.');
    }

    public function detachStudent(Request $request, int $id, int $studentId)
    {
        Subject::findOrFail($id);

        DB::table('student_subject')
            ->where('subj_id', $id)
            ->where('stu_id', $studentId)
            ->delete();

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Student removed from subject.',
            ]);
        }

        return redirect()->back()
            ->with('success', 'Student removed from subject.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subj_code' => ['required', 'string', 'max:20', 'unique:subject,subj_code'],
            'subj_name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, Closure $fail) use ($request): void {
                    $subjName = trim((string) preg_replace('/\s+/', ' ', (string) $value));
                    $grLevel = trim((string) $request->input('gr_level', ''));

                    if ($subjName === '') {
                        return;
                    }

                    $exists = Subject::query()
                        ->where('is_deleted', false)
                        ->whereRaw('LOWER(TRIM(subj_name)) = LOWER(?)', [$subjName])
                        ->when($grLevel !== '', function ($q) use ($grLevel): void {
                            $q->whereRaw('LOWER(TRIM(gr_level)) = LOWER(?)', [$grLevel]);
                        })
                        ->exists();

                    if ($exists) {
                        $fail('This subject is already registered.');
                    }
                },
            ],
            'gr_level' => 'required|string|max:20',
        ], [
            'subj_code.required' => 'Subject code is required.',
            'subj_code.unique' => 'This subject code is already registered.',
            'subj_name.required' => 'Subject name is required.',
            'gr_level.required' => 'Grade level is required.',
        ]);

        Subject::create($validated);

        return redirect()->route('admin.subject.index')
            ->with('success', 'Subject successfully added.');
    }

    public function update(Request $request, int $id)
    {
        $subject = Subject::findOrFail($id);

        $validated = $request->validate([
            'subj_code' => ['required', 'string', 'max:20', 'unique:subject,subj_code,'.$subject->subj_id.',subj_id'],
            'subj_name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, Closure $fail) use ($request, $subject): void {
                    $subjName = trim((string) preg_replace('/\s+/', ' ', (string) $value));
                    $grLevel = trim((string) $request->input('gr_level', $subject->gr_level));

                    if ($subjName === '') {
                        return;
                    }

                    $exists = Subject::query()
                        ->where('subj_id', '!=', $subject->subj_id)
                        ->where('is_deleted', false)
                        ->whereRaw('LOWER(TRIM(subj_name)) = LOWER(?)', [$subjName])
                        ->when($grLevel !== '', function ($q) use ($grLevel): void {
                            $q->whereRaw('LOWER(TRIM(gr_level)) = LOWER(?)', [$grLevel]);
                        })
                        ->exists();

                    if ($exists) {
                        $fail('This subject is already registered.');
                    }
                },
            ],
            'gr_level' => 'required|string|max:20',
        ], [
            'subj_code.required' => 'Subject code is required.',
            'subj_code.unique' => 'This subject code is already registered.',
            'subj_name.required' => 'Subject name is required.',
            'gr_level.required' => 'Grade level is required.',
        ]);

        $subject->update($validated);

        return redirect()->route('admin.subject.index')
            ->with('success', 'Subject updated successfully.');
    }

    public function destroy(Subject $subject)
    {
        $subject->update(['is_deleted' => true]);

        return redirect()->route('admin.subject.index')
            ->with('success', 'Subject archived successfully.');
    }

    public function restore(int $id)
    {
        $subject = Subject::findOrFail($id);
        $subject->update(['is_deleted' => false]);

        return redirect()->back()
            ->with('success', 'Subject restored successfully.');
    }

    public function forceDelete(int $id)
    {
        $subject = Subject::findOrFail($id);
        $subject->delete();

        return redirect()->back()
            ->with('success', 'Subject permanently deleted.');
    }
}
