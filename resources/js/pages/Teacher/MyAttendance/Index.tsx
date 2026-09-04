/**
 * Teacher My Attendance Page
 *
 * Displays a filterable, paginated view of personal attendance records for the teacher.
 * Follows the exact layout and design system of Admin Teacher Attendance.
 */

import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Filter,
    LayoutGrid,
    List,
    RefreshCw,
    Search,
    ShieldCheck,
    Users,
    UserX,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import TeacherLayout from '@/layouts/teacher/teacher-layout';
import { cn } from '@/lib/utils';

// ── Type Definitions ──────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

interface TeacherAttendanceRow {
    id: number;
    tch_id: number;
    att_date: string;
    att_date_formatted: string;
    time_in: string | null;
    time_in_formatted: string | null;
    status: AttendanceStatus;
    remarks: string | null;
}

type PageProps = {
    attendance: {
        data: TeacherAttendanceRow[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    summary: {
        total: number;
        present: number;
        late: number;
        excused: number;
        absent: number;
    };
    filters: {
        q?: string | null;
        date?: string | null;
        attendance?: string | null;
    };
};

// ── Summary Card Configuration ────────────────────────────────────────

const summaryCards = [
    {
        label: 'Total Records',
        key: 'all',
        summaryKey: 'total' as const,
        icon: Users,
        color: 'text-zinc-900 dark:text-zinc-100',
        bg: 'bg-zinc-100 dark:bg-zinc-800',
        accent: 'border-zinc-300 dark:border-zinc-700',
        glow: 'from-zinc-500/10 to-transparent',
    },
    {
        label: 'Present',
        key: 'present',
        summaryKey: 'present' as const,
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        accent: 'border-emerald-500/30',
        glow: 'from-emerald-500/10 to-transparent',
    },
    {
        label: 'Late',
        key: 'late',
        summaryKey: 'late' as const,
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        accent: 'border-amber-500/30',
        glow: 'from-amber-500/10 to-transparent',
    },
    {
        label: 'Excused',
        key: 'excused',
        summaryKey: 'excused' as const,
        icon: ShieldCheck,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        accent: 'border-blue-500/30',
        glow: 'from-blue-500/10 to-transparent',
    },
    {
        label: 'Absent',
        key: 'absent',
        summaryKey: 'absent' as const,
        icon: UserX,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        accent: 'border-rose-500/30',
        glow: 'from-rose-500/10 to-transparent',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────

function statusBadge(status: AttendanceStatus) {
    const config = {
        present: {
            label: 'Present',
            style: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/20 border-emerald-200/50 dark:border-emerald-800/50',
            dot: 'bg-emerald-500',
        },
        late: {
            label: 'Late',
            style: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/20 border-amber-200/50 dark:border-amber-800/50',
            dot: 'bg-amber-500',
        },
        excused: {
            label: 'Excused',
            style: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 ring-blue-500/20 border-blue-200/50 dark:border-blue-800/50',
            dot: 'bg-blue-500',
        },
        absent: {
            label: 'Absent',
            style: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/20 border-rose-200/50 dark:border-rose-800/50',
            dot: 'bg-rose-500',
        },
    };

    const safeStatus = status ?? 'absent';
    const item = config[safeStatus] ?? config.absent;

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 border transition-all',
                item.style,
            )}
        >
            <span className={cn('size-1.5 rounded-full', item.dot)} />
            {item.label}
        </span>
    );
}

// ── Main Page Component ──────────────────────────────────────────────

export default function MyAttendanceIndex() {
    const { attendance, summary, filters } = usePage<PageProps>().props;

    const [search, setSearch] = useState(filters?.q ?? '');
    const [selectedDate, setSelectedDate] = useState(filters?.date ?? '');
    const [attendanceFilter, setAttendanceFilter] = useState<string>(
        filters?.attendance ?? 'all',
    );
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const isFilterActive = search !== '' || selectedDate !== '' || attendanceFilter !== 'all';

    const attendanceRate = useMemo(() => {
        if (!summary.total) return 0;
        return Math.round(((summary.present + summary.late) / summary.total) * 100);
    }, [summary]);

    const todayStr = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === todayStr || selectedDate === '';

    const formattedDisplayDate = useMemo(() => {
        if (!selectedDate) return 'All Dates';
        try {
            const d = new Date(`${selectedDate}T00:00:00`);
            return d.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch {
            return selectedDate;
        }
    }, [selectedDate]);

    function clearFilters() {
        setSearch('');
        setSelectedDate('');
        setAttendanceFilter('all');
        applyFilters({ q: '', date: '', attendance: 'all' });
    }

    useEffect(() => {
        setSearch(filters?.q ?? '');
        setSelectedDate(filters?.date ?? '');
        setAttendanceFilter(filters?.attendance ?? 'all');
    }, [filters?.q, filters?.date, filters?.attendance]);

    function applyFilters(next?: Partial<{ q: string; date: string; attendance: string }>) {
        const q = (next?.q ?? search).trim();
        const nextDate = next?.date ?? selectedDate;
        const nextAttendance = next?.attendance ?? attendanceFilter;

        const query: Record<string, string> = {};

        if (q !== '') query.q = q;
        if (nextDate !== '') query.date = nextDate;
        if (nextAttendance !== 'all') query.attendance = nextAttendance;

        router.get(route('teacher.my-attendance.index'), query, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        applyFilters({ date: newDate });
    };

    const handlePrevDay = () => {
        const base = selectedDate || todayStr;
        const d = new Date(`${base}T00:00:00`);
        d.setDate(d.getDate() - 1);
        const prev = d.toISOString().split('T')[0];
        handleDateChange(prev);
    };

    const handleNextDay = () => {
        const base = selectedDate || todayStr;
        const d = new Date(`${base}T00:00:00`);
        d.setDate(d.getDate() + 1);
        const next = d.toISOString().split('T')[0];
        handleDateChange(next);
    };

    const handleStatusFilterChange = (status: string) => {
        setAttendanceFilter(status);
        applyFilters({ attendance: status });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ q: search });
    };

    // Debounced search
    useEffect(() => {
        const normalized = search.trim();
        const current = (filters?.q ?? '').trim();

        if (normalized === current) return;

        const timeout = window.setTimeout(() => {
            applyFilters({ q: search });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [search, filters?.q]);

    const columns: ColumnDef<TeacherAttendanceRow>[] = [
        {
            accessorKey: 'att_date',
            header: 'Date',
            cell: ({ row }) => (
                <div className="flex items-center gap-2.5 py-1">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        <CalendarIcon className="size-4" />
                    </div>
                    <span className="font-semibold text-sm text-foreground tracking-tight">
                        {row.original.att_date_formatted || row.original.att_date}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => statusBadge(row.original.status),
        },
        {
            accessorKey: 'time_in',
            header: 'Time In',
            cell: ({ row }) => {
                const time = row.original.time_in_formatted;
                return (
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        {time ? (
                            <>
                                <div className="rounded-md bg-zinc-100 p-1 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                    <Clock className="size-3.5" />
                                </div>
                                <span className="text-foreground tracking-tight tabular-nums">{time}</span>
                            </>
                        ) : (
                            <span className="text-muted-foreground/50 font-normal">—</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'remarks',
            header: 'Remarks / Notes',
            cell: ({ row }) => {
                const remarks = row.original.remarks;
                return remarks ? (
                    <span
                        className="text-xs text-zinc-600 dark:text-zinc-400 truncate bg-muted/60 px-2 py-1 rounded-md border border-border/40 inline-block max-w-[220px]"
                        title={remarks}
                    >
                        {remarks}
                    </span>
                ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                );
            },
        },
    ];

    const list = attendance?.data ?? [];

    return (
        <TeacherLayout>
            <Head title="My Attendance" />

            <div className="space-y-5 p-4 md:p-6 lg:p-8">
                {/* Page Header — matches My Schedule style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                My Attendance
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                View your daily check-in records, leave history, and attendance summary.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                            <CalendarIcon className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                            <span className="font-medium text-foreground">
                                {summary.total} records total
                            </span>
                            <span className="text-border">|</span>
                            <span className={cn(
                                'font-semibold',
                                attendanceRate >= 90
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : attendanceRate >= 80
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-red-600 dark:text-red-400',
                            )}>
                                {attendanceRate}% rate
                            </span>
                        </div>
                    </div>
                </div>

                {/* Date Navigation Toolbar */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevDay}
                            className="size-9 rounded-lg"
                            title="Previous Day"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>

                        <div className="relative flex items-center">
                            <CalendarIcon className="pointer-events-none absolute left-3 size-4 text-blue-600 dark:text-blue-400" />
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="h-9 w-[160px] rounded-lg border-muted bg-background pl-9 text-xs font-semibold focus-visible:ring-blue-500"
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextDay}
                            className="size-9 rounded-lg"
                            title="Next Day"
                        >
                            <ChevronRight className="size-4" />
                        </Button>

                        <Button
                            variant={isToday ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleDateChange('')}
                            className={cn(
                                'h-9 rounded-lg px-3 text-xs font-semibold transition-all',
                                isToday && 'bg-blue-600 text-white shadow-sm hover:bg-blue-700',
                            )}
                        >
                            All Dates
                        </Button>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Showing records for{' '}
                        <span className="font-semibold text-foreground">{formattedDisplayDate}</span>
                    </p>
                </div>

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        const isSelected =
                            attendanceFilter === card.key ||
                            (card.key === 'all' && (!attendanceFilter || attendanceFilter === 'all'));
                        const subtextMap: Record<string, string> = {
                            all: `${attendanceRate}% Present`,
                            present: summary.total ? `${Math.round((summary.present / summary.total) * 100)}% of total` : '0%',
                            late: 'After cutoff time',
                            excused: 'Official leaves',
                            absent: 'No check-in',
                        };

                        return (
                            <Card
                                key={card.key}
                                onClick={() => handleStatusFilterChange(card.key)}
                                className={cn(
                                    'group relative cursor-pointer overflow-hidden rounded-2xl border py-0 gap-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                                    isSelected
                                        ? 'ring-2 ring-blue-500 border-blue-500/60 bg-gradient-to-b from-card to-blue-50/20 shadow-md shadow-blue-500/10 dark:to-blue-950/20'
                                        : 'bg-card hover:border-zinc-300 dark:hover:border-zinc-700',
                                )}
                            >
                                <div
                                    className={cn(
                                        'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100',
                                        card.glow,
                                    )}
                                />
                                <CardContent className="relative p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                                {card.label}
                                            </p>
                                            <p className={cn('text-3xl font-extrabold tracking-tight', card.color)}>
                                                {summary[card.summaryKey]}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                'flex size-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110',
                                                card.bg,
                                            )}
                                        >
                                            <Icon className={cn('size-5', card.color)} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                                        <span>{subtextMap[card.key]}</span>
                                        {isSelected && (
                                            <span className="font-bold text-blue-600 dark:text-blue-400">
                                                Active Filter
                                            </span>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Filters, Search & View Controls */}
                <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
                        <div className="relative max-w-md flex-1">
                            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by date or remarks..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-10 rounded-xl border-muted bg-background pl-9 pr-8 text-sm focus-visible:ring-blue-500"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearch('');
                                        applyFilters({ q: '' });
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" variant="secondary" className="h-10 rounded-xl px-4 text-xs font-semibold">
                            Search
                        </Button>
                    </form>

                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2">
                            <Filter className="size-4 text-muted-foreground" />
                            <Select value={attendanceFilter} onValueChange={handleStatusFilterChange}>
                                <SelectTrigger className="h-10 w-[150px] rounded-xl text-xs font-semibold">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Statuses ({summary.total})</SelectItem>
                                    <SelectItem value="present">Present ({summary.present})</SelectItem>
                                    <SelectItem value="late">Late ({summary.late})</SelectItem>
                                    <SelectItem value="excused">Excused ({summary.excused})</SelectItem>
                                    <SelectItem value="absent">Absent ({summary.absent})</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* View Switcher */}
                        <div className="flex items-center rounded-xl border bg-muted/60 p-1">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-lg text-xs transition-all',
                                    viewMode === 'table'
                                        ? 'bg-background font-semibold text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                                title="Table View"
                            >
                                <List className="size-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-lg text-xs transition-all',
                                    viewMode === 'grid'
                                        ? 'bg-background font-semibold text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                                title="Card Grid View"
                            >
                                <LayoutGrid className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content View */}
                {list.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 p-12 text-center">
                        <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20">
                            <Users className="size-7" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No Attendance Records Found</h3>
                        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            {isFilterActive
                                ? 'No records match your search filters. Try clearing your filters.'
                                : 'No attendance records are available. When you tap your RFID card, check-in records will appear here.'}
                        </p>
                        {isFilterActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-4 gap-1.5 rounded-xl text-xs font-semibold"
                            >
                                <RefreshCw className="size-3.5" />
                                Clear All Filters
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                        <DataTable columns={columns} data={list} />

                        {/* Pagination */}
                        {attendance.links && attendance.links.length > 3 && (
                            <div className="flex items-center justify-between border-t border-border/50 px-5 py-3.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-bold text-foreground">{list.length}</span>{' '}
                                    records
                                </p>
                                <div className="flex items-center space-x-1.5">
                                    {attendance.links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            preserveScroll
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                link.active
                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Grid Cards View */
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {list.map((record) => {
                                const statusStyles: Record<
                                    AttendanceStatus,
                                    { border: string; dot: string; text: string; bg: string }
                                > = {
                                    present: {
                                        border: 'border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-500',
                                        dot: 'bg-emerald-500',
                                        text: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                                        bg: 'bg-card hover:bg-emerald-500/[0.02]',
                                    },
                                    late: {
                                        border: 'border-amber-200 dark:border-amber-800/40 hover:border-amber-500',
                                        dot: 'bg-amber-500',
                                        text: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
                                        bg: 'bg-card hover:bg-amber-500/[0.02]',
                                    },
                                    excused: {
                                        border: 'border-blue-200 dark:border-blue-800/40 hover:border-blue-400',
                                        dot: 'bg-blue-500',
                                        text: 'text-blue-700 dark:text-blue-400 bg-blue-500/10',
                                        bg: 'bg-card hover:bg-blue-500/[0.02]',
                                    },
                                    absent: {
                                        border: 'border-red-200 dark:border-red-800/40 hover:border-red-500',
                                        dot: 'bg-red-500',
                                        text: 'text-red-700 dark:text-red-400 bg-red-500/10',
                                        bg: 'bg-card hover:bg-red-500/[0.02]',
                                    },
                                };

                                const currentStyles = statusStyles[record.status ?? 'absent'];

                                return (
                                    <div
                                        key={record.id}
                                        className={`group relative flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${currentStyles.border} ${currentStyles.bg}`}
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex size-10 items-center justify-center rounded-xl border bg-background shadow-xs">
                                                        <CalendarIcon className="size-5 text-primary" />
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold tracking-tight text-foreground">
                                                            {record.att_date_formatted || record.att_date}
                                                        </h3>
                                                    </div>
                                                </div>
                                                {statusBadge(record.status)}
                                            </div>

                                            <div className="space-y-1.5 rounded-xl bg-muted/40 p-2.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Time In:</span>
                                                    <span className="font-semibold text-foreground tabular-nums">
                                                        {record.time_in_formatted || '—'}
                                                    </span>
                                                </div>
                                                {record.remarks && (
                                                    <div className="truncate border-t border-border/40 pt-1 text-[11px] italic text-muted-foreground">
                                                        &quot;{record.remarks}&quot;
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination for Grid View */}
                        {attendance.links && attendance.links.length > 3 && (
                            <div className="flex items-center justify-between rounded-2xl border bg-card px-5 py-3.5 shadow-sm">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Showing{' '}
                                    <span className="font-bold text-foreground">{list.length}</span>{' '}
                                    records
                                </p>
                                <div className="flex items-center space-x-1.5">
                                    {attendance.links.map((link, index) => (
                                        <Link
                                            key={index}
                                            href={link.url || '#'}
                                            preserveScroll
                                            preserveState
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                                                link.active
                                                    ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
