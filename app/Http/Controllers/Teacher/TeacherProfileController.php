<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class TeacherProfileController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var Teacher $teacher */
        $teacher = Auth::guard('teacher')->user();

        return Inertia::render('Teacher/Profile/Index', [
            'teacher' => [
                'fname' => $teacher->tch_fname,
                'mname' => $teacher->tch_mname,
                'lname' => $teacher->tch_lname,
                'email' => $teacher->tch_email,
                'contact_number' => $teacher->contact_number,
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        /** @var Teacher $teacher */
        $teacher = Auth::guard('teacher')->user();

        $validated = $request->validate([
            'fname' => 'required|string|max:100',
            'mname' => 'nullable|string|max:100',
            'lname' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:teacher,tch_email,'.$teacher->tch_id.',tch_id',
            'contact_number' => 'nullable|string|max:20',
        ]);

        $teacher->update([
            'tch_fname' => $validated['fname'],
            'tch_mname' => $validated['mname'],
            'tch_lname' => $validated['lname'],
            'tch_email' => $validated['email'],
            'contact_number' => $validated['contact_number'],
        ]);

        AuditTrail::record($teacher, 'profile.update', 'Updated own profile information');

        return back()->with('success', 'Your personal information has been saved successfully.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        /** @var Teacher $teacher */
        $teacher = Auth::guard('teacher')->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        if (! Hash::check($validated['current_password'], $teacher->getAuthPassword())) {
            return back()->withErrors(['current_password' => 'The current password is incorrect.']);
        }

        $teacher->update(['tch_pw' => $validated['password']]);

        AuditTrail::record($teacher, 'password.change', 'Changed own account password');

        return back()->with('success', 'Your security password has been updated successfully.');
    }

    public function updateAvatar(Request $request): RedirectResponse
    {
        /** @var Teacher $teacher */
        $teacher = Auth::guard('teacher')->user();

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($teacher->avatar) {
                Storage::disk('public')->delete($teacher->avatar);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $teacher->update(['avatar' => $path]);
        }

        AuditTrail::record($teacher, 'avatar.update', 'Updated own profile picture');

        return back()->with('success', 'Your profile picture has been updated successfully.');
    }
}
