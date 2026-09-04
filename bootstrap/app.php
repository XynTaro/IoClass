<?php

use App\Http\Middleware\EnsureAdminPasswordChanged;
use App\Http\Middleware\EnsureTeacherPasswordChanged;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\RecordAdminAuditTrail;
use App\Http\Middleware\VerifyRfidDeviceToken;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->alias([
            'rfid.device' => VerifyRfidDeviceToken::class,
            'teacher.password.changed' => EnsureTeacherPasswordChanged::class,
            'admin.password.changed' => EnsureAdminPasswordChanged::class,
            'audit.admin' => RecordAdminAuditTrail::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // When an unauthenticated user tries to access a protected page (e.g. browser
        // back-button after logout), render the Inertia Error page with status 401
        // instead of silently redirecting to /login.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if ($request->header('X-Inertia')) {
                // Inertia XHR: let Inertia's built-in session-expiry handling work
                // (it will force a full-page reload to /login automatically).
                return null;
            }

            if (! $request->expectsJson()) {
                return null;
            }

            return Inertia::render('Error', ['status' => 401])
                ->toResponse($request)
                ->setStatusCode(401);
        });

        // Render the Inertia Error page for common HTTP error codes.
        $exceptions->respond(function (Response $response, Throwable $exception, Request $request) {
            $status = $response->getStatusCode();

            if (in_array($status, [403, 404, 500, 503]) && ! $request->header('X-Inertia')) {
                return Inertia::render('Error', ['status' => $status])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return $response;
        });
    })->create();
