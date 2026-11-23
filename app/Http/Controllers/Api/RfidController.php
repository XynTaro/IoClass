<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\RfidRegisterRequest;
use App\Http\Requests\Api\RfidScanRequest;
use App\Models\Class_Schedule;
use App\Models\School_Year;
use App\Models\Student;
use App\Models\Teacher;
use App\Services\StudentAbsenceNotifier;
use App\Services\StudentAttendanceService;
use App\Services\TeacherAttendanceService;
use App\Support\RfidCaptureCache;
use App\Support\RfidRegistryCache;
use App\Support\RfidSessionCache;
use App\Support\RfidUid;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RfidController extends Controller
{
    private StudentAbsenceNotifier $absenceNotifier;

    public function __construct(
        private StudentAttendanceService $studentAttendanceService,
        private TeacherAttendanceService $teacherAttendanceService,
        ?StudentAbsenceNotifier $absenceNotifier = null,
    ) {
        $this->absenceNotifier = $absenceNotifier ?? app(StudentAbsenceNotifier::class);
    }

    /**
     * Resolve a scanned RFID UID.
     *
     * - Teacher tap  → opens a session for this device (links to current class schedule) & records daily attendance,
     *                  or ends the active session on second tap and marks students who did not time out as absent.
     * - Student tap  → records attendance only inside the active class window.
     * - Unknown card → stores UID in capture cache so admin can assign via web UI.
     */
    public function scan(RfidScanRequest $request): JsonResponse
    {
        School_Year::syncActiveIfNeeded();

        $uid = $request->validated('rfid_uid');
        $deviceKey = RfidCaptureCache::deviceKeyFromRequest($request->header('X-Device-Token'));

        RfidCaptureCache::store($deviceKey, $uid);

        // ── Teacher tap: record attendance & open/end a session ───────────────
        $teacher = Teacher::query()
            ->where('is_deleted', false)
            ->where(function ($query): void {
                $query->where('status', 'active')->orWhereNull('status');
            })
            ->where(function ($query) use ($uid): void {
                $query
                    ->where('tch_rfid_uid', $uid)
                    ->orWhere('master_card', $uid);
            })
            ->first();

        if ($teacher !== null) {
            $teacherAttendance = $this->teacherAttendanceService->recordForTeacher($teacher);
            $existingSession = RfidSessionCache::get($deviceKey);
            $matchingSchedule = $this->findMatchingSchedule($teacher);

            if ($this->shouldEndSession($existingSession, $teacher, $matchingSchedule)) {
                $finalized = $this->closeAndFinalizeSession($deviceKey, $existingSession);

                return response()->json([
                    'success' => true,
                    'type' => 'teacher',
                    'action' => 'session_ended',
                    'data' => $teacher->only(['tch_id', 'tch_fname', 'tch_mname', 'tch_lname']),
                    'attendance' => $teacherAttendance,
                    'session' => [
                        'sect_name' => $existingSession['sect_name'] ?? null,
                        'subj_name' => $existingSession['subj_name'] ?? null,
                        'start_time' => $existingSession['start_time'] ?? null,
                        'end_time' => $existingSession['end_time'] ?? null,
                        'absences_marked' => $finalized['absences_found'],
                        'notifications_sent' => $finalized['notified_count'],
                    ],
                ]);
            }

            if (
                $existingSession !== null
                && ! empty($existingSession['subj_id'])
                && ! empty($existingSession['sect_id'])
                && (int) ($existingSession['schedule_id'] ?? 0) !== (int) ($matchingSchedule?->schedule_id ?? 0)
            ) {
                $this->closeAndFinalizeSession($deviceKey, $existingSession);
            }

            $session = $this->openSession($deviceKey, $teacher, $matchingSchedule);

            return response()->json([
                'success' => true,
                'type' => 'teacher',
                'action' => 'session_started',
                'data' => $teacher->only(['tch_id', 'tch_fname', 'tch_mname', 'tch_lname']),
                'attendance' => $teacherAttendance,
                'session' => [
                    'sect_name' => $session['sect_name'],
                    'subj_name' => $session['subj_name'],
                    'start_time' => $session['start_time'],
                    'end_time' => $session['end_time'],
                    'auto_transferred' => $session['auto_transferred'],
                ],
            ]);
        }

        // ── Student tap: record attendance ────────────────────────────────────
        $student = Student::query()
            ->where('rfid_uid', $uid)
            ->where('is_deleted', false)
            ->first(['stu_id', 'lrn', 'stu_fname', 'stu_mname', 'stu_lname', 'status']);

        if ($student !== null) {
            $activeSession = RfidSessionCache::get($deviceKey);
            $attendance = $this->studentAttendanceService->recordForStudent($student, null, $activeSession);
            $action = ($attendance['action'] ?? null) === 'time_out' ? 'time_out' : 'attendance';

            return response()->json([
                'success' => true,
                'type' => 'student',
                'action' => $action,
                'data' => $student,
                'attendance' => $attendance,
                'session' => $activeSession !== null ? [
                    'tch_name' => $activeSession['tch_name'],
                    'sect_name' => $activeSession['sect_name'],
                    'subj_name' => $activeSession['subj_name'],
                ] : null,
            ]);
        }

        // ── Unknown card ──────────────────────────────────────────────────────
        return response()->json([
            'success' => false,
            'message' => 'RFID UID not recognized.',
        ]);
    }

    /**
     * Store a scanned UID for admin enrollment modals (no lookup).
     */
    public function capture(RfidScanRequest $request): JsonResponse
    {
        $uid = $request->validated('rfid_uid');

        RfidCaptureCache::store(
            RfidCaptureCache::deviceKeyFromRequest($request->header('X-Device-Token')),
            $uid,
        );

        return response()->json([
            'success' => true,
            'rfid_uid' => RfidUid::normalize($uid),
        ]);
    }

    /**
     * Register an RFID card to a teacher or student from the ESP32 device.
     */
    public function register(RfidRegisterRequest $request): JsonResponse
    {
        $uid = $request->validated('rfid_uid');
        $type = $request->validated('type');
        $name = $request->validated('name');

        if ($this->uidAlreadyUsed($uid)) {
            return response()->json([
                'success' => false,
                'message' => 'RFID card already registered.',
            ]);
        }

        [$fname, $mname, $lname] = $this->splitName($name);

        if ($type === 'teacher') {
            return $this->registerTeacher($uid, $fname, $mname, $lname);
        }

        return $this->registerStudent($uid, $fname, $mname, $lname);
    }

    /**
     * Find the teacher's matching class schedule for the current time.
     */
    private function findMatchingSchedule(Teacher $teacher): ?Class_Schedule
    {
        $now = now();
        $dayName = $now->format('l');
        $timeNow = $now->format('H:i:s');
        $earlyMinutes = (int) config('attendance.teacher_tap_early_minutes', 10);
        $timeEarly = $now->copy()->addMinutes($earlyMinutes)->format('H:i:s');

        $activeSyId = DB::table('school_year')
            ->where('is_active', true)
            ->value('sy_id');

        return Class_Schedule::query()
            ->where('tch_id', $teacher->tch_id)
            ->when($activeSyId, function ($query) use ($activeSyId): void {
                $query->where(function ($sub) use ($activeSyId): void {
                    $sub->where('sy_id', $activeSyId)->orWhereNull('sy_id');
                });
            })
            ->where('day_of_week', $dayName)
            ->where('start_time', '<=', $timeEarly)
            ->where('end_time', '>=', $timeNow)
            ->with(['section:sect_id,sect_name', 'subject:subj_id,subj_name'])
            ->orderBy('start_time')
            ->first();
    }

    /**
     * Determine whether a teacher tap should end the currently active session.
     *
     * @param  array<string, mixed>|null  $existingSession
     */
    private function shouldEndSession(?array $existingSession, Teacher $teacher, ?Class_Schedule $matchingSchedule): bool
    {
        if (
            $existingSession === null
            || (int) ($existingSession['tch_id'] ?? 0) !== (int) $teacher->tch_id
            || empty($existingSession['schedule_id'])
        ) {
            return false;
        }

        $cooldown = (int) config('attendance.tap_cooldown_seconds', 30);
        $elapsed = isset($existingSession['started_at'])
            ? abs(now()->timestamp - (int) $existingSession['started_at'])
            : $cooldown;

        if ($elapsed < $cooldown) {
            return false;
        }

        return $matchingSchedule === null
            || (int) $matchingSchedule->schedule_id === (int) $existingSession['schedule_id'];
    }

    /**
     * Close the active session on the device and finalize attendance:
     * any student who did not tap in or did not tap out (time_out is null)
     * is marked absent and their guardian is notified via SMS.
     *
     * @param  array<string, mixed>  $session
     * @return array{absences_found: int, notified_count: int}
     */
    private function closeAndFinalizeSession(string $deviceKey, array $session): array
    {
        RfidSessionCache::close($deviceKey);

        if (empty($session['subj_id']) || empty($session['sect_id'])) {
            return [
                'absences_found' => 0,
                'notified_count' => 0,
            ];
        }

        return $this->absenceNotifier->finalizeScheduleSession(
            subjId: (int) $session['subj_id'],
            sectId: (int) $session['sect_id'],
            scheduleId: isset($session['schedule_id']) ? (int) $session['schedule_id'] : null,
            date: isset($session['date']) && is_string($session['date']) ? $session['date'] : now()->toDateString(),
            subjectName: isset($session['subj_name']) && is_string($session['subj_name']) ? $session['subj_name'] : null,
            sectionName: isset($session['sect_name']) && is_string($session['sect_name']) ? $session['sect_name'] : null,
        );
    }

    /**
     * Open a teaching session for the given device key.
     *
     * Matches the teacher's class schedule for the current day/time (with a
     * small early-tap tolerance) and stores the class start/end times so the
     * attendance service can enforce the tap-in / tap-out windows.
     *
     * If no schedule matches, the session has null sect/subj/start/end and
     * students will be blocked ("no class now").
     *
     * @return array{
     *     tch_id: int,
     *     tch_name: string,
     *     sect_id: int|null,
     *     sect_name: string|null,
     *     subj_id: int|null,
     *     subj_name: string|null,
     *     schedule_id: int|null,
     *     start_time: string|null,
     *     end_time: string|null,
     *     date: string,
     *     started_at: int,
     *     auto_transferred: int,
     * }
     */
    private function openSession(string $deviceKey, Teacher $teacher, ?Class_Schedule $schedule = null): array
    {
        $now = now();
        $schedule ??= $this->findMatchingSchedule($teacher);

        $tchName = trim(collect([
            $teacher->tch_fname,
            $teacher->tch_mname,
            $teacher->tch_lname,
        ])->filter()->join(' '));

        $session = [
            'tch_id' => $teacher->tch_id,
            'tch_name' => $tchName,
            'sect_id' => $schedule?->sect_id,
            'sect_name' => $schedule?->section?->sect_name,
            'subj_id' => $schedule?->subj_id,
            'subj_name' => $schedule?->subject?->subj_name,
            'schedule_id' => $schedule?->schedule_id,
            'start_time' => $schedule ? Carbon::parse($schedule->start_time)->format('H:i:s') : null,
            'end_time' => $schedule ? Carbon::parse($schedule->end_time)->format('H:i:s') : null,
            'date' => $now->toDateString(),
            'started_at' => $now->timestamp,
            'auto_transferred' => 0,
        ];

        // Replaces any previous session on this device (e.g. previous period).
        RfidSessionCache::open($deviceKey, $session);

        return $session;
    }

    private function uidAlreadyUsed(string $uid): bool
    {
        return RfidUid::isTaken($uid);
    }

    private function registerTeacher(string $uid, string $fname, ?string $mname, string $lname): JsonResponse
    {
        $emailBase = Str::slug($fname.'.'.$lname, '.');
        $email = $emailBase.'@rfid.local';
        $suffix = 1;

        while (Teacher::query()->where('tch_email', $email)->exists()) {
            $email = $emailBase.$suffix.'@rfid.local';
            $suffix++;
        }

        RfidRegistryCache::forget();

        $teacher = Teacher::create([
            'tch_rfid_uid' => $uid,
            'tch_fname' => $fname,
            'tch_mname' => $mname,
            'tch_lname' => $lname,
            'tch_email' => $email,
            'tch_pw' => bcrypt('changeme123'),
            'status' => 'active',
            'is_deleted' => false,
        ]);

        return response()->json([
            'success' => true,
            'type' => 'teacher',
            'message' => 'Teacher registered.',
            'data' => $teacher->only([
                'tch_id',
                'tch_fname',
                'tch_mname',
                'tch_lname',
            ]),
        ]);
    }

    private function registerStudent(string $uid, string $fname, ?string $mname, string $lname): JsonResponse
    {
        RfidRegistryCache::forget();

        $student = Student::create([
            'rfid_uid' => $uid,
            'lrn' => 'TEMP-'.strtoupper(Str::random(8)),
            'stu_fname' => $fname,
            'stu_mname' => $mname,
            'stu_lname' => $lname,
            'status' => 'active',
            'is_deleted' => false,
        ]);

        return response()->json([
            'success' => true,
            'type' => 'student',
            'message' => 'Student registered.',
            'data' => $student->only([
                'stu_id',
                'lrn',
                'stu_fname',
                'stu_mname',
                'stu_lname',
                'status',
            ]),
        ]);
    }

    /**
     * @return array{0: string, 1: ?string, 2: string}
     */
    private function splitName(string $name): array
    {
        $parts = preg_split('/\s+/', trim($name)) ?: [];
        $fname = $parts[0] ?? 'Unknown';
        $lname = count($parts) > 1 ? (string) array_pop($parts) : 'User';
        $mname = count($parts) > 1 ? implode(' ', array_slice($parts, 1)) : null;

        return [$fname, $mname, $lname];
    }
}
