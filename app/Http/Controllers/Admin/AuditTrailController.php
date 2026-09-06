<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Admin;
use App\Models\AuditTrail;
use App\Models\Teacher;
use Illuminate\Http\Request;
use Inertia\Response;

class AuditTrailController extends Controller
{
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('q', ''));
        $action = (string) $request->query('action', '');
        $role = (string) $request->query('role', '');
        $date = (string) $request->query('date', '');

        $logs = AuditTrail::select(
            'audit_id',
            'actor_type',
            'actor_id',
            'actor_name',
            'action',
            'description',
            'created_at',
        )
            ->when($search !== '', function ($query) use ($search) {
                $query->where(function ($builder) use ($search) {
                    $builder->where('actor_name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($action !== '' && $action !== 'all', fn ($query) => $query->where('action', $action))
            ->when(in_array($role, ['teacher', 'admin'], true), fn ($query) => $query->where('actor_type', $role))
            ->when($date !== '', fn ($query) => $query->whereDate('created_at', $date))
            ->orderBy('audit_id', 'desc')
            ->paginate(10)
            ->withQueryString();

        $items = $logs->items();
        $teacherIds = collect($items)->where('actor_type', 'teacher')->pluck('actor_id')->filter()->unique()->toArray();
        $adminIds = collect($items)->where('actor_type', 'admin')->pluck('actor_id')->filter()->unique()->toArray();

        $teacherAvatars = empty($teacherIds) ? [] : Teacher::whereIn('tch_id', $teacherIds)->pluck('avatar', 'tch_id')->toArray();
        $adminAvatars = empty($adminIds) ? [] : Admin::whereIn('admin_id', $adminIds)->pluck('avatar', 'admin_id')->toArray();

        $logs->through(function ($log) use ($teacherAvatars, $adminAvatars) {
            $avatar = null;
            if ($log->actor_id) {
                if ($log->actor_type === 'teacher') {
                    $avatar = $teacherAvatars[$log->actor_id] ?? null;
                } elseif ($log->actor_type === 'admin') {
                    $avatar = $adminAvatars[$log->actor_id] ?? null;
                }
            }
            $log->actor_avatar = $avatar ? '/storage/'.$avatar : null;

            return $log;
        });

        $actions = AuditTrail::select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action');

        return inertia('Admin/Audit trail/Index', [
            'logs' => $logs,
            'actions' => $actions,
            'filters' => [
                'q' => $search !== '' ? $search : null,
                'action' => ($action !== '' && $action !== 'all') ? $action : null,
                'role' => in_array($role, ['teacher', 'admin'], true) ? $role : null,
                'date' => $date !== '' ? $date : null,
            ],
        ]);
    }
}
