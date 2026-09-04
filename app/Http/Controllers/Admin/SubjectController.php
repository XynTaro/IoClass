<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\Subject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    public function index(Request $request)
    {
        $archived = $request->boolean('archived');

        $subjects = Subject::select('subj_id', 'subj_code', 'subj_name', 'gr_level', 'is_deleted')
            ->where('is_deleted', $archived)
            ->orderBy('gr_level')
            ->orderBy('subj_code')
            ->paginate(8);

        $gradeLevels = Section::query()
            ->whereNotNull('gr_level')
            ->where('gr_level', '!=', '')
            ->distinct()
            ->orderBy('gr_level')
            ->pluck('gr_level');

        return inertia('Admin/Subject/Index', [
            'subjects' => $subjects,
            'archived' => $archived,
            'gradeLevels' => $gradeLevels,
        ]);
    }

    public function show(int $id)
    {
        $subject = Subject::findOrFail($id);

        $teachers = DB::table('teacher_subject as ts')
            ->join('teacher as t', 't.tch_id', '=', 'ts.tch_id')
            ->where('ts.subj_id', $id)
            ->where('t.is_deleted', false)
            ->select('t.tch_id', 't.tch_fname', 't.tch_mname', 't.tch_lname', 't.tch_email', 't.contact_number')
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

        $gradeLevels = Section::query()
            ->whereNotNull('gr_level')
            ->where('gr_level', '!=', '')
            ->distinct()
            ->orderBy('gr_level')
            ->pluck('gr_level');

        return inertia('Admin/Subject/Show', [
            'subject' => $subject,
            'teachers' => $teachers,
            'enrolledStudents' => $enrolledStudents,
            'sections' => $sections,
            'gradeLevels' => $gradeLevels,
        ]);
    }

    public function attachStudents(Request $request, int $id)
    {
        $subject = Subject::findOrFail($id);

        $validated = $request->validate([
            'student_ids' => 'required|array|min:1',
            'student_ids.*' => 'integer|exists:student,stu_id',
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

        return redirect()->route('admin.subject.show', $id)
            ->with('success', count($rows).' student(s) enrolled successfully.');
    }

    public function detachStudent(int $id, int $studentId)
    {
        Subject::findOrFail($id);

        DB::table('student_subject')
            ->where('subj_id', $id)
            ->where('stu_id', $studentId)
            ->delete();

        return redirect()->route('admin.subject.show', $id)
            ->with('success', 'Student removed from subject.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subj_code' => 'required|string|max:20|unique:subject,subj_code',
            'subj_name' => 'required|string|max:100',
            'gr_level' => 'required|string|max:20',
        ]);

        Subject::create($validated);

        return redirect()->route('admin.subject.index')
            ->with('success', 'Subject successfully added.');
    }

    public function update(Request $request, int $id)
    {
        $subject = Subject::findOrFail($id);

        $validated = $request->validate([
            'subj_code' => 'required|string|max:20|unique:subject,subj_code,'.$subject->subj_id.',subj_id',
            'subj_name' => 'required|string|max:100',
            'gr_level' => 'required|string|max:20',
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
