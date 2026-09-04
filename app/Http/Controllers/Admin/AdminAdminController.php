<?php

namespace App\Http\Controllers\Admin;

use App\Contracts\SmsSender;
use App\Http\Controllers\Controller;
use App\Models\Address;
use App\Models\Admin;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AdminAdminController extends Controller
{
    public function __construct(private readonly SmsSender $sms) {}

    public function index(Request $request)
    {
        $archived = $request->boolean('archived');

        $admins = Admin::select('admin_id', 'fname', 'mname', 'lname', 'email', 'contact_number', 'add_id', 'is_deleted', 'avatar')
            ->when($archived, fn ($q) => $q->where('is_deleted', true), fn ($q) => $q->where('is_deleted', false))
            ->orderBy('admin_id', 'desc')
            ->paginate(8);

        return inertia('Admin/Admin/index', [
            'admins' => $admins,
            'archived' => $archived,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'fname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'mname' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'lname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'email' => 'required|email|max:150|regex:/^\S+$/|unique:admin,email',
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            'add_id' => 'nullable|integer|exists:address,add_id',
        ], [
            'fname.regex' => 'First name must contain only letters and cannot start with a space.',
            'mname.regex' => 'Middle name must contain only letters and cannot start with a space.',
            'lname.regex' => 'Last name must contain only letters and cannot start with a space.',
            'email.regex' => 'Email cannot contain spaces.',
            'contact_number.regex' => 'Contact number must contain only numbers.',
        ]);

        $validated['fname'] = $this->formatName($validated['fname']);
        $validated['mname'] = $this->formatName($validated['mname'] ?? null);
        $validated['lname'] = $this->formatName($validated['lname']);

        $tempPw = Str::random(10);
        $validated['pw'] = $tempPw;
        $validated['is_deleted'] = false;
        $validated['must_change_password'] = true;

        $newAdmin = Admin::create($validated);

        try {
            if ($newAdmin->contact_number) {
                $this->sms->send(
                    $newAdmin->contact_number,
                    "Welcome to IoClass! Your admin account has been created. Temporary password: {$tempPw}. Please log in and change your password."
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to send admin credentials SMS: '.$e->getMessage());
        }

        return redirect()->route('admin.admin.index')
            ->with('success', "Admin successfully added. Temporary password sent via SMS. (Temp Password: {$tempPw})");
    }

    public function update(Request $request, int $admin)
    {
        $adminModel = Admin::findOrFail($admin);

        $validated = $request->validate([
            'fname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'mname' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'lname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'email' => 'required|email|max:150|regex:/^\S+$/|unique:admin,email,'.$adminModel->admin_id.',admin_id',
            'contact_number' => ['nullable', 'string', 'max:20', 'regex:/^\+?\d+$/'],
            'add_id' => 'nullable|integer|exists:address,add_id',
            'pw' => 'nullable|string|min:8|max:255|confirmed',
        ], [
            'fname.regex' => 'First name must contain only letters and cannot start with a space.',
            'mname.regex' => 'Middle name must contain only letters and cannot start with a space.',
            'lname.regex' => 'Last name must contain only letters and cannot start with a space.',
            'email.regex' => 'Email cannot contain spaces.',
            'contact_number.regex' => 'Contact number must contain only numbers.',
        ]);

        $validated['fname'] = $this->formatName($validated['fname']);
        $validated['mname'] = $this->formatName($validated['mname'] ?? null);
        $validated['lname'] = $this->formatName($validated['lname']);

        if (empty($validated['pw'])) {
            unset($validated['pw']);
        }

        $adminModel->update($validated);
        $adminModel->refresh();

        $adminName = trim("{$adminModel->fname} {$adminModel->lname}");

        return redirect()->route('admin.admin.index')
            ->with('success', 'Admin updated successfully.');
    }

    public function destroy(Request $request, Admin $admin)
    {
        if (auth()->guard('admin')->id() === $admin->admin_id) {
            return back()->with('error', 'You cannot archive your own account.');
        }

        $admin->update(['is_deleted' => true]);

        $adminName = trim("{$admin->fname} {$admin->lname}");

        return redirect()->back()->with('success', 'Admin archived successfully.');
    }

    public function restore(Request $request, int $id)
    {
        $admin = Admin::findOrFail($id);
        $admin->update(['is_deleted' => false]);

        $adminName = trim("{$admin->fname} {$admin->lname}");

        return redirect()->back()->with('success', 'Admin restored successfully.');
    }

    /**
     * Create an admin and their address together in one atomic transaction.
     * Called from the two-step wizard after both steps are complete.
     */
    public function storeWithAddress(Request $request)
    {
        $validated = $request->validate([
            // Admin fields
            'fname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'mname' => ['nullable', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'lname' => ['required', 'string', 'max:100', 'regex:/^[a-zA-Z\-\.\']([a-zA-Z\s\-\.\']*)?$/'],
            'email' => 'required|email|max:150|regex:/^\S+$/|unique:admin,email',
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
        ], [
            'fname.regex' => 'First name must contain only letters and cannot start with a space.',
            'mname.regex' => 'Middle name must contain only letters and cannot start with a space.',
            'lname.regex' => 'Last name must contain only letters and cannot start with a space.',
            'email.regex' => 'Email cannot contain spaces.',
            'contact_number.required' => 'Contact number is required for temporary password SMS delivery.',
            'contact_number.regex' => 'Contact number must contain only numbers.',
        ]);

        $validated['fname'] = $this->formatName($validated['fname']);
        $validated['mname'] = $this->formatName($validated['mname'] ?? null);
        $validated['lname'] = $this->formatName($validated['lname']);

        $tempPw = Str::random(10);

        DB::transaction(function () use ($validated, $tempPw) {
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

            Admin::create([
                'fname' => $validated['fname'],
                'mname' => $validated['mname'] ?? null,
                'lname' => $validated['lname'],
                'email' => $validated['email'],
                'contact_number' => $validated['contact_number'] ?? null,
                'pw' => $tempPw,
                'add_id' => $address->add_id,
                'is_deleted' => false,
                'must_change_password' => true,
            ]);
        });

        try {
            if (! empty($validated['contact_number'])) {
                $this->sms->send(
                    $validated['contact_number'],
                    "Welcome to IoClass! Your admin account has been created. Temporary password: {$tempPw}. Please log in and change your password."
                );
            }
        } catch (\Throwable $e) {
            Log::warning('Failed to send admin credentials SMS: '.$e->getMessage());
        }

        return redirect()->route('admin.admin.index')
            ->with('success', "Admin successfully added. Temporary password sent via SMS. (Temp Password: {$tempPw})");
    }

    public function forceDelete(Request $request, int $id)
    {
        $admin = Admin::findOrFail($id);
        if (auth()->guard('admin')->id() === $admin->admin_id) {
            return back()->with('error', 'You cannot delete your own account.');
        }

        $admin->delete();

        return redirect()->back()->with('success', 'Admin permanently deleted.');
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
