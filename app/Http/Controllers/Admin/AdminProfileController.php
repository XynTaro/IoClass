<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class AdminProfileController extends Controller
{
    public function show(Request $request): Response
    {
        /** @var Admin $admin */
        $admin = auth()->guard('admin')->user();

        return Inertia::render('Admin/Profile/Index', [
            'admin' => [
                'fname' => $admin->fname,
                'mname' => $admin->mname,
                'lname' => $admin->lname,
                'email' => $admin->email,
                'contact_number' => $admin->contact_number,
            ],
            'status' => $request->session()->get('status'),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth()->guard('admin')->user();

        $validated = $request->validate([
            'fname' => 'required|string|max:100',
            'mname' => 'nullable|string|max:100',
            'lname' => 'required|string|max:100',
            'email' => 'required|email|max:150|unique:admin,email,'.$admin->admin_id.',admin_id',
            'contact_number' => 'nullable|string|max:20',
        ]);

        $admin->update($validated);

        return back()->with('success', 'Your personal information has been saved successfully.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth()->guard('admin')->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'confirmed', Password::defaults()],
        ]);

        if (! Hash::check($validated['current_password'], $admin->getAuthPassword())) {
            return back()->withErrors(['current_password' => 'The current password is incorrect.']);
        }

        $admin->update([
            'pw' => $validated['password'],
            'must_change_password' => false,
        ]);

        return back()->with('success', 'Your security password has been updated successfully.');
    }

    public function updateAvatar(Request $request): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth()->guard('admin')->user();

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($admin->avatar) {
                Storage::disk('public')->delete($admin->avatar);
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $admin->update(['avatar' => $path]);
        }

        return back()->with('success', 'Your profile picture has been updated successfully.');
    }
}
