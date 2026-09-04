<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class CalendarEventController extends Controller
{
    public function index(Request $request): Response
    {
        $schoolYears = DB::table('school_year')
            ->where('is_deleted', false)
            ->orderByDesc('is_active')
            ->orderByDesc('start_date')
            ->get(['sy_id', 'sy_label', 'start_date', 'end_date', 'is_active']);

        $activeSyId = $schoolYears->firstWhere('is_active', true)?->sy_id
            ?? $schoolYears->first()?->sy_id;

        $syIdInput = $request->query('sy_id');
        $selectedSyId = is_numeric($syIdInput) ? (int) $syIdInput : ($activeSyId !== null ? (int) $activeSyId : null);

        $events = $selectedSyId !== null
            ? CalendarEvent::where('sy_id', $selectedSyId)
                ->orderBy('start_date')
                ->get()
            : collect();

        return Inertia::render('Admin/Calendar/Index', [
            'events' => $events,
            'schoolYears' => $schoolYears->map(fn ($sy) => [
                'sy_id' => (int) $sy->sy_id,
                'sy_label' => (string) $sy->sy_label,
                'is_active' => (bool) $sy->is_active,
            ])->values()->all(),
            'selectedSyId' => $selectedSyId,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sy_id' => 'required|integer|exists:school_year,sy_id',
            'title' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'type' => 'required|string|in:holiday,break,suspension,special_event',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_school_day' => 'boolean',
        ]);

        $validated['is_school_day'] = $validated['is_school_day'] ?? false;

        CalendarEvent::create($validated);

        return redirect()->route('admin.calendar.index', ['sy_id' => $validated['sy_id']])
            ->with('success', 'Calendar event created successfully.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $event = CalendarEvent::findOrFail($id);

        $validated = $request->validate([
            'title' => 'required|string|max:150',
            'description' => 'nullable|string|max:500',
            'type' => 'required|string|in:holiday,break,suspension,special_event',
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'is_school_day' => 'boolean',
        ]);

        $validated['is_school_day'] = $validated['is_school_day'] ?? false;

        $event->update($validated);

        return redirect()->route('admin.calendar.index', ['sy_id' => $event->sy_id])
            ->with('success', 'Calendar event updated successfully.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $event = CalendarEvent::findOrFail($id);
        $syId = $event->sy_id;

        $event->delete();

        return redirect()->route('admin.calendar.index', ['sy_id' => $syId])
            ->with('success', 'Calendar event deleted successfully.');
    }
}
