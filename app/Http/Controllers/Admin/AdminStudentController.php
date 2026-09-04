<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Father;
use App\Models\Guardian;
use App\Models\Mother;
use App\Models\ParentGuardian;
use App\Models\Section;
use App\Models\Student;
use App\Rules\UniqueRfidUid;
use App\Services\StudentRfidRegistrationNotifier;
use App\Support\RfidRegistryCache;
use App\Support\RfidUid;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AdminStudentController extends Controller
{
    public function __construct(private StudentRfidRegistrationNotifier $rfidRegistrationNotifier) {}

    /**
     * Display a listing of the students.
     */
    public function index(Request $request)
    {
        if ($request->query('format') === 'json' || $request->boolean('uids_only')) {
            return response()->json(
                Student::query()
                    ->whereNotNull('rfid_uid')
                    ->where('rfid_uid', '!=', '')
                    ->where('is_deleted', false)
                    ->pluck('rfid_uid')
                    ->map(fn ($uid) => strtoupper(trim((string) $uid)))
                    ->values()
            );
        }

        $archived = $request->boolean('archived');

        $activeSchoolYear = DB::table('school_year')
            ->where('is_active', true)
            ->first(['sy_id', 'sy_label']);

        $activeSyId = $activeSchoolYear?->sy_id;

        $query = DB::table('student as s')
            ->leftJoin('student_section as ss', function ($join) use ($activeSyId) {
                $join->on('ss.stu_id', '=', 's.stu_id');
                if ($activeSyId) {
                    $join->where('ss.sy_id', $activeSyId);
                }
            })
            ->leftJoin('section as sec', 'sec.sect_id', '=', 'ss.sect_id')
            ->select(
                's.stu_id',
                's.lrn',
                's.stu_fname',
                's.stu_mname',
                's.stu_lname',
                's.gender',
                's.photo',
                's.rfid_uid',
                's.status',
                's.is_deleted',
                'sec.gr_level',
                'sec.sect_name as sect',
            )
            ->where('s.is_deleted', $archived ? 1 : 0)
            ->groupBy(
                's.stu_id', 's.lrn', 's.stu_fname', 's.stu_mname', 's.stu_lname',
                's.gender', 's.photo',
                's.rfid_uid', 's.status', 's.is_deleted', 'sec.gr_level', 'sec.sect_name'
            )
            ->orderBy('s.stu_lname')
            ->orderBy('s.stu_fname');

        $sections = Section::where('is_deleted', false)
            ->orderBy('gr_level')
            ->orderBy('sect_name')
            ->get(['sect_id', 'sect_name', 'gr_level']);

        $promotedSectionIds = $activeSyId
            ? DB::table('student_section as source')
                ->join('student_section as dest', function ($join) use ($activeSyId) {
                    $join->on('source.stu_id', '=', 'dest.stu_id')
                        ->where('dest.sy_id', $activeSyId)
                        ->whereColumn('source.sect_id', '!=', 'dest.sect_id');
                })
                ->select('source.sect_id')
                ->distinct()
                ->pluck('sect_id')
                ->toArray()
            : [];

        return inertia('Admin/Student/index', [
            'students' => $query->paginate(8),
            'archived' => $archived,
            'sections' => $sections,
            'activeSchoolYear' => $activeSchoolYear,
            'promotedSectionIds' => $promotedSectionIds,
        ]);
    }

    /**
     * Store a newly created student.
     *
     * Validation and mass-assignment are based on the raw column names
     * defined in the students migration.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'lrn' => ['nullable', 'string', 'max:20', 'regex:/^\d+$/', 'unique:student,lrn'],
            'stu_fname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'stu_mname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'stu_lname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'gender' => ['nullable', 'string', 'in:male,female,Male,Female'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'rfid_uid' => ['required', 'string', 'max:50', new UniqueRfidUid],
            'status' => 'nullable|string|max:50',
            'sect_id' => 'required|integer|exists:section,sect_id',
            // Address (optional)
            'region' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'municipality' => 'nullable|string|max:100',
            'barangay' => 'nullable|string|max:100',
            // Father
            'father_name' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'father_mname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'father_lname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'father_email' => 'nullable|email|max:255|regex:/^\S+$/',
            'father_contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            // Mother
            'mother_name' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'mother_mname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'mother_lname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'mother_email' => 'nullable|email|max:255|regex:/^\S+$/',
            'mother_contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            // Guardian
            'guardian_name' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'guardian_mname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'guardian_lname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'guardian_email' => 'nullable|email|max:255|regex:/^\S+$/',
            'guardian_contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
        ], [
            'stu_fname.regex' => 'Student first name must contain only letters and cannot start with a space.',
            'stu_mname.regex' => 'Student middle name must contain only letters and cannot start with a space.',
            'stu_lname.regex' => 'Student last name must contain only letters and cannot start with a space.',
            'father_name.regex' => 'Father first name must contain only letters and cannot start with a space.',
            'father_mname.regex' => 'Father middle name must contain only letters and cannot start with a space.',
            'father_lname.regex' => 'Father last name must contain only letters and cannot start with a space.',
            'father_email.regex' => 'Father email cannot contain spaces.',
            'father_contact_number.regex' => 'Father contact number must contain only numbers.',
            'mother_name.regex' => 'Mother first name must contain only letters and cannot start with a space.',
            'mother_mname.regex' => 'Mother middle name must contain only letters and cannot start with a space.',
            'mother_lname.regex' => 'Mother last name must contain only letters and cannot start with a space.',
            'mother_email.regex' => 'Mother email cannot contain spaces.',
            'mother_contact_number.regex' => 'Mother contact number must contain only numbers.',
            'guardian_name.regex' => 'Guardian first name must contain only letters and cannot start with a space.',
            'guardian_mname.regex' => 'Guardian middle name must contain only letters and cannot start with a space.',
            'guardian_lname.regex' => 'Guardian last name must contain only letters and cannot start with a space.',
            'guardian_email.regex' => 'Guardian email cannot contain spaces.',
            'guardian_contact_number.regex' => 'Guardian contact number must contain only numbers.',
        ]);

        $validated['stu_fname'] = $this->formatName($validated['stu_fname']);
        $validated['stu_mname'] = $this->formatName($validated['stu_mname'] ?? null);
        $validated['stu_lname'] = $this->formatName($validated['stu_lname']);

        if (! empty($validated['gender'])) {
            $validated['gender'] = strtolower((string) $validated['gender']);
        }

        if ($request->hasFile('photo')) {
            $validated['photo'] = $request->file('photo')->store('students', 'public');
        }

        $validated['rfid_uid'] = RfidUid::normalize($validated['rfid_uid'] ?? null);

        if (array_key_exists('lrn', $validated) && $validated['lrn'] !== null) {
            $validated['lrn'] = trim((string) $validated['lrn']);
        }

        $studentFields = array_intersect_key($validated, array_flip([
            'lrn', 'stu_fname', 'stu_mname', 'stu_lname', 'gender', 'photo', 'rfid_uid', 'status',
        ]));
        $studentFields['is_deleted'] = false;

        $student = Student::create($studentFields);
        RfidRegistryCache::forget();

        // Assign to section under the active school year
        $activeSyId = DB::table('school_year')->where('is_active', true)->value('sy_id');

        DB::table('student_section')->insert([
            'stu_id' => $student->stu_id,
            'sect_id' => $validated['sect_id'],
            'sy_id' => $activeSyId,
        ]);

        // Create address record if any address field was provided
        $hasAddress = ! empty($validated['region'])
            || ! empty($validated['province'])
            || ! empty($validated['municipality'])
            || ! empty($validated['barangay']);

        if ($hasAddress) {
            $addId = DB::table('address')->insertGetId([
                'region' => $validated['region'] ?? null,
                'province' => $validated['province'] ?? null,
                'municipality' => $validated['municipality'] ?? null,
                'barangay' => $validated['barangay'] ?? null,
                'add_type' => 'current',
            ], 'add_id');
            $student->update(['add_id' => $addId]);
        }

        // Create parent / guardian records
        $fatherId = null;
        $motherId = null;
        $guardianId = null;

        if (! empty($validated['father_name'])) {
            $father = Father::create([
                'father_name' => $this->formatName($validated['father_name']),
                'father_mname' => $this->formatName($validated['father_mname'] ?? null),
                'father_lname' => $this->formatName($validated['father_lname'] ?? null),
                'email' => $validated['father_email'] ?? null,
                'contact_number' => $validated['father_contact_number'] ?? null,
                'is_deleted' => false,
            ]);
            $fatherId = $father->f_id;
        }

        if (! empty($validated['mother_name'])) {
            $mother = Mother::create([
                'mother_name' => $this->formatName($validated['mother_name']),
                'mother_mname' => $this->formatName($validated['mother_mname'] ?? null),
                'mother_lname' => $this->formatName($validated['mother_lname'] ?? null),
                'email' => $validated['mother_email'] ?? null,
                'contact_number' => $validated['mother_contact_number'] ?? null,
                'is_deleted' => false,
            ]);
            $motherId = $mother->mother_id;
        }

        if (! empty($validated['guardian_name'])) {
            $guardian = Guardian::create([
                'name' => $this->formatName($validated['guardian_name']),
                'guardian_mname' => $this->formatName($validated['guardian_mname'] ?? null),
                'guardian_lname' => $this->formatName($validated['guardian_lname'] ?? null),
                'email' => $validated['guardian_email'] ?? null,
                'contact_number' => $validated['guardian_contact_number'] ?? null,
                'is_deleted' => false,
            ]);
            $guardianId = $guardian->guardian_id;
        }

        if ($fatherId || $motherId || $guardianId) {
            ParentGuardian::create([
                'stu_par_id' => $student->stu_id,
                'f_id' => $fatherId,
                'mother_id' => $motherId,
                'guardian_id' => $guardianId,
            ]);
        }

        $this->rfidRegistrationNotifier->notify($student);

        return redirect()->route('admin.student.index')
            ->with('success', 'Student successfully added.');
    }

    /**
     * Promote all active students from one section into another section
     * under the currently active school year.
     */
    public function promote(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'from_sect_id' => 'required|integer|exists:section,sect_id',
            'to_sect_id' => 'required|integer|exists:section,sect_id|different:from_sect_id',
        ]);

        $activeSyId = DB::table('school_year')->where('is_active', true)->value('sy_id');

        $alreadyPromoted = (bool) $activeSyId && DB::table('student_section as source')
            ->join('student_section as dest', function ($join) use ($activeSyId) {
                $join->on('source.stu_id', '=', 'dest.stu_id')
                    ->where('dest.sy_id', $activeSyId)
                    ->whereColumn('source.sect_id', '!=', 'dest.sect_id');
            })
            ->where('source.sect_id', $validated['from_sect_id'])
            ->exists();

        if ($alreadyPromoted) {
            return back()->withErrors([
                'from_sect_id' => 'This section has already been promoted for the current school year.',
            ]);
        }

        $studentIds = DB::table('student_section')
            ->where('sect_id', $validated['from_sect_id'])
            ->pluck('stu_id')
            ->unique();

        $activeStudentIds = Student::whereIn('stu_id', $studentIds)
            ->where('is_deleted', false)
            ->pluck('stu_id');

        $promoted = 0;

        foreach ($activeStudentIds as $stuId) {
            $alreadyEnrolled = DB::table('student_section')
                ->where('stu_id', $stuId)
                ->where('sect_id', $validated['to_sect_id'])
                ->where('sy_id', $activeSyId)
                ->exists();

            if (! $alreadyEnrolled) {
                DB::table('student_section')->insert([
                    'stu_id' => $stuId,
                    'sect_id' => $validated['to_sect_id'],
                    'sy_id' => $activeSyId,
                ]);
                $promoted++;
            }
        }

        return redirect()->route('admin.student.index')
            ->with('success', "{$promoted} student(s) promoted successfully.");
    }

    /**
     * Show the form for editing a student.
     */
    public function edit(string $id)
    {
        $student = Student::findOrFail($id);

        return inertia('Admin/Student/Edit', ['student' => $student]);
    }

    /**
     * Update the specified student.
     *
     * Uses stu_id as the PK and rfid_uid as the unique RFID column.
     */
    public function update(Request $request, string $id)
    {
        $student = Student::findOrFail($id);

        $validated = $request->validate([
            'lrn' => ['nullable', 'string', 'max:20', 'regex:/^\d+$/', 'unique:student,lrn,'.$student->stu_id.',stu_id'],
            'stu_fname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'stu_mname' => ['nullable', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'stu_lname' => ['required', 'string', 'max:255', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'gender' => ['nullable', 'string', 'in:male,female,Male,Female'],
            'photo' => ['nullable', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
            'rfid_uid' => ['required', 'string', 'max:50', new UniqueRfidUid(ignoreStudentId: $student->stu_id)],
            'status' => 'nullable|string|max:50',
        ], [
            'stu_fname.regex' => 'Student first name must contain only letters and cannot start with a space.',
            'stu_mname.regex' => 'Student middle name must contain only letters and cannot start with a space.',
            'stu_lname.regex' => 'Student last name must contain only letters and cannot start with a space.',
        ]);

        $validated['stu_fname'] = $this->formatName($validated['stu_fname']);
        $validated['stu_mname'] = $this->formatName($validated['stu_mname'] ?? null);
        $validated['stu_lname'] = $this->formatName($validated['stu_lname']);

        if (array_key_exists('gender', $validated)) {
            $validated['gender'] = $validated['gender'] ? strtolower((string) $validated['gender']) : null;
        }

        if ($request->hasFile('photo')) {
            if ($student->photo) {
                Storage::disk('public')->delete($student->photo);
            }
            $validated['photo'] = $request->file('photo')->store('students', 'public');
        } elseif ($request->boolean('remove_photo')) {
            if ($student->photo) {
                Storage::disk('public')->delete($student->photo);
            }
            $validated['photo'] = null;
        }

        $validated['rfid_uid'] = RfidUid::normalize($validated['rfid_uid'] ?? null);

        if (array_key_exists('lrn', $validated) && $validated['lrn'] !== null) {
            $validated['lrn'] = trim((string) $validated['lrn']);
        }

        $previousRfid = RfidUid::normalize($student->rfid_uid);

        $student->update($validated);
        RfidRegistryCache::forget();

        if ($previousRfid !== $validated['rfid_uid']) {
            $this->rfidRegistrationNotifier->notify($student->fresh());
        }

        return redirect()->route('admin.student.index')
            ->with('success', 'Student updated successfully.');
    }

    /**
     * Soft delete (archive) the specified student.
     */
    public function destroy(Request $request, Student $student)
    {
        $student->update(['is_deleted' => true, 'status' => 'inactive']);

        return redirect()->route('admin.student.index')
            ->with('success', 'Student archived successfully.');
    }

    /**
     * Restore an archived student.
     */
    public function restore(Request $request, int $id)
    {
        $student = Student::findOrFail($id);
        $student->update(['is_deleted' => false, 'status' => 'active']);

        return redirect()->back()
            ->with('success', 'Student restored successfully.');
    }

    /**
     * Permanently delete a soft-deleted student.
     */
    public function forceDelete(Request $request, int $id): RedirectResponse
    {
        $student = Student::findOrFail($id);

        DB::transaction(function () use ($student): void {
            $this->purgeStudentRelations($student);
            $student->delete();
        });

        RfidRegistryCache::forget();

        return redirect()->back()
            ->with('success', 'Student permanently deleted.');
    }

    private function formatName(?string $name): ?string
    {
        if ($name === null || trim($name) === '') {
            return null;
        }

        $clean = preg_replace('/[^a-zA-Z\s\-\.\']/', '', ltrim($name));

        return Str::title(trim((string) $clean));
    }

    private function purgeStudentRelations(Student $student): void
    {
        $stuId = $student->stu_id;

        if ($student->photo) {
            Storage::disk('public')->delete($student->photo);
        }

        if (Schema::hasTable('attendance')) {
            DB::table('attendance')->where('stu_id', $stuId)->delete();
        }

        if (Schema::hasTable('student_subject')) {
            DB::table('student_subject')->where('stu_id', $stuId)->delete();
        }

        if (Schema::hasTable('student_section')) {
            DB::table('student_section')->where('stu_id', $stuId)->delete();
        }

        if (Schema::hasTable((new ParentGuardian)->getTable())) {
            $parents = ParentGuardian::query()->where('stu_par_id', $stuId)->get();

            $fatherIds = $parents->pluck('f_id')->filter()->unique();
            $motherIds = $parents->pluck('mother_id')->filter()->unique();
            $guardianIds = $parents->pluck('guardian_id')->filter()->unique();
            $addressIds = $parents->pluck('add_id')->filter()->unique();

            ParentGuardian::query()->where('stu_par_id', $stuId)->delete();

            foreach ($fatherIds as $fatherId) {
                Father::query()->where('f_id', $fatherId)->delete();
            }

            foreach ($motherIds as $motherId) {
                Mother::query()->where('mother_id', $motherId)->delete();
            }

            foreach ($guardianIds as $guardianId) {
                Guardian::query()->where('guardian_id', $guardianId)->delete();
            }

            if (Schema::hasTable('address')) {
                foreach ($addressIds as $addressId) {
                    DB::table('address')->where('add_id', $addressId)->delete();
                }
            }
        }

        if ($student->add_id) {
            $studentAddressId = $student->add_id;
            $student->update(['add_id' => null]);

            if (Schema::hasTable('address')) {
                DB::table('address')->where('add_id', $studentAddressId)->delete();
            }
        }
    }
}
