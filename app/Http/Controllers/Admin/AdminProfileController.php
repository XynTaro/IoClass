<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Services\AvatarService;
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
        $admin->load('address');

        return Inertia::render('Admin/Profile/Index', [
            'admin' => [
                'fname' => $admin->fname,
                'mname' => $admin->mname,
                'lname' => $admin->lname,
                'email' => $admin->email,
                'contact_number' => $admin->contact_number,
                'address' => $admin->address ? [
                    'barangay' => $admin->address->barangay,
                    'municipality' => $admin->address->municipality,
                    'province' => $admin->address->province,
                    'region' => $admin->address->region,
                ] : null,
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
            'email' => 'required|email|max:150|regex:/^\S+$/|unique:admin,email,'.$admin->admin_id.',admin_id',
            'contact_number' => 'nullable|string|max:20',
        ], [
            'fname.required' => 'First name is required.',
            'lname.required' => 'Last name is required.',
            'email.required' => 'Email is required.',
            'email.email' => 'Email must be a valid email address.',
            'email.unique' => 'This email is already taken.',
            'email.regex' => 'Email cannot contain spaces.',
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
        ], [
            'current_password.required' => 'Current password is required.',
            'password.required' => 'New password is required.',
            'password.confirmed' => 'Password confirmation does not match.',
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

    public function updateAvatar(Request $request, AvatarService $avatarService): RedirectResponse
    {
        /** @var Admin $admin */
        $admin = auth()->guard('admin')->user();

        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,png,jpg,webp', 'max:2048'],
        ], [
            'avatar.required' => 'Please select a photo to upload.',
            'avatar.image' => 'The file must be an image.',
            'avatar.mimes' => 'Photo must be a JPEG, PNG, JPG, or WebP file.',
            'avatar.max' => 'Photo must not exceed 2MB.',
        ]);

        if ($request->hasFile('avatar')) {
            $rawAvatar = $admin->getRawOriginal('avatar');
            if ($rawAvatar && ! str_starts_with($rawAvatar, 'data:')) {
                Storage::disk('public')->delete($rawAvatar);
            }

            $dataUri = $avatarService->toDataUri($request->file('avatar'));
            $admin->update(['avatar' => $dataUri]);
        }

        return back()->with('success', 'Your profile picture has been updated successfully.');
    }
}
