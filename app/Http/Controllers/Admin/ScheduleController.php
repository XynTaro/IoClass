<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Class_Schedule;
use App\Models\Room;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Teacher;
use App\Services\ClassScheduleService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class ScheduleController extends Controller
{
    public function __construct(private ClassScheduleService $classScheduleService) {}

    public function index(): Response
    {
        $sections = Section::select('sect_id', 'sect_name', 'gr_level')
            ->where('is_deleted', false)
            ->withCount('schedules')
            ->orderBy('gr_level')
            ->orderBy('sect_name')
            ->get();

        return inertia('Admin/Schedule Management/Index', [
            'sections' => $sections,
        ]);
    }

    public function showSection(int $sectionId): Response
    {
        $section = Section::findOrFail($sectionId);

        $schedules = Class_Schedule::with([
            'teacher:tch_id,tch_fname,tch_mname,tch_lname',
            'subject:subj_id,subj_code,subj_name',
            'room:room_id,room_no,building_id',
            'room.building:building_id,building_name',
        ])
            ->where('sect_id', $sectionId)
            ->orderByRaw("CASE day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 END ASC")
            ->orderBy('start_time')
            ->get();

        $teachers = Teacher::select('tch_id', 'tch_fname', 'tch_mname', 'tch_lname')
            ->where('is_deleted', false)
            ->orderBy('tch_lname')
            ->get();

        $rooms = Room::with('building:building_id,building_name')
            ->select('room_id', 'room_no', 'building_id')
            ->where('is_deleted', false)
            ->orderBy('room_no')
            ->get();

        $subjects = Subject::select('subj_id', 'subj_code', 'subj_name', 'gr_level')
            ->where('is_deleted', false)
            ->orderBy('gr_level')
            ->orderBy('subj_code')
            ->get();

        return inertia('Admin/Schedule Management/Show', [
            'section' => $section,
            'schedules' => $schedules,
            'teachers' => $teachers,
            'rooms' => $rooms,
            'subjects' => $subjects,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate(array_merge(
            [
                'tch_id' => 'required|integer|exists:teacher,tch_id',
            ],
            ClassScheduleService::slotValidationRules(),
            ClassScheduleService::adviserValidationRules(),
        ));

        $slots = $validated['schedules'] ?? [];

        if ($slots === []) {
            return redirect()->back()
                ->withErrors(['schedules' => 'Add at least one schedule slot.']);
        }

        $this->classScheduleService->createFromSlots($validated['tch_id'], $slots);

        if ($validated['is_adviser'] ?? false) {
            $this->classScheduleService->createAdviser(
                $validated['tch_id'],
                $validated['adviser_sect_id'],
            );
        }

        return redirect()->back()
            ->with('success', 'Schedule saved successfully.');
    }

    public function update(Request $request, int $schedule): RedirectResponse
    {
        $scheduleModel = Class_Schedule::findOrFail($schedule);

        $days = implode(',', ClassScheduleService::daysOfWeek());

        $validated = $request->validate([
            'tch_id' => 'nullable|integer|exists:teacher,tch_id',
            'sect_id' => 'required|integer|exists:section,sect_id',
            'room_id' => 'required|integer|exists:room,room_id',
            'subj_id' => 'required|integer|exists:subject,subj_id',
            'day_of_week' => "required|string|in:{$days}",
            'start_time' => 'required|date_format:H:i',
            'end_time' => 'required|date_format:H:i',
        ]);

        $this->classScheduleService->updateSchedule($scheduleModel, $validated);

        return redirect()->back()
            ->with('success', 'Schedule updated successfully.');
    }

    public function destroy(int $schedule): RedirectResponse
    {
        Class_Schedule::findOrFail($schedule)->delete();

        return redirect()->back()
            ->with('success', 'Schedule deleted successfully.');
    }
}
