<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTeacherPasswordChanged
{
    public function handle(Request $request, Closure $next): Response
    {
        $teacher = $request->user('teacher');

        if ($teacher && $teacher->must_change_password) {
            if (! $request->routeIs('teacher.password.change', 'teacher.password.update', 'logout')) {
                return redirect()->route('teacher.password.change');
            }
        }

        return $next($request);
    }
}
