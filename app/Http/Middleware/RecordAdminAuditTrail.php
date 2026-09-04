<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\AuditTrail;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Automatically records every successful admin mutation (POST/PUT/PATCH/DELETE)
 * in the audit trail, deriving a readable description from the route name.
 */
class RecordAdminAuditTrail
{
    private const VERB_LABELS = [
        'store' => 'Created',
        'storeWithAddress' => 'Created',
        'update' => 'Updated',
        'destroy' => 'Archived',
        'restore' => 'Restored',
        'forceDelete' => 'Permanently deleted',
        'promote' => 'Promoted',
        'attach' => 'Attached',
        'detach' => 'Detached',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->shouldRecord($request, $response)) {
            $admin = $request->user('admin');

            if ($admin instanceof Admin) {
                [$action, $description] = $this->describe($request);

                AuditTrail::record($admin, $action, $description, $this->routeParameters($request));
            }
        }

        return $response;
    }

    private function shouldRecord(Request $request, Response $response): bool
    {
        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return false;
        }

        if ($response->getStatusCode() >= 400) {
            return false;
        }

        return ! $this->failedValidation($request, $response);
    }

    /**
     * A redirect that flashed validation errors during this request means
     * the mutation did not happen, so it must not be recorded.
     */
    private function failedValidation(Request $request, Response $response): bool
    {
        if (! $response instanceof RedirectResponse) {
            return false;
        }

        /** @var list<string> $newFlash */
        $newFlash = $request->session()->get('_flash.new', []);

        return in_array('errors', $newFlash, true);
    }

    /**
     * Derive the action key and description from the route name,
     * e.g. "admin.teacher.forceDelete" becomes "Permanently deleted teacher".
     *
     * @return array{0: string, 1: string}
     */
    private function describe(Request $request): array
    {
        $routeName = (string) $request->route()?->getName();
        $action = Str::after($routeName, 'admin.');

        if ($action === '') {
            return [$request->method().' '.$request->path(), 'Performed an admin action'];
        }

        $segments = explode('.', $action);
        $verb = array_pop($segments);
        $resource = str_replace('-', ' ', implode(' ', $segments));

        $verbLabel = self::VERB_LABELS[$verb] ?? Str::headline($verb);

        return [$action, trim($verbLabel.' '.($resource !== '' ? $resource : 'record'))];
    }

    /**
     * @return array<string, mixed>
     */
    private function routeParameters(Request $request): array
    {
        return collect($request->route()?->parameters() ?? [])
            ->map(fn ($value) => $value instanceof Model ? $value->getKey() : $value)
            ->all();
    }
}
