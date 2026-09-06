<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Symfony\Component\HttpFoundation\Response;

class HandleInertiaRequests extends Middleware
{
    /**
     * Prevent browsers from caching authenticated pages so that pressing the
     * browser back-button after logout always triggers a fresh server request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = parent::handle($request, $next);

        $isAuthenticated = auth()->guard('admin')->check() || auth()->guard('teacher')->check();

        if ($isAuthenticated) {
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
            $response->headers->set('Pragma', 'no-cache');
        }

        return $response;
    }

    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),

            'name' => config('app.name'),

            // Eager array (not a Closure): nested Closures under `auth` are treated as
            // lazy Inertia props and may not include `role` on the client — sidebar
            // then defaulted to admin for teachers.
            'auth' => [
                'user' => $this->resolveSharedAuthUser(),
            ],

            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',

            // Eager values (not Closures): lazy flash props may not reach the client reliably.
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    protected function resolveSharedAuthUser(): ?array
    {
        if (auth()->guard('admin')->check()) {
            $user = auth()->guard('admin')->user();

            return [
                'id' => $user->getAuthIdentifier(),
                'name' => $user->name ?? trim(($user->fname ?? '').' '.($user->lname ?? '')),
                'email' => $user->email ?? null,
                'role' => 'admin',
                'fname' => $user->fname ?? null,
                'lname' => $user->lname ?? null,
                'avatar' => $user->avatar ? '/storage/'.$user->avatar : null,
            ];
        }

        if (auth()->guard('teacher')->check()) {
            $user = auth()->guard('teacher')->user();

            return [
                'id' => $user->getAuthIdentifier(),
                'name' => trim(collect([
                    $user->tch_fname,
                    $user->tch_mname,
                    $user->tch_lname,
                ])->filter()->join(' ')),
                'email' => $user->tch_email ?? null,
                'role' => 'teacher',
                'fname' => $user->tch_fname ?? null,
                'lname' => $user->tch_lname ?? null,
                'must_change_password' => (bool) ($user->must_change_password ?? false),
                'avatar' => $user->avatar ? '/storage/'.$user->avatar : null,
            ];
        }

        return null;
    }
}
