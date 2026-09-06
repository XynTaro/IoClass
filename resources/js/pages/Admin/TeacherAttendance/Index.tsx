import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Clock,
    Edit3,
    Filter,
    LayoutGrid,
    List,
    RefreshCw,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
    UserX,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin/admin-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

type AttendanceStatus = 'present' | 'late' | 'absent' | 'excused';

interface TeacherAttendanceRow {
    tch_id: number;
    tch_fname: string;
    tch_mname: string | null;
    tch_lname: string;
    tch_email: string;
    contact_number: string | null;
    tch_rfid_uid: string | null;
    avatar: string | null;
    attendance_id: number | null;
    attendance_status: AttendanceStatus;
    time_in: string | null;
    time_in_formatted: string | null;
    remarks: string | null;
}

interface PageProps {
    attendance: {
        data: TeacherAttendanceRow[];
        links: { url: string | null; label: string; active: boolean }[];
        current_page: number;
        last_page: number;
        total: number;
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
        date: string;
        status?: string | null;
    };
    [key: string]: unknown;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: route('admin.dashboard') },
    { title: 'Teacher Attendance', href: route('admin.teacher-attendance.index') },
];

const PRESET_REMARKS = [
    'Official School Business',
    'Approved Sick Leave',
    'Emergency Leave',
    'Seminar / Training',
    'DepEd Conference',
    'Personal Leave',
];

export default function TeacherAttendanceIndex() {
    const { attendance, summary, filters } = usePage<PageProps>().props;

    const [searchQuery, setSearchQuery] = useState(filters.q ?? '');
    const [selectedDate, setSelectedDate] = useState(filters.date ?? new Date().toISOString().split('T')[0]);
    const [statusFilter, setStatusFilter] = useState<string>(filters.status ?? 'all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    // Edit modal state
    const [editingTeacher, setEditingTeacher] = useState<TeacherAttendanceRow | null>(null);
    const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
    const [editTimeIn, setEditTimeIn] = useState<string>('');
    const [editRemarks, setEditRemarks] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    const isToday = useMemo(() => {
        return selectedDate === new Date().toISOString().split('T')[0];
    }, [selectedDate]);

    const formattedDisplayDate = useMemo(() => {
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

    const attendanceRate = useMemo(() => {
        if (!summary.total) return 0;
        return Math.round(((summary.present + summary.late) / summary.total) * 100);
    }, [summary]);

    const applyFilters = (newParams: { q?: string; date?: string; status?: string }) => {
        const query: Record<string, string> = {};

        const q = newParams.q !== undefined ? newParams.q : searchQuery;
        const date = newParams.date !== undefined ? newParams.date : selectedDate;
        const status = newParams.status !== undefined ? newParams.status : statusFilter;

        if (q.trim()) query.q = q.trim();
        if (date) query.date = date;
        if (status && status !== 'all') query.status = status;

        router.get(route('admin.teacher-attendance.index'), query, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleDateChange = (newDate: string) => {
        setSelectedDate(newDate);
        applyFilters({ date: newDate });
    };

    const handlePrevDay = () => {
        const d = new Date(`${selectedDate}T00:00:00`);
        d.setDate(d.getDate() - 1);
        const prev = d.toISOString().split('T')[0];
        handleDateChange(prev);
    };

    const handleNextDay = () => {
        const d = new Date(`${selectedDate}T00:00:00`);
        d.setDate(d.getDate() + 1);
        const next = d.toISOString().split('T')[0];
        handleDateChange(next);
    };

    const handleToday = () => {
        const today = new Date().toISOString().split('T')[0];
        handleDateChange(today);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters({ q: searchQuery });
    };

    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(status);
        applyFilters({ status });
    };

    const openEditModal = (row: TeacherAttendanceRow) => {
        setEditingTeacher(row);
        setEditStatus(row.attendance_status);
        setEditTimeIn(row.time_in ? row.time_in.substring(11, 16) : '07:30');
        setEditRemarks(row.remarks ?? '');
    };

    const handleSaveStatus = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher) return;

        setIsSaving(true);
        router.put(
            route('admin.teacher-attendance.update', editingTeacher.tch_id),
            {
                date: selectedDate,
                status: editStatus,
                time_in: editStatus === 'absent' ? null : editTimeIn,
                remarks: editRemarks,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditingTeacher(null);
                    setIsSaving(false);
                },
                onError: () => {
                    setIsSaving(false);
                },
            }
        );
    };

    const summaryCards = [
        {
            label: 'Total Teachers',
            key: 'all',
            value: summary.total,
            subtext: `${attendanceRate}% Present`,
            icon: Users,
            color: 'text-zinc-900 dark:text-zinc-100',
            bg: 'bg-zinc-100 dark:bg-zinc-800',
            accent: 'border-zinc-300 dark:border-zinc-700',
            glow: 'from-zinc-500/10 to-transparent',
        },
        {
            label: 'Present',
            key: 'present',
            value: summary.present,
            subtext: summary.total ? `${Math.round((summary.present / summary.total) * 100)}% of total` : '0%',
            icon: CheckCircle2,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
            accent: 'border-emerald-500/30',
            glow: 'from-emerald-500/10 to-transparent',
        },
        {
            label: 'Late',
            key: 'late',
            value: summary.late,
            subtext: 'After 8:00 AM',
            icon: Clock,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-500/10 dark:bg-amber-500/15',
            accent: 'border-amber-500/30',
            glow: 'from-amber-500/10 to-transparent',
        },
        {
            label: 'Excused',
            key: 'excused',
            value: summary.excused,
            subtext: 'Official leaves',
            icon: ShieldCheck,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-500/10 dark:bg-blue-500/15',
            accent: 'border-blue-500/30',
            glow: 'from-blue-500/10 to-transparent',
        },
        {
            label: 'Absent',
            key: 'absent',
            value: summary.absent,
            subtext: 'No check-in',
            icon: UserX,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-500/10 dark:bg-rose-500/15',
            accent: 'border-rose-500/30',
            glow: 'from-rose-500/10 to-transparent',
        },
    ];

    const renderStatusBadge = (status: AttendanceStatus) => {
        const config = {
            present: {
                label: 'Present',
                style: 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 ring-emerald-500/20 border-emerald-200/50 dark:border-emerald-800/50',
                dot: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]',
            },
            late: {
                label: 'Late',
                style: 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 ring-amber-500/20 border-amber-200/50 dark:border-amber-800/50',
                dot: 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]',
            },
            excused: {
                label: 'Excused',
                style: 'bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 ring-blue-500/20 border-blue-200/50 dark:border-blue-800/50',
                dot: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]',
            },
            absent: {
                label: 'Absent',
                style: 'bg-rose-500/10 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 ring-rose-500/20 border-rose-200/50 dark:border-rose-800/50',
                dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]',
            },
        };

        const item = config[status] ?? config.absent;

        return (
            <span
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 border transition-all',
                    item.style
                )}
            >
                <span className={cn('size-1.5 rounded-full animate-pulse', item.dot)} />
                {item.label}
            </span>
        );
    };

    const columns: ColumnDef<TeacherAttendanceRow>[] = [
        {
            id: 'teacher',
            header: 'Teacher',
            cell: ({ row }) => {
                const item = row.original;
                const initials = `${item.tch_fname?.[0] ?? ''}${item.tch_lname?.[0] ?? ''}`.toUpperCase();
                const fullName = [item.tch_fname, item.tch_mname, item.tch_lname].filter(Boolean).join(' ');

                return (
                    <div className="flex items-center gap-3 py-1">
                        <Avatar className="size-10 rounded-full border-2 border-emerald-500/20 shadow-sm transition-transform hover:scale-105">
                            <AvatarImage src={item.avatar} alt={fullName} />
                            <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 text-xs dark:from-emerald-950 dark:to-teal-950 dark:text-emerald-300">
                                {initials || 'TC'}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                            <p className="font-semibold text-foreground text-sm tracking-tight hover:text-emerald-600 transition-colors">
                                {fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.tch_email}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            id: 'rfid',
            header: 'RFID Card',
            cell: ({ row }) => {
                const uid = row.original.tch_rfid_uid;
                return uid ? (
                    <span className="font-mono text-xs font-medium text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-300 px-2 py-1 rounded-md border border-emerald-200/40 dark:border-emerald-800/40">
                        {uid}
                    </span>
                ) : (
                    <span className="text-xs text-muted-foreground/60 italic font-mono">Unregistered</span>
                );
            },
        },
        {
            id: 'time_in',
            header: 'Time In',
            cell: ({ row }) => {
                const timeIn = row.original.time_in_formatted;
                return (
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        {timeIn ? (
                            <>
                                <div className="p-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                    <Clock className="size-3.5" />
                                </div>
                                <span className="text-foreground tracking-tight">{timeIn}</span>
                            </>
                        ) : (
                            <span className="text-muted-foreground/50 font-normal">—</span>
                        )}
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => renderStatusBadge(row.original.attendance_status),
        },
        {
            id: 'remarks',
            header: 'Remarks / Notes',
            cell: ({ row }) => {
                const remarks = row.original.remarks;
                return remarks ? (
                    <div className="flex items-center gap-1.5 max-w-[220px]">
                        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate bg-muted/60 px-2 py-1 rounded-md border border-border/40" title={remarks}>
                            {remarks}
                        </span>
                    </div>
                ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                );
            },
        },
        {
            id: 'actions',
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <div className="flex justify-end">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(item)}
                            className="h-8 gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition-all"
                        >
                            <Edit3 className="size-3.5" />
                            Update
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Teacher Attendance Management" />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner — matches Sections Management style ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Teacher Attendance
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Daily attendance records, time tracking, and leave management for teachers.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {summary.total} Teachers
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Date Navigation Toolbar Card ── */}
                <div className="flex flex-col gap-3 rounded-xl border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Showing records for</span>
                        <span className="font-semibold text-foreground underline decoration-emerald-500/40 underline-offset-4">
                            {formattedDisplayDate}
                        </span>
                        {isToday && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold text-[11px]">
                                <Sparkles className="size-3 mr-1" />
                                Today
                            </Badge>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handlePrevDay}
                            className="size-9 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50"
                            title="Previous Day"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>

                        <div className="relative flex items-center">
                            <CalendarIcon className="pointer-events-none absolute left-3 size-4 text-emerald-600 dark:text-emerald-400" />
                            <Input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="h-9 w-[160px] pl-9 text-xs font-semibold rounded-lg border-muted bg-background focus-visible:ring-emerald-500"
                            />
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={handleNextDay}
                            className="size-9 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50"
                            title="Next Day"
                        >
                            <ChevronRight className="size-4" />
                        </Button>

                        <Button
                            variant={isToday ? 'default' : 'secondary'}
                            size="sm"
                            onClick={handleToday}
                            className={cn(
                                'h-9 px-3 text-xs font-semibold rounded-lg transition-all',
                                isToday
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                    : 'hover:bg-muted'
                            )}
                        >
                            Today
                        </Button>
                    </div>
                </div>

                {/* Summary Metric KPI Cards */}
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        const isSelected =
                            statusFilter === card.key ||
                            (card.key === 'all' && (!statusFilter || statusFilter === 'all'));

                        return (
                            <Card
                                key={card.key}
                                onClick={() => handleStatusFilterChange(card.key)}
                                className={cn(
                                    'group relative cursor-pointer overflow-hidden rounded-2xl border py-0 gap-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg',
                                    isSelected
                                        ? 'ring-2 ring-emerald-500 border-emerald-500/60 bg-gradient-to-b from-card to-emerald-50/20 dark:to-emerald-950/20 shadow-md shadow-emerald-500/10'
                                        : 'hover:border-zinc-300 dark:hover:border-zinc-700 bg-card'
                                )}
                            >
                                <div
                                    className={cn(
                                        'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity group-hover:opacity-100',
                                        card.glow
                                    )}
                                />
                                <CardContent className="p-4 relative">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                {card.label}
                                            </p>
                                            <p className={cn('text-3xl font-extrabold tracking-tight', card.color)}>
                                                {card.value}
                                            </p>
                                        </div>
                                        <div className={cn('flex size-10 items-center justify-center rounded-xl transition-transform group-hover:scale-110 shadow-sm', card.bg)}>
                                            <Icon className={cn('size-5', card.color)} />
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                                        <span>{card.subtext}</span>
                                        {isSelected && (
                                            <span className="font-bold text-emerald-600 dark:text-emerald-400">
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
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <Input
                                placeholder="Search teacher by name, email, or RFID UID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-10 pl-9 pr-8 text-sm rounded-xl border-muted bg-background focus-visible:ring-emerald-500"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSearchQuery('');
                                        applyFilters({ q: '' });
                                    }}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                                >
                                    <X className="size-3.5" />
                                </button>
                            )}
                        </div>
                        <Button type="submit" variant="secondary" className="h-10 px-4 text-xs font-semibold rounded-xl">
                            Search
                        </Button>
                    </form>

                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2">
                            <Filter className="size-4 text-muted-foreground" />
                            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
                                <SelectTrigger className="w-[150px] h-10 text-xs font-semibold rounded-xl">
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

                        {/* View Switcher: Table vs Grid */}
                        <div className="flex items-center rounded-xl bg-muted/60 p-1 border">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-lg text-xs transition-all',
                                    viewMode === 'table'
                                        ? 'bg-background text-foreground shadow-sm font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
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
                                        ? 'bg-background text-foreground shadow-sm font-semibold'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                title="Card Grid View"
                            >
                                <LayoutGrid className="size-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content View */}
                {attendance.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/50 p-12 text-center">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 mb-4">
                            <Users className="size-7" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">No Teacher Attendance Records Found</h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                            {searchQuery || statusFilter !== 'all'
                                ? 'No teachers match your search filters for this date. Try clearing your filters.'
                                : 'No teacher records are available for the selected date.'}
                        </p>
                        {(searchQuery || statusFilter !== 'all') && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('all');
                                    applyFilters({ q: '', status: 'all' });
                                }}
                                className="mt-4 gap-1.5 text-xs font-semibold rounded-xl"
                            >
                                <RefreshCw className="size-3.5" />
                                Clear All Filters
                            </Button>
                        )}
                    </div>
                ) : viewMode === 'table' ? (
                    /* Table View */
                    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                        <DataTable columns={columns} data={attendance.data} />

                        {/* Pagination */}
                        {attendance.links && attendance.links.length > 3 && (
                            <div className="flex items-center justify-between border-t border-border/50 px-5 py-3.5">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Showing <span className="font-bold text-foreground">{attendance.data.length}</span> of{' '}
                                    <span className="font-bold text-foreground">{attendance.total}</span> teachers
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
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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
                            {attendance.data.map((item) => {
                                const initials = `${item.tch_fname?.[0] ?? ''}${item.tch_lname?.[0] ?? ''}`.toUpperCase();
                                const fullName = [item.tch_fname, item.tch_mname, item.tch_lname].filter(Boolean).join(' ');

                                return (
                                    <div
                                        key={item.tch_id}
                                        className="group relative flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                                    >
                                        <div className="space-y-3">
                                            <div className="flex items-start justify-between">
                                                <Avatar className="size-12 rounded-2xl border-2 border-emerald-500/20 shadow-sm">
                                                    <AvatarImage src={item.avatar} alt={fullName} />
                                                    <AvatarFallback className="bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-800 text-sm dark:from-emerald-950 dark:to-teal-950 dark:text-emerald-300">
                                                        {initials || 'TC'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                {renderStatusBadge(item.attendance_status)}
                                            </div>

                                            <div>
                                                <h3 className="font-bold text-foreground text-base tracking-tight group-hover:text-emerald-600 transition-colors">
                                                    {fullName}
                                                </h3>
                                                <p className="text-xs text-muted-foreground truncate">{item.tch_email}</p>
                                            </div>

                                            <div className="rounded-xl bg-muted/40 p-2.5 space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">RFID Card:</span>
                                                    <span className="font-mono font-medium text-foreground">
                                                        {item.tch_rfid_uid || 'Not Assigned'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Time In:</span>
                                                    <span className="font-semibold text-foreground">
                                                        {item.time_in_formatted || '—'}
                                                    </span>
                                                </div>
                                                {item.remarks && (
                                                    <div className="pt-1 border-t border-border/40 text-[11px] text-muted-foreground italic truncate">
                                                        "{item.remarks}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => openEditModal(item)}
                                            className="mt-4 w-full h-8 text-xs font-semibold rounded-xl hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50"
                                        >
                                            <Edit3 className="size-3.5 mr-1.5" />
                                            Update Status
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination for Grid View */}
                        {attendance.links && attendance.links.length > 3 && (
                            <div className="flex items-center justify-between rounded-2xl border bg-card px-5 py-3.5 shadow-sm">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Showing <span className="font-bold text-foreground">{attendance.data.length}</span> of{' '}
                                    <span className="font-bold text-foreground">{attendance.total}</span> teachers
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
                                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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

            {/* Edit / Update Status Modal */}
            <Dialog open={editingTeacher !== null} onOpenChange={(open) => !open && setEditingTeacher(null)}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl p-6">
                    <DialogHeader className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Avatar className="size-11 rounded-2xl border-2 border-emerald-500/20 shadow-sm">
                                <AvatarImage src={editingTeacher?.avatar} />
                                <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs">
                                    {editingTeacher?.tch_fname?.[0]}
                                    {editingTeacher?.tch_lname?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div>
                                <DialogTitle className="text-lg font-bold">Update Attendance Status</DialogTitle>
                                <DialogDescription className="text-xs">
                                    {editingTeacher?.tch_fname} {editingTeacher?.tch_lname} • {selectedDate}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <form onSubmit={handleSaveStatus} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="status" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Attendance Status
                            </Label>
                            <Select
                                value={editStatus}
                                onValueChange={(val: AttendanceStatus) => setEditStatus(val)}
                            >
                                <SelectTrigger id="status" className="h-10 rounded-xl">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="present">Present (On Time)</SelectItem>
                                    <SelectItem value="late">Late Arrival</SelectItem>
                                    <SelectItem value="excused">Excused (Leave / Official Business)</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {editStatus !== 'absent' && (
                            <div className="space-y-1.5">
                                <Label htmlFor="time_in" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Time In
                                </Label>
                                <div className="relative">
                                    <Clock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                                    <Input
                                        id="time_in"
                                        type="time"
                                        value={editTimeIn}
                                        onChange={(e) => setEditTimeIn(e.target.value)}
                                        className="h-10 pl-9 rounded-xl font-medium"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="remarks" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                Remarks / Reason
                            </Label>
                            <Input
                                id="remarks"
                                placeholder="Type a reason or select a preset below..."
                                value={editRemarks}
                                onChange={(e) => setEditRemarks(e.target.value)}
                                className="h-10 rounded-xl"
                            />

                            {/* Preset Chips */}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {PRESET_REMARKS.map((preset) => (
                                    <button
                                        key={preset}
                                        type="button"
                                        onClick={() => setEditRemarks(preset)}
                                        className={cn(
                                            'text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all',
                                            editRemarks === preset
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border/50'
                                        )}
                                    >
                                        {preset}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <DialogFooter className="pt-4 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setEditingTeacher(null)}
                                disabled={isSaving}
                                className="h-10 rounded-xl text-xs font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-600/20"
                            >
                                {isSaving ? 'Saving Changes...' : 'Save Attendance'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
