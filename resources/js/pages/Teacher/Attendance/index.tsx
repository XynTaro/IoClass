/**
 * Teacher Attendance Index Page
 *
 * Displays a filterable, paginated view of student attendance records.
 * Teachers can search by name/LRN, filter by date, grade level, section,
 * and attendance status. Supports both a DataTable view and a card-grid view.
 *
 * Data is provided server-side via Inertia props (paginated attendance rows,
 * summary counts, available filter options).
 */

import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    CheckCircle2,
    Clock,
    Filter,
    Search,
    ShieldCheck,
    Users,
    UserX,
    LayoutGrid,
    List,
    RefreshCw,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import teacher from '@/routes/teacher';

// ── Type Definitions ──────────────────────────────────────────────────

/** Possible attendance statuses recorded by the RFID system. */
type AttendanceStatus = 'present' | 'late' | 'excused' | 'absent';

/** A single student attendance record returned from the paginated query. */
interface AttendanceRow {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_lname: string;
    gr_level: string;
    sect: string;
    attendance_status: AttendanceStatus;
    time_in: string | null;
}

/** Inertia page props passed from the server-side controller. */
type PageProps = {
    attendance: {
        data: AttendanceRow[];
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
        gradeLevel?: string | null;
        section?: string | null;
        attendance?: string | null;
    };
    gradeLevels: string[];
    sections: string[];
};

// ── Summary Card Configuration ────────────────────────────────────────

const summaryCards = [
    {
        label: 'Total Students',
        key: 'all',
        summaryKey: 'total' as const,
        icon: Users,
        color: 'text-zinc-900 dark:text-zinc-100',
        bg: 'bg-zinc-100 dark:bg-zinc-800',
        accent: 'border-zinc-300 dark:border-zinc-700',
    },
    {
        label: 'Present',
        key: 'present',
        summaryKey: 'present' as const,
        icon: CheckCircle2,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        accent: 'border-emerald-500/30',
    },
    {
        label: 'Late',
        key: 'late',
        summaryKey: 'late' as const,
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-500/15',
        accent: 'border-amber-500/30',
    },
    {
        label: 'Excused',
        key: 'excused',
        summaryKey: 'excused' as const,
        icon: ShieldCheck,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        accent: 'border-blue-500/30',
    },
    {
        label: 'Absent',
        key: 'absent',
        summaryKey: 'absent' as const,
        icon: UserX,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-500/15',
        accent: 'border-rose-500/30',
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
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ring-1 transition-all',
                item.style,
            )}
        >
            <span className={cn('size-1.5 rounded-full', item.dot)} />
            {item.label}
        </span>
    );
}

// ── Main Page Component ──────────────────────────────────────────────

export default function TeacherAttendanceIndex() {
    // Destructure server-side Inertia props.
    const { attendance, summary, filters, gradeLevels, sections } =
        usePage<PageProps>().props;

    // ── Local filter state (mirrors server-side query params) ──────────
    const [search, setSearch] = useState(filters?.q ?? '');
    const [date, setDate] = useState(filters?.date ?? '');
    const [gradeLevel, setGradeLevel] = useState<string>(
        filters?.gradeLevel ?? 'all',
    );
    const [section, setSection] = useState<string>(filters?.section ?? 'all');
    const [attendanceFilter, setAttendanceFilter] = useState<string>(
        filters?.attendance ?? 'all',
    );
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // True when any filter deviates from its default — drives the "Reset" button visibility.
    const isFilterActive =
        search !== '' ||
        date !== '' ||
        gradeLevel !== 'all' ||
        section !== 'all' ||
        attendanceFilter !== 'all';

    /** Reset every filter back to its default and re-fetch from the server. */
    function clearFilters() {
        setSearch('');
        setDate('');
        setGradeLevel('all');
        setSection('all');
        setAttendanceFilter('all');
        applyFilters({
            q: '',
            date: '',
            gradeLevel: 'all',
            section: 'all',
            attendance: 'all',
        });
    }

    // Sync local state when the server-side filter props change (e.g. browser back/forward).
    useEffect(() => {
        setSearch(filters?.q ?? '');
        setDate(filters?.date ?? '');
        setGradeLevel(filters?.gradeLevel ?? 'all');
        setSection(filters?.section ?? 'all');
        setAttendanceFilter(filters?.attendance ?? 'all');
    }, [
        filters?.q,
        filters?.date,
        filters?.gradeLevel,
        filters?.section,
        filters?.attendance,
    ]);

    // ── Table Column Definitions ─────────────────────────────────────────
    const columns: ColumnDef<AttendanceRow>[] = [
        {
            accessorKey: 'lrn',
            header: 'LRN',
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {row.original.lrn ?? '—'}
                </span>
            ),
        },
        {
            id: 'studentName',
            header: 'Student Name',
            cell: ({ row }) => {
                const first = row.original.stu_fname;
                const last = row.original.stu_lname;
                const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase();
                return (
                    <div className="flex items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary dark:bg-primary/20 dark:text-primary-foreground">
                            {initials}
                        </div>
                        <span className="font-medium text-foreground">
                            {first} {last}
                        </span>
                    </div>
                );
            },
        },
        {
            id: 'classGroup',
            header: 'Grade & Section',
            cell: ({ row }) => (
                <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-foreground">{row.original.gr_level}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-medium text-muted-foreground">{row.original.sect}</span>
                </div>
            ),
        },
        {
            accessorKey: 'attendance_status',
            header: 'Status',
            cell: ({ row }) =>
                statusBadge(row.original.attendance_status ?? 'absent'),
        },
        {
            accessorKey: 'time_in',
            header: 'Time In',
            cell: ({ row }) => {
                const status = row.original.attendance_status;
                const time = row.original.time_in;
                return (
                    <div className="flex items-center gap-1.5 text-sm tabular-nums">
                        {time ? (
                            <>
                                <Clock className={`size-3.5 ${status === 'late' ? 'text-amber-500' : 'text-emerald-500'}`} />
                                <span className="font-medium text-foreground">{time}</span>
                            </>
                        ) : (
                            <span className="text-muted-foreground">—</span>
                        )}
                    </div>
                );
            },
        },
    ];

    // Fallback to an empty array when attendance data hasn't loaded yet.
    const list = attendance?.data ?? [];

    // Naturally sorted options for the filter dropdowns (memoised).
    const sectionOptions = useMemo(
        () =>
            (sections ?? [])
                .slice()
                .sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true }),
                ),
        [sections],
    );
    const gradeOptions = useMemo(
        () =>
            (gradeLevels ?? [])
                .slice()
                .sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true }),
                ),
        [gradeLevels],
    );

    /**
     * Build a query-string from current filter state and navigate via Inertia.
     * Accepts an optional partial override so individual onChange handlers
     * can update one filter without losing the others.
     */
    function applyFilters(
        next?: Partial<{
            q: string;
            date: string;
            gradeLevel: string;
            section: string;
            attendance: string;
        }>,
    ) {
        const q = (next?.q ?? search).trim();
        const nextDate = next?.date ?? date;
        const nextGradeLevel = next?.gradeLevel ?? gradeLevel;
        const nextSection = next?.section ?? section;
        const nextAttendance = next?.attendance ?? attendanceFilter;

        const query: Record<string, string> = {};

        if (q !== '') {
            query.q = q;
        }
        if (nextDate !== '') {
            query.date = nextDate;
        }
        if (nextGradeLevel !== 'all') {
            query.gradeLevel = nextGradeLevel;
        }
        if (nextSection !== 'all') {
            query.section = nextSection;
        }
        if (nextAttendance !== 'all') {
            query.attendance = nextAttendance;
        }

        router.get(
            teacher.attendance.index.url({ query }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    }

    // Debounced search — waits 300 ms after the user stops typing before hitting the server.
    useEffect(() => {
        const normalized = search.trim();
        const current = (filters?.q ?? '').trim();

        if (normalized === current) {
            return;
        }

        const timeout = window.setTimeout(() => {
            applyFilters({ q: search });
        }, 300);

        return () => window.clearTimeout(timeout);
    }, [search, filters?.q]);

    // Attendance rate calculation
    const attendanceRate = useMemo(() => {
        if (!summary.total) return 0;
        return Math.round(
            ((summary.present + summary.late) / summary.total) * 100,
        );
    }, [summary]);

    const handleStatusFilterChange = (status: string) => {
        setAttendanceFilter(status);
        applyFilters({ attendance: status });
    };

    return (
        <TeacherLayout>
            <Head title="Attendance" />

            <div className="space-y-5 p-4 md:p-6 lg:p-8">
                {/* Page Header — matches My Schedule & My Attendance style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                Attendance
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Daily check-ins from RFID scans for your sections.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
                            <Users className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                            <span className="font-medium text-foreground">
                                {summary.total} students total
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

                {/* Summary KPI Cards */}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        const isSelected =
                            attendanceFilter === card.key ||
                            (card.key === 'all' &&
                                (!attendanceFilter ||
                                    attendanceFilter === 'all'));
                        const subtextMap: Record<string, string> = {
                            all: `${attendanceRate}% Present`,
                            present: summary.total
                                ? `${Math.round((summary.present / summary.total) * 100)}% of total`
                                : '0%',
                            late: 'After cutoff time',
                            excused: 'Official leaves',
                            absent: 'No check-in',
                        };

                        return (
                            <Card
                                key={card.key}
                                onClick={() =>
                                    handleStatusFilterChange(card.key)
                                }
                                className={cn(
                                    'group relative cursor-pointer gap-0 overflow-hidden rounded-2xl border py-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                                    isSelected
                                        ? 'border-blue-500/60 bg-blue-500/5 shadow-md ring-2 shadow-blue-500/10 ring-blue-500 dark:bg-blue-500/10'
                                        : 'bg-card hover:border-zinc-300 dark:hover:border-zinc-700',
                                )}
                            >
                                <CardContent className="relative p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                                {card.label}
                                            </p>
                                            <p
                                                className={cn(
                                                    'text-3xl font-extrabold tracking-tight',
                                                    card.color,
                                                )}
                                            >
                                                {summary[card.summaryKey]}
                                            </p>
                                        </div>
                                        <div
                                            className={cn(
                                                'flex size-10 items-center justify-center rounded-xl shadow-sm transition-transform group-hover:scale-110',
                                                card.bg,
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    'size-5',
                                                    card.color,
                                                )}
                                            />
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

                {/* Filters Control Center */}
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <Filter
                                className="size-4 text-primary"
                                aria-hidden
                            />
                            Filter Controls
                        </div>
                        <div className="flex items-center gap-2">
                            {isFilterActive && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                                >
                                    <RefreshCw className="size-3" />
                                    Reset Filters
                                </Button>
                            )}

                            {/* View Switcher Toggle */}
                            <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 p-1">
                                <Button
                                    variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2.5 text-xs gap-1"
                                    onClick={() => setViewMode('table')}
                                >
                                    <List className="size-3.5" />
                                    Table
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2.5 text-xs gap-1"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="size-3.5" />
                                    Grid
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                            <label
                                htmlFor="attendance-date"
                                className="mb-1.5 block text-xs font-semibold text-muted-foreground"
                            >
                                Date
                            </label>
                            <Input
                                id="attendance-date"
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    setDate(e.target.value);
                                    applyFilters({ date: e.target.value });
                                }}
                                className="h-9 focus-visible:ring-1"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                Search
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name or LRN..."
                                    className="h-9 pl-9 focus-visible:ring-1"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                Status
                            </label>
                            <Select
                                value={attendanceFilter}
                                onValueChange={(v) => {
                                    setAttendanceFilter(v);
                                    applyFilters({ attendance: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All statuses
                                    </SelectItem>
                                    <SelectItem value="present">
                                        Present
                                    </SelectItem>
                                    <SelectItem value="late">Late</SelectItem>
                                    <SelectItem value="excused">
                                        Excused
                                    </SelectItem>
                                    <SelectItem value="absent">
                                        Absent
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                Grade level
                            </label>
                            <Select
                                value={gradeLevel}
                                onValueChange={(v) => {
                                    setGradeLevel(v);
                                    applyFilters({ gradeLevel: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Grade level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All grades
                                    </SelectItem>
                                    {gradeOptions.map((g) => (
                                        <SelectItem key={g} value={g}>
                                            {g}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                                Section
                            </label>
                            <Select
                                value={section}
                                onValueChange={(v) => {
                                    setSection(v);
                                    applyFilters({ section: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Section" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        All sections
                                    </SelectItem>
                                    {sectionOptions.map((sect) => (
                                        <SelectItem key={sect} value={sect}>
                                            {sect}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Results Section */}
                {list.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-12 text-center bg-card/30">
                        <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-xs animate-pulse">
                            <Users className="size-6" aria-hidden />
                        </div>
                        <div className="space-y-1">
                            <p className="text-base font-semibold">
                                No students found.
                            </p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Try adjusting the date, clearing search keywords, or selecting different sections and grade levels.
                            </p>
                        </div>
                        {isFilterActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-2 text-xs font-medium"
                            >
                                <RefreshCw className="mr-1.5 size-3" />
                                Clear Filter Search
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                        <DataTable columns={columns} data={list} />
                    </div>
                ) : (
                    /* Elegant Card Grid View */
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {list.map((student) => {
                            const initials = `${student.stu_fname[0] ?? ''}${student.stu_lname[0] ?? ''}`.toUpperCase();
                            
                            const statusStyles: Record<AttendanceStatus, { border: string; ring: string; dot: string; text: string; bg: string }> = {
                                present: {
                                    border: 'border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-500',
                                    ring: 'ring-emerald-500/20',
                                    dot: 'bg-emerald-500',
                                    text: 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
                                    bg: 'bg-card hover:bg-emerald-500/[0.02]',
                                },
                                late: {
                                    border: 'border-amber-200 dark:border-amber-800/40 hover:border-amber-500',
                                    ring: 'ring-amber-500/20',
                                    dot: 'bg-amber-500',
                                    text: 'text-amber-700 dark:text-amber-400 bg-amber-500/10',
                                    bg: 'bg-card hover:bg-amber-500/[0.02]',
                                },
                                excused: {
                                    border: 'border-blue-200 dark:border-blue-800/40 hover:border-blue-500',
                                    ring: 'ring-blue-500/20',
                                    dot: 'bg-blue-500',
                                    text: 'text-blue-700 dark:text-blue-400 bg-blue-500/10',
                                    bg: 'bg-card hover:bg-blue-500/[0.02]',
                                },
                                absent: {
                                    border: 'border-rose-200 dark:border-rose-800/40 hover:border-rose-500',
                                    ring: 'ring-rose-500/20',
                                    dot: 'bg-rose-500',
                                    text: 'text-rose-700 dark:text-rose-400 bg-rose-500/10',
                                    bg: 'bg-card hover:bg-rose-500/[0.02]',
                                },
                            };
                            
                            const currentStyles = statusStyles[student.attendance_status ?? 'absent'];
                            
                            return (
                                <div
                                    key={student.stu_id}
                                    className={`flex flex-col items-center justify-between rounded-2xl border p-5 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${currentStyles.border} ${currentStyles.bg}`}
                                >
                                    <div className="flex flex-col items-center w-full">
                                        {/* Avatar with Status Ring */}
                                        <div className={`relative mb-3 flex size-14 items-center justify-center rounded-full bg-background border text-sm font-bold text-primary dark:text-primary-foreground shadow-xs ring-4 ${currentStyles.ring}`}>
                                            {initials}
                                            {/* Status indicator dot */}
                                            <span className={`absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-background ${currentStyles.dot}`} />
                                        </div>

                                        <div className="w-full">
                                            <h3 className="truncate font-semibold text-foreground text-sm leading-snug">
                                                {student.stu_fname} {student.stu_lname}
                                            </h3>
                                            <p className="mt-1 font-mono text-[10px] text-muted-foreground tracking-wider uppercase">
                                                LRN: {student.lrn ?? '—'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 w-full space-y-3">
                                        {/* Grade & Section pill */}
                                        <div className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                            {student.gr_level} — {student.sect}
                                        </div>

                                        {/* Status and Time */}
                                        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border/60">
                                            <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${currentStyles.text}`}>
                                                {student.attendance_status}
                                            </span>
                                            {student.time_in ? (
                                                <span className="flex items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground tabular-nums">
                                                    <Clock className="size-3 text-emerald-500" />
                                                    {student.time_in}
                                                </span>
                                            ) : (
                                                <span className="text-[11px] text-muted-foreground italic">No Scan</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {attendance?.links && attendance.links.length > 1 && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 py-2">
                        {attendance.links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.url || ''}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                                    link.active
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'hover:bg-muted'
                                } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </TeacherLayout>
    );
}
