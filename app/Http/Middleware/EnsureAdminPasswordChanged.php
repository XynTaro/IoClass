<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware that forces newly-created admin accounts to change their
 * temporary password before they can access any other dashboard page.
 *
 * Allowed routes while the password is still temporary:
 *  - admin.profile.show          (profile page where the form lives)
 *  - admin.profile.password.update (POST to actually change it)
 *  - admin.logout / logout        (so the admin can still sign out)
 */
class EnsureAdminPasswordChanged
{
    /**
     * Handle an incoming request.
     *
     * If the authenticated admin still has a temporary password, redirect
     * them to the profile page unless they are already on an allowed route.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $admin = $request->user('admin');

        // Only enforce the redirect when the admin flag is set.
        if ($admin && $admin->must_change_password) {
            // Allow the profile page, password update, and logout routes through.
            if (! $request->routeIs('admin.profile.show', 'admin.profile.password.update', 'admin.logout', 'logout')) {
                return redirect()->route('admin.profile.show')
                    ->with('warning', 'You must change your temporary password before continuing.');
            }
        }

        return $next($request);
    }
}
