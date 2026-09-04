<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Class_Schedule;
use Illuminate\Support\Facades\Auth;
use Inertia\Response;

class TeacherScheduleController extends Controller
{
    public function index(): Response
    {
        $teacher = Auth::guard('teacher')->user();

        $schedules = Class_Schedule::with([
            'subject:subj_id,subj_code,subj_name',
            'section:sect_id,sect_name,gr_level',
            'room:room_id,room_no,building_id',
            'room.building:building_id,building_name',
        ])
            ->where('tch_id', $teacher->tch_id)
            ->orderByRaw("CASE day_of_week WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3 WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7 END ASC")
            ->orderBy('start_time')
            ->get();

        return inertia('Teacher/My Schedule/index', [
            'schedules' => $schedules,
        ]);
    }
}
