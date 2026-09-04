<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Models\AuditTrail;
use App\Models\Teacher;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Authenticate using email and password. Tries the admin guard first, then the teacher guard.
     */
    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $credentials = $request->only('email', 'password');

        if (Auth::guard('admin')->attempt($credentials)) {
            $request->session()->regenerate();

            /** @var Admin $admin */
            $admin = Auth::guard('admin')->user();
            AuditTrail::record($admin, 'login', 'Logged in');

            return redirect()->route('admin.dashboard');
        }

        if ($this->teacherCredentialsAreQueryable() && Auth::guard('teacher')->attempt($this->teacherCredentials($credentials))) {
            $request->session()->regenerate();

            /** @var Teacher $teacher */
            $teacher = Auth::guard('teacher')->user();
            AuditTrail::record($teacher, 'login', 'Logged in');

            return redirect()->route('teacher.dashboard');
        }

        throw ValidationException::withMessages([
            'email' => __('Invalid email address or password. Please verify your credentials and try again.'),
        ]);
    }

    /**
     * Map login form fields to teacher table columns.
     *
     * @param  array{email: string, password: string}  $credentials
     * @return array{tch_email: string, password: string}
     */
    private function teacherCredentials(array $credentials): array
    {
        return [
            'tch_email' => $credentials['email'],
            'password' => $credentials['password'],
        ];
    }

    /**
     * Avoid querying teachers before the schema supports email/password login.
     */
    private function teacherCredentialsAreQueryable(): bool
    {
        $table = (new Teacher)->getTable();

        if (! Schema::hasTable($table)) {
            return false;
        }

        if (Schema::hasColumn($table, 'tch_email')
            && (Schema::hasColumn($table, 'tch_pw') || Schema::hasColumn($table, 'password'))) {
            return true;
        }

        return Schema::hasColumn($table, 'email')
            && (Schema::hasColumn($table, 'password') || Schema::hasColumn($table, 'pw'));
    }

    /**
     * Log the user out of every application guard that uses this session,
     * invalidate the session, and instruct the browser to purge its local
     * cache so the back-button cannot restore any authenticated page.
     */
    public function logout(Request $request): RedirectResponse
    {
        if (Auth::guard('teacher')->check()) {
            /** @var Teacher $teacher */
            $teacher = Auth::guard('teacher')->user();
            AuditTrail::record($teacher, 'logout', 'Logged out');

            Auth::guard('teacher')->logout();
        }

        if (Auth::guard('admin')->check()) {
            /** @var Admin $admin */
            $admin = Auth::guard('admin')->user();
            AuditTrail::record($admin, 'logout', 'Logged out');

            Auth::guard('admin')->logout();
        }

        if (Auth::guard('web')->check()) {
            Auth::guard('web')->logout();
        }

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login')
            ->header('Clear-Site-Data', '"cache", "cookies", "storage"')
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache');
    }
}
