<?php

namespace App\Http\Controllers\Admin;

use App\Contracts\SmsSender;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Room;
use App\Models\Section;
use App\Models\Subject;
use App\Models\Teacher;
use App\Rules\UniqueRfidUid;
use App\Services\ClassScheduleService;
use App\Support\RfidRegistryCache;
use App\Support\RfidUid;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Response;

class AdminTeacherController extends Controller
{
    public function __construct(
        private ClassScheduleService $classScheduleService,
        private SmsSender $sms
    ) {}

    public function index(Request $request): Response
    {
        $archived = $request->boolean('archived');

        $teachers = Teacher::select(
            'tch_id',
            'add_id',
            'tch_rfid_uid',
            'master_card',
            'tch_fname',
            'tch_mname',
            'tch_lname',
            'tch_email',
            'contact_number',
            'is_deleted',
            'avatar',
        )
            ->when($archived, fn ($q) => $q->where('is_deleted', true), fn ($q) => $q->where('is_deleted', false))
            ->orderBy('tch_id', 'desc')
            ->paginate(8);

        $sections = Section::where('is_deleted', false)
            ->orderBy('gr_level')
            ->orderBy('sect_name')
            ->get(['sect_id', 'sect_name', 'gr_level']);

        $rooms = Room::with('building:building_id,building_name')
            ->where('is_deleted', false)
            ->orderBy('room_no')
            ->get(['room_id', 'room_no', 'building_id']);

        $subjects = Subject::where('is_deleted', false)
            ->orderBy('subj_name')
            ->get(['subj_id', 'subj_code', 'subj_name']);

        return inertia('Admin/Teacher/index', [
            'teachers' => $teachers,
            'archived' => $archived,
            'sections' => $sections,
            'rooms' => $rooms,
            'subjects' => $subjects,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'tch_rfid_uid' => ['nullable', 'string', 'max:100', 'different:master_card', new UniqueRfidUid],
            'master_card' => ['nullable', 'string', 'max:100', 'different:tch_rfid_uid', new UniqueRfidUid],
            'tch_fname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_mname' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_lname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_email' => 'required|email|max:150|regex:/^\S+$/|unique:teacher,tch_email',
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            'add_id' => 'nullable|integer|exists:address,add_id',
        ], [
            'tch_fname.regex' => 'First name must contain only letters and cannot start with a space.',
            'tch_mname.regex' => 'Middle name must contain only letters and cannot start with a space.',
            'tch_lname.regex' => 'Last name must contain only letters and cannot start with a space.',
            'tch_email.regex' => 'Email cannot contain spaces.',
            'contact_number.regex' => 'Contact number must contain only numbers.',
        ]);

        $validated['tch_fname'] = $this->formatName($validated['tch_fname']);
        $validated['tch_mname'] = $this->formatName($validated['tch_mname'] ?? null);
        $validated['tch_lname'] = $this->formatName($validated['tch_lname']);

        $tempPw = Str::random(10);
        $validated['tch_pw'] = $tempPw;
        $validated['is_deleted'] = false;
        $validated['must_change_password'] = true;
        $this->normalizeRfidFields($validated);

        $teacher = Teacher::create($validated);
        RfidRegistryCache::forget();

        try {
            if ($teacher->contact_number) {
                $this->sms->send(
                    $teacher->contact_number,
                    "Welcome to IoClass! Your teacher account has been created. Temporary password: {$tempPw}. Please log in and change your password."
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to send teacher credentials SMS: '.$e->getMessage());
        }

        return redirect()->route('admin.teacher.index')
            ->with('success', "Teacher successfully added. Temporary password sent via SMS. (Temp Password: {$tempPw})");
    }

    public function update(Request $request, int $teacher): RedirectResponse
    {
        $teacherModel = Teacher::findOrFail($teacher);

        $validated = $request->validate([
            'tch_rfid_uid' => ['nullable', 'string', 'max:100', 'different:master_card', new UniqueRfidUid(ignoreTeacherId: $teacherModel->tch_id)],
            'master_card' => ['nullable', 'string', 'max:100', 'different:tch_rfid_uid', new UniqueRfidUid(ignoreTeacherId: $teacherModel->tch_id)],
            'tch_fname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_mname' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_lname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_email' => 'required|email|max:150|regex:/^\S+$/|unique:teacher,tch_email,'.$teacherModel->tch_id.',tch_id',
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            'add_id' => 'nullable|integer|exists:address,add_id',
            'tch_pw' => 'nullable|string|min:8|max:255|confirmed',
        ], [
            'tch_fname.regex' => 'First name must contain only letters and cannot start with a space.',
            'tch_mname.regex' => 'Middle name must contain only letters and cannot start with a space.',
            'tch_lname.regex' => 'Last name must contain only letters and cannot start with a space.',
            'tch_email.regex' => 'Email cannot contain spaces.',
            'contact_number.regex' => 'Contact number must contain only numbers.',
        ]);

        $validated['tch_fname'] = $this->formatName($validated['tch_fname']);
        $validated['tch_mname'] = $this->formatName($validated['tch_mname'] ?? null);
        $validated['tch_lname'] = $this->formatName($validated['tch_lname']);

        if (empty($validated['tch_pw'])) {
            unset($validated['tch_pw']);
        }

        $this->normalizeRfidFields($validated);

        $teacherModel->update($validated);
        $teacherModel->refresh();
        RfidRegistryCache::forget();

        return redirect()->route('admin.teacher.index')
            ->with('success', 'Teacher updated successfully.');
    }

    public function destroy(Teacher $teacher): RedirectResponse
    {
        $teacher->update(['is_deleted' => true]);

        return redirect()->back()
            ->with('success', 'Teacher archived successfully.');
    }

    public function restore(int $id): RedirectResponse
    {
        $teacher = Teacher::findOrFail($id);
        $teacher->update(['is_deleted' => false]);

        return redirect()->back()
            ->with('success', 'Teacher restored successfully.');
    }

    public function forceDelete(int $id): RedirectResponse
    {
        $teacher = Teacher::findOrFail($id);
        $teacher->delete();

        return redirect()->back()
            ->with('success', 'Teacher permanently deleted.');
    }

    /**
     * Create a teacher and their address together in one atomic transaction.
     * Called from the two-step wizard after both steps are complete.
     */
    public function storeWithAddress(Request $request): RedirectResponse
    {
        $validated = $request->validate(array_merge([
            // Teacher fields
            'tch_rfid_uid' => ['nullable', 'string', 'max:100', 'different:master_card', new UniqueRfidUid],
            'master_card' => ['nullable', 'string', 'max:100', 'different:tch_rfid_uid', new UniqueRfidUid],
            'tch_fname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_mname' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_lname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'tch_email' => 'required|email|max:150|regex:/^\S+$/|unique:teacher,tch_email',
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            // Permanent address
            'perm_region' => 'nullable|string|max:100',
            'perm_province' => 'nullable|string|max:100',
            'perm_municipality' => 'nullable|string|max:100',
            'perm_barangay' => 'nullable|string|max:100',
            // Same-address flag
            'same_as_permanent' => 'boolean',
            // Current address (only when different)
            'curr_region' => 'nullable|string|max:100',
            'curr_province' => 'nullable|string|max:100',
            'curr_municipality' => 'nullable|string|max:100',
            'curr_barangay' => 'nullable|string|max:100',
        ], ClassScheduleService::slotValidationRules(), ClassScheduleService::adviserValidationRules()), [
            'tch_fname.regex' => 'First name must contain only letters and cannot start with a space.',
            'tch_mname.regex' => 'Middle name must contain only letters and cannot start with a space.',
            'tch_lname.regex' => 'Last name must contain only letters and cannot start with a space.',
            'tch_email.regex' => 'Email cannot contain spaces.',
            'contact_number.required' => 'Contact number is required for temporary password SMS delivery.',
            'contact_number.regex' => 'Contact number must contain only numbers.',
        ]);

        $validated['tch_fname'] = $this->formatName($validated['tch_fname']);
        $validated['tch_mname'] = $this->formatName($validated['tch_mname'] ?? null);
        $validated['tch_lname'] = $this->formatName($validated['tch_lname']);

        $scheduleSlots = $validated['schedules'] ?? [];
        $hasSchedule = $scheduleSlots !== [];
        $this->normalizeRfidFields($validated);

        $tempPw = Str::random(10);

        DB::transaction(function () use ($validated, $hasSchedule, $scheduleSlots, $tempPw) {
            $address = Address::create([
                'region' => $validated['perm_region'] ?? null,
                'province' => $validated['perm_province'] ?? null,
                'municipality' => $validated['perm_municipality'] ?? null,
                'barangay' => $validated['perm_barangay'] ?? null,
                'add_type' => 'permanent',
            ]);

            if (! ($validated['same_as_permanent'] ?? true)) {
                Address::create([
                    'region' => $validated['curr_region'] ?? null,
                    'province' => $validated['curr_province'] ?? null,
                    'municipality' => $validated['curr_municipality'] ?? null,
                    'barangay' => $validated['curr_barangay'] ?? null,
                    'add_type' => 'current',
                ]);
            }

            $teacher = Teacher::create([
                'tch_rfid_uid' => $validated['tch_rfid_uid'] ?? null,
                'master_card' => $validated['master_card'] ?? null,
                'tch_fname' => $validated['tch_fname'],
                'tch_mname' => $validated['tch_mname'] ?? null,
                'tch_lname' => $validated['tch_lname'],
                'tch_email' => $validated['tch_email'],
                'contact_number' => $validated['contact_number'] ?? null,
                'tch_pw' => $tempPw,
                'add_id' => $address->add_id,
                'is_deleted' => false,
                'must_change_password' => true,
            ]);

            if ($hasSchedule) {
                $this->classScheduleService->createFromSlots($teacher->tch_id, $scheduleSlots);
            }

            if ($validated['is_adviser'] ?? false) {
                $this->classScheduleService->createAdviser(
                    $teacher->tch_id,
                    $validated['adviser_sect_id'],
                );
            }

            RfidRegistryCache::forget();
        });

        try {
            if (! empty($validated['contact_number'])) {
                $this->sms->send(
                    $validated['contact_number'],
                    "Welcome to IoClass! Your teacher account has been created. Temporary password: {$tempPw}. Please log in and change your password."
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to send teacher credentials SMS: '.$e->getMessage());
        }

        return redirect()->route('admin.teacher.index')
            ->with('success', "Teacher successfully added. Temporary password sent via SMS. (Temp Password: {$tempPw})");
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function normalizeRfidFields(array &$validated): void
    {
        foreach (['tch_rfid_uid', 'master_card'] as $field) {
            if (! array_key_exists($field, $validated)) {
                continue;
            }

            $validated[$field] = RfidUid::normalize(
                is_string($validated[$field]) ? $validated[$field] : null,
            );
        }
    }

    private function formatName(?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        $clean = preg_replace('/[^a-zA-Z\s\-\.\']/', '', ltrim($name));

        return Str::title(trim((string) $clean));
    }
}
