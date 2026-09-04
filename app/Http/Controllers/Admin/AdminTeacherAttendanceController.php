<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\Teacher;
use App\Models\TeacherAttendance;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class AdminTeacherAttendanceController extends Controller
{
    /**
     * Display daily attendance for all teachers.
     */
    public function index(Request $request): Response
    {
        $dateInput = $request->query('date');
        $attDate = is_string($dateInput) && $dateInput !== ''
            ? Carbon::parse($dateInput)->toDateString()
            : now()->toDateString();

        $query = DB::table('teacher as t')
            ->leftJoin('teacher_attendance as ta', function ($join) use ($attDate): void {
                $join->on('ta.tch_id', '=', 't.tch_id')
                    ->whereDate('ta.att_date', $attDate);
            })
            ->where('t.is_deleted', false)
            ->select(
                't.tch_id',
                't.tch_fname',
                't.tch_mname',
                't.tch_lname',
                't.tch_email',
                't.contact_number',
                't.tch_rfid_uid',
                't.avatar',
                'ta.id as attendance_id',
                'ta.status as attendance_status',
                'ta.time_in',
                'ta.remarks',
            );

        $search = trim((string) $request->query('q', ''));
        if ($search !== '') {
            $query->where(function ($builder) use ($search): void {
                $builder->where('t.tch_fname', 'like', "%{$search}%")
                    ->orWhere('t.tch_mname', 'like', "%{$search}%")
                    ->orWhere('t.tch_lname', 'like', "%{$search}%")
                    ->orWhere('t.tch_email', 'like', "%{$search}%")
                    ->orWhere('t.tch_rfid_uid', 'like', "%{$search}%");
            });
        }

        $statusFilter = $request->query('status');
        if ($statusFilter === 'present' || $statusFilter === 'late' || $statusFilter === 'excused') {
            $query->where('ta.status', $statusFilter);
        } elseif ($statusFilter === 'absent') {
            $query->where(function ($builder): void {
                $builder->whereNull('ta.status')
                    ->orWhere('ta.status', 'absent');
            });
        }

        $summaryQuery = DB::table('teacher as t')
            ->leftJoin('teacher_attendance as ta', function ($join) use ($attDate): void {
                $join->on('ta.tch_id', '=', 't.tch_id')
                    ->whereDate('ta.att_date', $attDate);
            })
            ->where('t.is_deleted', false);

        $totalTeachers = (clone $summaryQuery)->count('t.tch_id');
        $presentCount = (clone $summaryQuery)->where('ta.status', 'present')->count('t.tch_id');
        $lateCount = (clone $summaryQuery)->where('ta.status', 'late')->count('t.tch_id');
        $excusedCount = (clone $summaryQuery)->where('ta.status', 'excused')->count('t.tch_id');
        $absentCount = max(0, $totalTeachers - $presentCount - $lateCount - $excusedCount);

        $rows = $query
            ->orderBy('t.tch_lname')
            ->orderBy('t.tch_fname')
            ->paginate(15)
            ->withQueryString();

        $rows->getCollection()->transform(function ($row) {
            $row->attendance_status = $row->attendance_status ?? 'absent';
            $row->time_in_formatted = $row->time_in
                ? Carbon::parse($row->time_in)->format('h:i A')
                : null;
            $row->avatar = $row->avatar
                ? asset('storage/'.$row->avatar)
                : null;

            return $row;
        });

        return Inertia::render('Admin/TeacherAttendance/Index', [
            'attendance' => $rows,
            'summary' => [
                'total' => $totalTeachers,
                'present' => $presentCount,
                'late' => $lateCount,
                'excused' => $excusedCount,
                'absent' => $absentCount,
            ],
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'date' => $attDate,
                'status' => (is_string($statusFilter) && $statusFilter !== '' && $statusFilter !== 'all')
                    ? $statusFilter
                    : null,
            ],
        ]);
    }

    /**
     * Update or manually record teacher attendance.
     */
    public function update(Request $request, int $teacherId): RedirectResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'status' => ['required', 'in:present,late,absent,excused'],
            'time_in' => ['nullable', 'string'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $teacher = Teacher::query()->where('tch_id', $teacherId)->firstOrFail();

        $attDate = Carbon::parse($validated['date'])->toDateString();
        $timeIn = null;

        if (! empty($validated['time_in']) && in_array($validated['status'], ['present', 'late'], true)) {
            $timeIn = Carbon::parse($attDate.' '.$validated['time_in']);
        } elseif (in_array($validated['status'], ['present', 'late'], true)) {
            $existing = TeacherAttendance::query()
                ->where('tch_id', $teacherId)
                ->whereDate('att_date', $attDate)
                ->first();

            $timeIn = $existing?->time_in ?? now();
        }

        TeacherAttendance::query()->updateOrCreate(
            [
                'tch_id' => $teacher->tch_id,
                'att_date' => $attDate,
            ],
            [
                'status' => $validated['status'],
                'time_in' => $timeIn,
                'remarks' => $validated['remarks'] ?? null,
            ]
        );

        $admin = $request->user('admin');
        if ($admin !== null) {
            $tchName = trim("{$teacher->tch_fname} {$teacher->tch_lname}");
            AuditTrail::record(
                $admin,
                'teacher.attendance.update',
                sprintf('Updated attendance for teacher %s on %s to %s', $tchName, $attDate, $validated['status']),
                [
                    'tch_id' => $teacher->tch_id,
                    'att_date' => $attDate,
                    'status' => $validated['status'],
                    'remarks' => $validated['remarks'] ?? null,
                ]
            );
        }

        return back()->with('success', 'Teacher attendance updated successfully.');
    }
}
