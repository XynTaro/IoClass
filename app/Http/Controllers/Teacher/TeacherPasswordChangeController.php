<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\AuditTrail;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password;
use Inertia\Response;

class TeacherPasswordChangeController extends Controller
{
    public function show(): Response
    {
        return inertia('Teacher/ChangePassword');
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        /** @var Teacher $teacher */
        $teacher = Auth::guard('teacher')->user();

        $teacher->update([
            'tch_pw' => $request->password,
            'must_change_password' => false,
        ]);

        AuditTrail::record(
            $teacher,
            'password.change',
            'Completed the required first-login password change',
        );

        return redirect()->route('teacher.dashboard')
            ->with('success', 'Password changed successfully. Welcome!');
    }
}
