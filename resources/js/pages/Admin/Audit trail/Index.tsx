import { Head, Link, router, usePage } from '@inertiajs/react';
import { History, Search, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin/admin-layout';
import { cn } from '@/lib/utils';

interface AuditLog {
    audit_id: number;
    actor_type: 'teacher' | 'admin';
    actor_id: number | null;
    actor_name: string | null;
    actor_avatar?: string | null;
    action: string;
    description: string | null;
    created_at: string | null;
}

type PaginationLink = { url: string | null; label: string; active: boolean };

type PageProps = {
    logs: {
        data: AuditLog[];
        links: PaginationLink[];
        from: number | null;
        to: number | null;
        total: number;
    };
    actions: string[];
    filters: {
        q?: string | null;
        action?: string | null;
        role?: string | null;
        date?: string | null;
    };
};

const ACTION_LABELS: Record<string, string> = {
    login: 'Login',
    logout: 'Logout',
    'sf2.export': 'SF2 Export',
    'sf2.print': 'SF2 Print',
    'attendance.verify': 'Attendance Verified',
    'profile.update': 'Profile Updated',
    'password.change': 'Password Changed',
};

const ACTION_STYLES: Record<string, string> = {
    login: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-500/20',
    logout: 'bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-900/60 dark:text-slate-300 dark:ring-slate-400/20',
    'sf2.export': 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-500/20',
    'sf2.print': 'bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/50 dark:text-indigo-300 dark:ring-indigo-500/20',
    'attendance.verify': 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-500/20',
    'profile.update': 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-500/20',
    'password.change': 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/50 dark:text-rose-300 dark:ring-rose-500/20',
};

const DEFAULT_ACTION_STYLE =
    'bg-muted/60 text-muted-foreground ring-border/60';

const AVATAR_COLORS = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
];

function avatarColor(name: string) {
    let n = 0;
    for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
    return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

function initials(name: string): string {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

function actionLabel(action: string) {
    if (ACTION_LABELS[action]) {
        return ACTION_LABELS[action];
    }

    return action
        .split(/[._-]/)
        .map((part) => part.replace(/([a-z])([A-Z])/g, '$1 $2'))
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatDate(value: string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-PH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

function formatTime(value: string | null) {
    if (!value) return '';
    return new Date(value).toLocaleTimeString('en-PH', {
        hour: 'numeric',
        minute: '2-digit',
    });
}

export default function Index() {
    const { logs, actions, filters } = usePage<PageProps>().props;

    const [search, setSearch] = useState(filters?.q ?? '');
    const [action, setAction] = useState(filters?.action ?? 'all');
    const [role, setRole] = useState(filters?.role ?? 'all');
    const [date, setDate] = useState(filters?.date ?? '');

    useEffect(() => {
        setSearch(filters?.q ?? '');
        setAction(filters?.action ?? 'all');
        setRole(filters?.role ?? 'all');
        setDate(filters?.date ?? '');
    }, [filters?.q, filters?.action, filters?.role, filters?.date]);

    function applyFilters(
        next?: Partial<{ q: string; action: string; role: string; date: string }>,
    ) {
        const q = (next?.q ?? search).trim();
        const nextAction = next?.action ?? action;
        const nextRole = next?.role ?? role;
        const nextDate = next?.date ?? date;

        const query: Record<string, string> = {};
        if (q !== '') query.q = q;
        if (nextAction !== 'all') query.action = nextAction;
        if (nextRole !== 'all') query.role = nextRole;
        if (nextDate !== '') query.date = nextDate;

        router.get(route('admin.audit-trail.index', query), {}, {
            preserveState: true,
            preserveScroll: true,
        });
    }

    // Debounced live search
    useEffect(() => {
        if (search.trim() === (filters?.q ?? '')) return;

        const timer = setTimeout(() => applyFilters({ q: search }), 400);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const hasActiveFilters = Boolean(
        filters?.q || filters?.action || filters?.role || filters?.date,
    );

    function clearFilters() {
        setSearch('');
        setAction('all');
        setRole('all');
        setDate('');
        applyFilters({ q: '', action: 'all', role: 'all', date: '' });
    }

    const rows = logs?.data ?? [];

    return (
        <AdminLayout>
            <Head title="Audit Trail" />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Audit Trail
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Every teacher and admin action, recorded automatically.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <History className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {logs?.total?.toLocaleString() ?? 0} {logs?.total === 1 ? 'Entry' : 'Entries'}
                            </span>
                        </div>
                    </div>
                </div>

                <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/50 pb-4 pt-5">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        Activity Log
                                    </CardTitle>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        Total of {logs?.total?.toLocaleString() ?? 0} recorded entries
                                    </p>
                                </div>
                            </div>

                            {/* Filter toolbar */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative w-full sm:w-64">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search user or details…"
                                        className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>

                                <Select
                                    value={role}
                                    onValueChange={(value) => {
                                        setRole(value);
                                        applyFilters({ role: value });
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-32 rounded-xl border-border/60 bg-muted/30 text-xs shadow-none focus:ring-1 focus:ring-emerald-500">
                                        <SelectValue placeholder="All roles" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All roles</SelectItem>
                                        <SelectItem value="teacher">Teacher</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select
                                    value={action}
                                    onValueChange={(value) => {
                                        setAction(value);
                                        applyFilters({ action: value });
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-44 rounded-xl border-border/60 bg-muted/30 text-xs shadow-none focus:ring-1 focus:ring-emerald-500">
                                        <SelectValue placeholder="All actions" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All actions</SelectItem>
                                        {(actions ?? []).map((value) => (
                                            <SelectItem key={value} value={value}>
                                                {actionLabel(value)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => {
                                        setDate(e.target.value);
                                        applyFilters({ date: e.target.value });
                                    }}
                                    className="h-9 w-38 rounded-xl border-border/60 bg-muted/30 text-xs shadow-none focus:ring-1 focus:ring-emerald-500"
                                />

                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="h-9 gap-1.5 rounded-xl text-muted-foreground"
                                    >
                                        <X className="size-3.5" />
                                        Clear
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        {rows.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-16 text-center">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/40">
                                    <History className="size-6 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    {hasActiveFilters
                                        ? 'No activity matches your filters'
                                        : 'No activity recorded yet'}
                                </p>
                                <p className="text-xs text-muted-foreground/60">
                                    {hasActiveFilters
                                        ? 'Try adjusting or clearing the filters above.'
                                        : 'Actions will appear here as teachers and admins use the system.'}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-y border-border/50 bg-muted/20">
                                            {['User', 'Action', 'Details', 'Date & Time'].map(
                                                (col) => (
                                                    <th
                                                        key={col}
                                                        className="px-5 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                    >
                                                        {col}
                                                    </th>
                                                ),
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {rows.map((log) => {
                                            const name = log.actor_name ?? 'Unknown';
                                            const isAdmin = log.actor_type === 'admin';

                                            return (
                                                <tr
                                                    key={log.audit_id}
                                                    className="transition-colors hover:bg-muted/30"
                                                >
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="size-9 border border-border/80">
                                                                <AvatarImage
                                                                    src={log.actor_avatar}
                                                                    alt={name}
                                                                />
                                                                <AvatarFallback
                                                                    className={cn(
                                                                        'text-xs',
                                                                        avatarColor(name),
                                                                    )}
                                                                >
                                                                    {initials(name) || '?'}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0">
                                                                <p className="truncate font-medium text-foreground">
                                                                    {name}
                                                                </p>
                                                                <p className="flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
                                                                    {isAdmin ? (
                                                                        <ShieldCheck className="size-3" />
                                                                    ) : (
                                                                        <UserIcon className="size-3" />
                                                                    )}
                                                                    {log.actor_type}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ring-1 ring-inset',
                                                                ACTION_STYLES[log.action] ??
                                                                    DEFAULT_ACTION_STYLE,
                                                            )}
                                                        >
                                                            {actionLabel(log.action)}
                                                        </span>
                                                    </td>
                                                    <td className="max-w-md px-5 py-3">
                                                        <p className="truncate text-muted-foreground">
                                                            {log.description ?? '—'}
                                                        </p>
                                                    </td>
                                                    <td className="px-5 py-3 whitespace-nowrap">
                                                        <p className="font-medium text-foreground tabular-nums">
                                                            {formatDate(log.created_at)}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground tabular-nums">
                                                            {formatTime(log.created_at)}
                                                        </p>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination footer */}
                        {rows.length > 0 && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 px-5 py-3">
                                <p className="text-xs text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-medium text-foreground">
                                        {logs?.from ?? 0}–{logs?.to ?? 0}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-medium text-foreground">
                                        {logs?.total?.toLocaleString() ?? 0}
                                    </span>{' '}
                                    entries
                                </p>

                                <div className="flex items-center gap-1">
                                    {logs?.links?.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || ''}
                                            preserveScroll
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={cn(
                                                'flex h-8 min-w-8 items-center justify-center rounded-lg px-2.5 text-xs font-medium transition-colors',
                                                link.active
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                                !link.url &&
                                                    'pointer-events-none opacity-40',
                                            )}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
