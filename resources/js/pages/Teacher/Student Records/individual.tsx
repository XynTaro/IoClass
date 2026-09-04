import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Calendar,
    CheckCircle2,
    ChevronRight,
    Clock,
    Filter,
    Info,
    RefreshCw,
    UserCheck,
    Users,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import studentRecords from '@/routes/teacher/student-records';

type Status = 'active' | 'inactive';

type Student = {
    stu_id: number;
    lrn?: string | null;
    stu_fname: string;
    stu_lname: string;
    gr_level: string;
    sect: string;
    status: Status;
};

type Log = {
    att_id: number;
    status: string;
    session_id: number | null;
    session_date: string | null;
    start_time: string | null;
    end_time: string | null;
    subj_id: number | null;
    subj_name: string | null;
    subj_code: string | null;
};

type AttendanceCategory = 'present' | 'late' | 'absent' | 'excused';

const STATUS_BADGE: Record<string, string> = {
    present:
        'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400',
    late: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400',
    absent: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:bg-red-500/15 dark:text-red-400',
    excused:
        'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:bg-sky-500/15 dark:text-sky-400',
};

const CATEGORY_CONFIG: Record<
    AttendanceCategory,
    {
        label: string;
        description: string;
        icon: typeof CheckCircle2;
        color: string;
        textColor: string;
        bgColor: string;
        borderColor: string;
        dotColor: string;
        emptyText: string;
    }
> = {
    present: {
        label: 'Present',
        description: 'Sessions attended on time',
        icon: CheckCircle2,
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700 dark:text-emerald-400',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-900/50',
        dotColor: 'bg-emerald-500',
        emptyText: 'No present records recorded yet.',
    },
    late: {
        label: 'Late',
        description: 'Sessions attended after class start time',
        icon: Clock,
        color: 'bg-amber-500',
        textColor: 'text-amber-700 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-900/50',
        dotColor: 'bg-amber-500',
        emptyText: 'No late arrivals recorded.',
    },
    absent: {
        label: 'Absent',
        description: 'Classes missed without attendance check-in',
        icon: XCircle,
        color: 'bg-red-500',
        textColor: 'text-red-700 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-900/50',
        dotColor: 'bg-red-500',
        emptyText: 'No absences recorded! Great job.',
    },
    excused: {
        label: 'Excused',
        description: 'Absences excused with permission or valid reason',
        icon: Info,
        color: 'bg-sky-500',
        textColor: 'text-sky-700 dark:text-sky-400',
        bgColor: 'bg-sky-50 dark:bg-sky-950/30',
        borderColor: 'border-sky-200 dark:border-sky-900/50',
        dotColor: 'bg-sky-500',
        emptyText: 'No excused sessions recorded.',
    },
};

function formatLogDateTime(log: Log): string {
    if (!log.session_date) {
        return '—';
    }

    if (!log.start_time) {
        return new Date(`${log.session_date}T00:00:00`).toLocaleDateString(
            undefined,
            {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
            },
        );
    }

    return new Date(
        `${log.session_date}T${log.start_time}`,
    ).toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function subjectLabel(log: Log): { title: string; code: string | null } {
    if (log.subj_name) {
        return { title: log.subj_name, code: log.subj_code };
    }

    if (log.subj_id != null) {
        return { title: `Subject #${log.subj_id}`, code: log.subj_code };
    }

    return { title: 'Daily attendance', code: null };
}

export default function TeacherStudentRecordView() {
    const { student, logs } = usePage<{ student: Student; logs: Log[] }>()
        .props;
    const [date, setDate] = useState<string>('');
    const [status, setStatus] = useState<string>('all');
    const [modalCategory, setModalCategory] = useState<AttendanceCategory | null>(null);

    const today = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    const filteredLogs = useMemo(() => {
        return (logs ?? []).filter((l) => {
            if (status !== 'all' && (l.status ?? '').toLowerCase() !== status) {
                return false;
            }

            if (date && (l.session_date ?? '') !== date) {
                return false;
            }

            return true;
        });
    }, [date, logs, status]);

    const stats = useMemo(() => {
        const total = logs.length;
        const present = logs.filter(l => (l.status ?? '').toLowerCase() === 'present').length;
        const late = logs.filter(l => (l.status ?? '').toLowerCase() === 'late').length;
        const absent = logs.filter(l => (l.status ?? '').toLowerCase() === 'absent').length;
        const excused = logs.filter(l => (l.status ?? '').toLowerCase() === 'excused').length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

        return { total, present, late, absent, excused, rate };
    }, [logs]);

    // Logs filtered specifically for the open modal category
    const modalCategoryLogs = useMemo(() => {
        if (!modalCategory) return [];
        return (logs ?? []).filter(
            (l) => (l.status ?? '').toLowerCase() === modalCategory,
        );
    }, [logs, modalCategory]);

    // Group modal logs by subject
    const modalSubjectBreakdown = useMemo(() => {
        if (!modalCategoryLogs.length) return [];
        const map = new Map<
            string,
            {
                subj_name: string;
                subj_code: string | null;
                count: number;
                logs: Log[];
            }
        >();

        modalCategoryLogs.forEach((l) => {
            const subject = subjectLabel(l);
            const key = subject.title;
            const existing = map.get(key);
            if (existing) {
                existing.count++;
                existing.logs.push(l);
            } else {
                map.set(key, {
                    subj_name: subject.title,
                    subj_code: subject.code,
                    count: 1,
                    logs: [l],
                });
            }
        });

        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [modalCategoryLogs]);

    const handleFilterTableFromModal = (category: AttendanceCategory) => {
        setStatus(category);
        setModalCategory(null);
    };

    const currentConfig = modalCategory ? CATEGORY_CONFIG[modalCategory] : null;

    return (
        <TeacherLayout>
            <Head
                title={`Student Record - ${student.stu_fname} ${student.stu_lname}`}
            />

            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* Page Header — matches My Schedule & My Attendance style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3.5">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 shrink-0 cursor-pointer shadow-xs rounded-lg"
                                onClick={() => router.visit(studentRecords.index.url())}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="sr-only">Back</span>
                            </Button>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                        {student.stu_fname} {student.stu_lname}
                                    </h1>
                                    {student.status && (
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                            student.status === 'active' 
                                                ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400' 
                                                : 'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400'
                                        }`}>
                                            <span className={`size-1 rounded-full ${student.status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                            {student.status}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Individual attendance records, logs, and statistics.
                                </p>
                            </div>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
                            <span className="font-medium text-foreground">
                                {student.gr_level} — {student.sect}
                            </span>
                            {student.lrn && (
                                <>
                                    <span className="text-border">|</span>
                                    <span className="font-mono text-xs text-muted-foreground">
                                        LRN: {student.lrn}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Interactive Cards */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                    {/* Attendance Rate */}
                    <div className="rounded-xl border bg-card p-4 shadow-xs flex flex-col justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Attendance Rate</span>
                        <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-2xl font-bold tracking-tight text-foreground">{stats.rate}%</span>
                            <span className="text-[10px] text-muted-foreground">Present/Late</span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 mt-3 overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                    stats.rate >= 90 
                                        ? 'bg-emerald-500' 
                                        : stats.rate >= 75 
                                            ? 'bg-amber-500' 
                                            : 'bg-red-500'
                                }`} 
                                style={{ width: `${stats.rate}%` }} 
                            />
                        </div>
                    </div>

                    {/* Days Present Card */}
                    <button
                        type="button"
                        onClick={() => setModalCategory('present')}
                        className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:shadow-md hover:shadow-emerald-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground font-medium group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                                Days Present
                            </span>
                            <ChevronRight className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600" />
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">{stats.present}</span>
                            <span className="text-xs text-muted-foreground">/ {stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">Checked in on time</p>
                            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                View breakdown →
                            </span>
                        </div>
                    </button>

                    {/* Days Late Card */}
                    <button
                        type="button"
                        onClick={() => setModalCategory('late')}
                        className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-md hover:shadow-amber-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 cursor-pointer"
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground font-medium group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                                Days Late
                            </span>
                            <ChevronRight className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600" />
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">{stats.late}</span>
                            <span className="text-xs text-muted-foreground">/ {stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">Arrived after session start</p>
                            <span className="text-[9px] font-medium text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                View breakdown →
                            </span>
                        </div>
                    </button>

                    {/* Days Absent Card */}
                    <button
                        type="button"
                        onClick={() => setModalCategory('absent')}
                        className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-red-500/40 hover:shadow-md hover:shadow-red-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground font-medium group-hover:text-red-700 dark:group-hover:text-red-400 transition-colors">
                                Days Absent
                            </span>
                            <ChevronRight className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-red-600" />
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-2xl font-bold tracking-tight text-red-600 dark:text-red-400">{stats.absent}</span>
                            <span className="text-xs text-muted-foreground">/ {stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">Missed scheduled classes</p>
                            <span className="text-[9px] font-medium text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                View breakdown →
                            </span>
                        </div>
                    </button>

                    {/* Days Excused Card */}
                    <button
                        type="button"
                        onClick={() => setModalCategory('excused')}
                        className="group relative flex flex-col justify-between rounded-xl border bg-card p-4 text-left shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:shadow-md hover:shadow-sky-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 cursor-pointer col-span-2 md:col-span-1"
                    >
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground font-medium group-hover:text-sky-700 dark:group-hover:text-sky-400 transition-colors">
                                Days Excused
                            </span>
                            <ChevronRight className="size-3.5 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-sky-600" />
                        </div>
                        <div className="flex items-baseline gap-1 mt-2">
                            <span className="text-2xl font-bold tracking-tight text-sky-600 dark:text-sky-400">{stats.excused}</span>
                            <span className="text-xs text-muted-foreground">/ {stats.total}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <p className="text-[10px] text-muted-foreground">Excused with permission</p>
                            <span className="text-[9px] font-medium text-sky-600 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                View breakdown →
                            </span>
                        </div>
                    </button>
                </div>

                {/* Control & Filter Center */}
                <div className="rounded-xl border bg-card p-4 shadow-xs">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center w-full md:max-w-2xl">
                            <div className="w-full sm:w-56">
                                <Input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    max={today}
                                    className="h-9 cursor-pointer"
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <Select value={status} onValueChange={setStatus}>
                                    <SelectTrigger className="h-9 w-full">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All statuses</SelectItem>
                                        <SelectItem value="present">Present</SelectItem>
                                        <SelectItem value="late">Late</SelectItem>
                                        <SelectItem value="absent">Absent</SelectItem>
                                        <SelectItem value="excused">Excused</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {(date || status !== 'all') && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setDate('');
                                    setStatus('all');
                                }}
                                className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start md:self-auto cursor-pointer"
                            >
                                <RefreshCw className="size-3" />
                                Clear Filters
                            </Button>
                        )}
                    </div>
                </div>

                {/* Logs Table / Timeline View */}
                {filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center bg-card/30">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                            <Calendar className="size-6" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">No attendance logs found</p>
                            <p className="text-xs text-muted-foreground">
                                Try adjusting the date filter or status type above.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/40 text-foreground/75 font-medium">
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                                            Date / Time
                                        </th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                                            Subject / Session
                                        </th>
                                        <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {filteredLogs.map((l) => {
                                        const subject = subjectLabel(l);
                                        const statusKey = (l.status ?? '').toLowerCase();
                                        const badgeClass = STATUS_BADGE[statusKey] ?? 'bg-muted text-foreground ring-muted-500/10';

                                        return (
                                            <tr
                                                key={l.att_id}
                                                className="transition-colors hover:bg-muted/30"
                                            >
                                                <td className="px-5 py-4 whitespace-nowrap font-medium text-foreground/90 tabular-nums">
                                                    {formatLogDateTime(l)}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-foreground">
                                                        {subject.title}
                                                    </div>
                                                    {subject.code ? (
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            Code: <span className="font-mono">{subject.code}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-muted-foreground mt-0.5">
                                                            General Class Attendance
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    <span
                                                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${badgeClass}`}
                                                    >
                                                        <span className={`size-1.5 rounded-full ${
                                                            statusKey === 'present' 
                                                                ? 'bg-emerald-500' 
                                                                : statusKey === 'late'
                                                                    ? 'bg-amber-500'
                                                                    : statusKey === 'absent'
                                                                        ? 'bg-red-500'
                                                                        : 'bg-sky-500'
                                                        }`} />
                                                        {l.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Subject Breakdown Modal (Option 1) ── */}
                {modalCategory && currentConfig && (
                    <Dialog
                        open={modalCategory !== null}
                        onOpenChange={(open) => !open && setModalCategory(null)}
                    >
                        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                            {/* Modal Header */}
                            <div className="p-6 pb-4 border-b border-border/60 bg-muted/20">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className={cn(
                                                    'flex size-10 items-center justify-center rounded-xl ring-1',
                                                    currentConfig.bgColor,
                                                    currentConfig.borderColor,
                                                )}
                                            >
                                                <currentConfig.icon
                                                    className={cn('size-5', currentConfig.textColor)}
                                                />
                                            </div>
                                            <div>
                                                <DialogTitle className="text-lg font-bold">
                                                    {currentConfig.label} Records Breakdown
                                                </DialogTitle>
                                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                                    {student.stu_fname} {student.stu_lname} ({student.gr_level} — {student.sect})
                                                </DialogDescription>
                                            </div>
                                        </div>

                                        <div className="pr-6">
                                            <span
                                                className={cn(
                                                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1',
                                                    currentConfig.bgColor,
                                                    currentConfig.textColor,
                                                    currentConfig.borderColor,
                                                )}
                                            >
                                                <span className={cn('size-2 rounded-full', currentConfig.color)} />
                                                {modalCategoryLogs.length} Session{modalCategoryLogs.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Category switcher pills inside modal */}
                                    <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                                        {(['absent', 'late', 'present', 'excused'] as AttendanceCategory[]).map((cat) => {
                                            const cfg = CATEGORY_CONFIG[cat];
                                            const count = stats[cat];
                                            const isActive = modalCategory === cat;

                                            return (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setModalCategory(cat)}
                                                    className={cn(
                                                        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer',
                                                        isActive
                                                            ? cn(cfg.bgColor, cfg.textColor, 'ring-1', cfg.borderColor, 'font-semibold')
                                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                                    )}
                                                >
                                                    <span className={cn('size-1.5 rounded-full', cfg.dotColor)} />
                                                    {cfg.label}
                                                    <span className="text-[10px] opacity-75 tabular-nums">({count})</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Modal Body (Scrollable) */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {modalCategoryLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <currentConfig.icon className={cn('size-12 mb-3 opacity-40', currentConfig.textColor)} />
                                        <p className="text-sm font-semibold text-foreground">
                                            {currentConfig.emptyText}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                                            No {currentConfig.label.toLowerCase()} entries recorded for {student.stu_fname}.
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Subject Summary Breakdown */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <BookOpen className="size-3.5" />
                                                    Breakdown by Subject
                                                </h3>
                                                <span className="text-xs text-muted-foreground">
                                                    {modalSubjectBreakdown.length} subject{modalSubjectBreakdown.length !== 1 ? 's' : ''} affected
                                                </span>
                                            </div>

                                            <div className="grid gap-2 sm:grid-cols-2">
                                                {modalSubjectBreakdown.map((item) => {
                                                    const percentage = Math.round(
                                                        (item.count / modalCategoryLogs.length) * 100,
                                                    );

                                                    return (
                                                        <div
                                                            key={item.subj_name}
                                                            className="rounded-xl border border-border/70 bg-card p-3.5 shadow-2xs space-y-2"
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div>
                                                                    <p className="text-sm font-semibold text-foreground leading-snug">
                                                                        {item.subj_name}
                                                                    </p>
                                                                    {item.subj_code && (
                                                                        <span className="font-mono text-[10px] text-muted-foreground">
                                                                            {item.subj_code}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <span
                                                                    className={cn(
                                                                        'shrink-0 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums',
                                                                        currentConfig.bgColor,
                                                                        currentConfig.textColor,
                                                                    )}
                                                                >
                                                                    {item.count} {item.count === 1 ? 'time' : 'times'}
                                                                </span>
                                                            </div>

                                                            {/* Mini Proportion Bar */}
                                                            <div className="space-y-1">
                                                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                                    <div
                                                                        className={cn('h-full rounded-full transition-all', currentConfig.color)}
                                                                        style={{ width: `${percentage}%` }}
                                                                    />
                                                                </div>
                                                                <p className="text-[10px] text-right text-muted-foreground">
                                                                    {percentage}% of total {currentConfig.label.toLowerCase()}s
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Detailed Session Logs Timeline */}
                                        <div className="space-y-3 pt-2">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Calendar className="size-3.5" />
                                                Session Log Dates ({modalCategoryLogs.length})
                                            </h3>

                                            <div className="rounded-xl border divide-y divide-border/60 overflow-hidden bg-card">
                                                {modalCategoryLogs.map((log) => {
                                                    const subject = subjectLabel(log);

                                                    return (
                                                        <div
                                                            key={log.att_id}
                                                            className="flex items-center justify-between gap-3 p-3 text-xs hover:bg-muted/30 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div
                                                                    className={cn(
                                                                        'size-2 rounded-full shrink-0',
                                                                        currentConfig.dotColor,
                                                                    )}
                                                                />
                                                                <div className="min-w-0">
                                                                    <p className="font-semibold text-foreground truncate">
                                                                        {subject.title}
                                                                    </p>
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        {formatLogDateTime(log)}
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="shrink-0 flex items-center gap-2">
                                                                {subject.code && (
                                                                    <span className="font-mono text-[10px] bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                                                        {subject.code}
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={cn(
                                                                        'rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ring-1',
                                                                        currentConfig.bgColor,
                                                                        currentConfig.textColor,
                                                                        currentConfig.borderColor,
                                                                    )}
                                                                >
                                                                    {log.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <DialogFooter className="p-4 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleFilterTableFromModal(modalCategory)}
                                    className="gap-1.5 text-xs cursor-pointer"
                                >
                                    <Filter className="size-3.5" />
                                    Filter table to {currentConfig.label}
                                </Button>
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => setModalCategory(null)}
                                    className="text-xs cursor-pointer"
                                >
                                    Close
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </TeacherLayout>
    );
}

