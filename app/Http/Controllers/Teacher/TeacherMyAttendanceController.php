<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class TeacherMyAttendanceController extends Controller
{
    /**
     * Display personal attendance history and monthly summary for the authenticated teacher.
     */
    public function index(Request $request): Response
    {
        $teacher = $request->user('teacher');
        $tchId = $teacher->tch_id;

        $dateInput = $request->query('date');
        $specificDate = is_string($dateInput) && $dateInput !== ''
            ? Carbon::parse($dateInput)->toDateString()
            : null;

        $search = trim((string) $request->query('q', ''));
        $attendanceFilter = $request->query('attendance', $request->query('status', 'all'));

        $query = DB::table('teacher_attendance')
            ->where('tch_id', $tchId);

        if ($specificDate !== null) {
            $query->whereDate('att_date', $specificDate);
        }

        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->where('remarks', 'like', "%{$search}%")
                    ->orWhere('att_date', 'like', "%{$search}%");
            });
        }

        if (in_array($attendanceFilter, ['present', 'late', 'excused', 'absent'], true)) {
            $query->where('status', $attendanceFilter);
        }

        $records = $query->orderBy('att_date', 'desc')->paginate(15)->withQueryString();

        $records->getCollection()->transform(function ($row) {
            $row->att_date_formatted = Carbon::parse($row->att_date)->format('M d, Y (D)');
            $row->time_in_formatted = $row->time_in
                ? Carbon::parse($row->time_in)->format('h:i A')
                : null;

            return $row;
        });

        // Summary query (scoped by date if date filter active, else overall for this teacher)
        $summaryQuery = DB::table('teacher_attendance')
            ->where('tch_id', $tchId);

        if ($specificDate !== null) {
            $summaryQuery->whereDate('att_date', $specificDate);
        }

        $presentCount = (clone $summaryQuery)->where('status', 'present')->count();
        $lateCount = (clone $summaryQuery)->where('status', 'late')->count();
        $excusedCount = (clone $summaryQuery)->where('status', 'excused')->count();
        $absentCount = (clone $summaryQuery)->where('status', 'absent')->count();
        $totalDays = (clone $summaryQuery)->count();

        if ($specificDate !== null && $totalDays === 0) {
            $activeSyId = DB::table('school_year')
                ->where('is_active', true)
                ->value('sy_id');
            $activeSyId = $activeSyId !== null ? (int) $activeSyId : null;

            $dayOfWeek = Carbon::parse($specificDate)->format('l');
            $isNonSchoolDay = CalendarEvent::isNonSchoolDay($specificDate, $activeSyId);

            $hasClassThatDay = ! $isNonSchoolDay && DB::table('class_schedule')
                ->where('tch_id', $tchId)
                ->where('day_of_week', $dayOfWeek)
                ->when($activeSyId, fn ($q) => $q->where(function ($sub) use ($activeSyId): void {
                    $sub->where('sy_id', $activeSyId)->orWhereNull('sy_id');
                }))
                ->exists();

            if ($hasClassThatDay) {
                $totalDays = 1;
                $absentCount = 1;
            }
        }

        return Inertia::render('Teacher/MyAttendance/Index', [
            'attendance' => $records,
            'summary' => [
                'total' => $totalDays,
                'present' => $presentCount,
                'late' => $lateCount,
                'excused' => $excusedCount,
                'absent' => $absentCount,
            ],
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'date' => $specificDate,
                'attendance' => is_string($attendanceFilter) && $attendanceFilter !== '' && $attendanceFilter !== 'all' ? $attendanceFilter : null,
            ],
        ]);
    }
}
