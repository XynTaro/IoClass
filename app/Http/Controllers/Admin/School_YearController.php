<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\School_Year;
use Illuminate\Http\Request;

class School_YearController extends Controller
{
    public function index(Request $request)
    {
        $archived = $request->boolean('archived');

        $schoolYears = School_Year::select('sy_id', 'sy_label', 'start_date', 'end_date', 'is_active', 'is_deleted')
            ->where('is_deleted', $archived)
            ->orderBy('sy_id', 'desc')
            ->paginate(8);

        return inertia('Admin/SchoolYear/Index', [
            'schoolYears' => $schoolYears,
            'archived' => $archived,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sy_label' => 'required|string|max:20|unique:school_year,sy_label',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        if ($validated['is_active'] ?? false) {
            School_Year::where('is_active', true)->update(['is_active' => false]);
        }

        School_Year::create($validated);

        return redirect()->route('admin.school-year.index')
            ->with('success', 'School year successfully added.');
    }

    public function update(Request $request, int $id)
    {
        $schoolYear = School_Year::findOrFail($id);

        $validated = $request->validate([
            'sy_label' => 'required|string|max:20|unique:school_year,sy_label,'.$schoolYear->sy_id.',sy_id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_active' => 'boolean',
        ]);

        if ($validated['is_active'] ?? false) {
            School_Year::where('is_active', true)
                ->where('sy_id', '!=', $id)
                ->update(['is_active' => false]);
        }

        $schoolYear->update($validated);

        return redirect()->route('admin.school-year.index')
            ->with('success', 'School year updated successfully.');
    }

    public function destroy(School_Year $school_Year)
    {
        $school_Year->update(['is_deleted' => true]);

        return redirect()->route('admin.school-year.index')
            ->with('success', 'School year archived successfully.');
    }

    public function restore(int $id)
    {
        $schoolYear = School_Year::findOrFail($id);
        $schoolYear->update(['is_deleted' => false]);

        return redirect()->back()
            ->with('success', 'School year restored successfully.');
    }

    public function forceDelete(int $id)
    {
        $schoolYear = School_Year::findOrFail($id);
        $schoolYear->delete();

        return redirect()->back()
            ->with('success', 'School year permanently deleted.');
    }
}
