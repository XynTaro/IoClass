<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\School_Year;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Response;

class School_YearController extends Controller
{
    public function index(Request $request): Response
    {
        $today = now()->toDateString();
        School_Year::syncActiveForDate($today);

        $archived = $request->boolean('archived');

        $schoolYears = School_Year::select(
            'sy_id',
            'sy_label',
            'start_date',
            'end_date',
            'sem1_start_date',
            'sem1_end_date',
            'sem2_start_date',
            'sem2_end_date',
            'is_active',
            'is_deleted'
        )
            ->where('is_deleted', $archived)
            ->orderBy('sy_id', 'desc')
            ->paginate(8)
            ->through(function (School_Year $schoolYear) use ($today): array {
                return [
                    'sy_id' => $schoolYear->sy_id,
                    'sy_label' => $schoolYear->sy_label,
                    'start_date' => $schoolYear->start_date?->format('Y-m-d'),
                    'end_date' => $schoolYear->end_date?->format('Y-m-d'),
                    'sem1_start_date' => $schoolYear->sem1_start_date?->format('Y-m-d'),
                    'sem1_end_date' => $schoolYear->sem1_end_date?->format('Y-m-d'),
                    'sem2_start_date' => $schoolYear->sem2_start_date?->format('Y-m-d'),
                    'sem2_end_date' => $schoolYear->sem2_end_date?->format('Y-m-d'),
                    'is_active' => (bool) $schoolYear->is_active,
                    'is_deleted' => (bool) $schoolYear->is_deleted,
                    'tracking_status' => $schoolYear->getTrackingStatus($today),
                ];
            });

        $activeSchoolYear = School_Year::where('is_deleted', false)
            ->where('is_active', true)
            ->first(['sy_id', 'sy_label', 'start_date', 'end_date']);

        return inertia('Admin/SchoolYear/Index', [
            'schoolYears' => $schoolYears,
            'archived' => $archived,
            'today' => $today,
            'activeSchoolYear' => $activeSchoolYear ? [
                'sy_id' => $activeSchoolYear->sy_id,
                'sy_label' => $activeSchoolYear->sy_label,
                'start_date' => $activeSchoolYear->start_date?->format('Y-m-d'),
                'end_date' => $activeSchoolYear->end_date?->format('Y-m-d'),
            ] : null,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sy_label' => 'required|string|max:20|unique:school_year,sy_label',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'sem1_start_date' => 'nullable|date',
            'sem1_end_date' => 'nullable|date|after_or_equal:sem1_start_date',
            'sem2_start_date' => 'nullable|date',
            'sem2_end_date' => 'nullable|date|after_or_equal:sem2_start_date',
            'is_active' => 'boolean',
        ], [
            'sy_label.required' => 'School year label is required.',
            'sy_label.unique' => 'This school year label is already taken.',
            'start_date.required' => 'Start date is required.',
            'start_date.date' => 'Start date must be a valid date.',
            'end_date.required' => 'End date is required.',
            'end_date.date' => 'End date must be a valid date.',
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
            'sem1_start_date.date' => '1st semester start date must be a valid date.',
            'sem1_end_date.date' => '1st semester end date must be a valid date.',
            'sem1_end_date.after_or_equal' => '1st semester end date must be on or after 1st semester start date.',
            'sem2_start_date.date' => '2nd semester start date must be a valid date.',
            'sem2_end_date.date' => '2nd semester end date must be a valid date.',
            'sem2_end_date.after_or_equal' => '2nd semester end date must be on or after 2nd semester start date.',
        ]);

        $trackingStatus = $this->ensureActiveStatusAllowed($validated);

        if ($trackingStatus !== School_Year::STATUS_CURRENT) {
            $validated['is_active'] = false;
        } elseif ($validated['is_active'] ?? false) {
            School_Year::where('is_active', true)->update(['is_active' => false]);
        }

        School_Year::create($validated);
        School_Year::syncActiveForDate();

        return redirect()->route('admin.school-year.index')
            ->with('success', 'School year successfully added.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $schoolYear = School_Year::findOrFail($id);

        $validated = $request->validate([
            'sy_label' => 'required|string|max:20|unique:school_year,sy_label,'.$schoolYear->sy_id.',sy_id',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'sem1_start_date' => 'nullable|date',
            'sem1_end_date' => 'nullable|date|after_or_equal:sem1_start_date',
            'sem2_start_date' => 'nullable|date',
            'sem2_end_date' => 'nullable|date|after_or_equal:sem2_start_date',
            'is_active' => 'boolean',
        ], [
            'sy_label.required' => 'School year label is required.',
            'sy_label.unique' => 'This school year label is already taken.',
            'start_date.required' => 'Start date is required.',
            'start_date.date' => 'Start date must be a valid date.',
            'end_date.required' => 'End date is required.',
            'end_date.date' => 'End date must be a valid date.',
            'end_date.after_or_equal' => 'End date must be on or after the start date.',
            'sem1_start_date.date' => '1st semester start date must be a valid date.',
            'sem1_end_date.date' => '1st semester end date must be a valid date.',
            'sem1_end_date.after_or_equal' => '1st semester end date must be on or after 1st semester start date.',
            'sem2_start_date.date' => '2nd semester start date must be a valid date.',
            'sem2_end_date.date' => '2nd semester end date must be a valid date.',
            'sem2_end_date.after_or_equal' => '2nd semester end date must be on or after 2nd semester start date.',
        ]);

        $trackingStatus = $this->ensureActiveStatusAllowed($validated);

        if ($trackingStatus !== School_Year::STATUS_CURRENT) {
            $validated['is_active'] = false;
        } elseif ($validated['is_active'] ?? false) {
            School_Year::where('is_active', true)
                ->where('sy_id', '!=', $id)
                ->update(['is_active' => false]);
        }

        $schoolYear->update($validated);
        School_Year::syncActiveForDate();

        return redirect()->route('admin.school-year.index')
            ->with('success', 'School year updated successfully.');
    }

    public function destroy(School_Year $school_Year): RedirectResponse
    {
        $school_Year->update([
            'is_deleted' => true,
            'is_active' => false,
        ]);

        School_Year::syncActiveForDate();

        return redirect()->route('admin.school-year.index')
            ->with('success', 'School year archived successfully.');
    }

    public function restore(int $id): RedirectResponse
    {
        $schoolYear = School_Year::findOrFail($id);
        $schoolYear->update(['is_deleted' => false]);

        School_Year::syncActiveForDate();

        return redirect()->back()
            ->with('success', 'School year restored successfully.');
    }

    public function forceDelete(int $id): RedirectResponse
    {
        $schoolYear = School_Year::findOrFail($id);
        $schoolYear->delete();

        School_Year::syncActiveForDate();

        return redirect()->back()
            ->with('success', 'School year permanently deleted.');
    }

    /**
     * Validate that only a school year covering today's date can be marked active.
     *
     * @param  array<string, mixed>  $validated
     * @return 'current'|'upcoming'|'ended'|'unscheduled'
     */
    private function ensureActiveStatusAllowed(array $validated): string
    {
        $trackingStatus = School_Year::statusForDates(
            $validated['start_date'] ?? null,
            $validated['end_date'] ?? null,
        );

        $wantsActive = (bool) ($validated['is_active'] ?? false);

        if ($wantsActive && $trackingStatus !== School_Year::STATUS_CURRENT) {
            $message = match ($trackingStatus) {
                School_Year::STATUS_UPCOMING => sprintf(
                    'Cannot set an upcoming school year as active. It can only become active starting %s.',
                    Carbon::parse($validated['start_date'])->format('F j, Y')
                ),
                School_Year::STATUS_ENDED => sprintf(
                    'Cannot set an ended school year as active. This school year already ended on %s.',
                    Carbon::parse($validated['end_date'])->format('F j, Y')
                ),
                default => 'Only the school year covering today\'s date can be set as active.',
            };

            throw ValidationException::withMessages([
                'is_active' => $message,
            ]);
        }

        return $trackingStatus;
    }
}
