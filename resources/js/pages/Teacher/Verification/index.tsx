import { Head, router, usePage } from '@inertiajs/react';
import {
    BookOpen,
    CheckCircle2,
    Clock,
    Search,
    ShieldCheck,
    UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export type VerificationRow = {
    stu_id: number;
    lrn: number | string | null;
    stu_fname: string;
    stu_lname: string;
    gr_level: string;
    sect: string;
    attendance_status: 'absent';
    time_in: string | null;
    time_out?: string | null;
};

type Assignment = {
    subj_id: number;
    sect_id: number;
    subj_code: string | null;
    subj_name: string;
    sect_name: string;
    gr_level: string;
};

type SelectedAssignment = Assignment;

type Props = {
    date: string;
    assignments: Assignment[];
    selected: SelectedAssignment | null;
    rows: VerificationRow[];
    summary: {
        present: number;
        late: number;
        excused: number;
        absent: number;
    };
    message: string | null;
};

type VerificationStatus = 'present' | 'late' | 'excused' | 'absent';

const STATUS_OPTIONS: ReadonlyArray<{
    value: VerificationStatus;
    label: string;
    checkboxClass: string;
    headerTextClass: string;
    pillClass: string;
}> = [
    {
        value: 'present',
        label: 'Present',
        checkboxClass:
            'border-emerald-400/70 data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white data-[state=indeterminate]:border-emerald-500 data-[state=indeterminate]:bg-emerald-500/20 data-[state=indeterminate]:text-emerald-700 dark:data-[state=indeterminate]:text-emerald-300',
        headerTextClass: 'text-emerald-700 dark:text-emerald-400',
        pillClass:
            'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    {
        value: 'late',
        label: 'Late',
        checkboxClass:
            'border-amber-400/70 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white data-[state=indeterminate]:border-amber-500 data-[state=indeterminate]:bg-amber-500/20 data-[state=indeterminate]:text-amber-700 dark:data-[state=indeterminate]:text-amber-300',
        headerTextClass: 'text-amber-700 dark:text-amber-400',
        pillClass:
            'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
    },
    {
        value: 'excused',
        label: 'Excused',
        checkboxClass:
            'border-slate-400/70 data-[state=checked]:border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:text-white data-[state=indeterminate]:border-slate-500 data-[state=indeterminate]:bg-slate-500/20 data-[state=indeterminate]:text-slate-700 dark:data-[state=indeterminate]:text-slate-300',
        headerTextClass: 'text-slate-700 dark:text-slate-300',
        pillClass:
            'bg-slate-500/10 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300',
    },
    {
        value: 'absent',
        label: 'Absent',
        checkboxClass:
            'border-red-400/70 data-[state=checked]:border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:text-white data-[state=indeterminate]:border-red-500 data-[state=indeterminate]:bg-red-500/20 data-[state=indeterminate]:text-red-700 dark:data-[state=indeterminate]:text-red-300',
        headerTextClass: 'text-red-700 dark:text-red-400',
        pillClass:
            'bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400',
    },
];

const summaryCards = [
    {
        label: 'Present',
        key: 'present' as const,
        icon: CheckCircle2,
        valueStyle: 'text-emerald-600 dark:text-emerald-400',
        iconStyle:
            'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
    },
    {
        label: 'Late',
        key: 'late' as const,
        icon: Clock,
        valueStyle: 'text-amber-600 dark:text-amber-400',
        iconStyle:
            'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
    },
    {
        label: 'Excused',
        key: 'excused' as const,
        icon: ShieldCheck,
        valueStyle: 'text-slate-600 dark:text-slate-400',
        iconStyle:
            'bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400',
    },
    {
        label: 'Absent',
        key: 'absent' as const,
        icon: UserX,
        valueStyle: 'text-red-600 dark:text-red-400',
        iconStyle:
            'bg-red-500/10 text-red-600 dark:bg-red-500/15 dark:text-red-400',
    },
];

function formatLrn(value: unknown): string {
    if (value === null || value === undefined || value === '') {
        return '—';
    }
    const s = String(value).replace(/\D/g, '');
    if (s.length === 0) {
        return String(value);
    }
    return s.length < 12 ? s.padStart(12, '0') : s;
}

function assignmentKey(assignment: Pick<Assignment, 'subj_id' | 'sect_id'>): string {
    return `${assignment.subj_id}:${assignment.sect_id}`;
}

function parseAssignmentKey(value: string): { subj_id: number; sect_id: number } | null {
    const [subj, sect] = value.split(':');
    const subj_id = Number(subj);
    const sect_id = Number(sect);
    if (!Number.isFinite(subj_id) || !Number.isFinite(sect_id)) {
        return null;
    }
    return { subj_id, sect_id };
}

export default function TeacherVerificationIndex() {
    const {
        date,
        assignments,
        selected,
        rows: initialRows,
        summary,
        message,
    } = usePage<Props>().props;

    const today = useMemo(() => {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }, []);

    const [rows, setRows] = useState<
        Array<VerificationRow & { status: VerificationStatus }>
    >(() => initialRows.map((r) => ({ ...r, status: 'absent' })));
    const [submitting, setSubmitting] = useState(false);
    const [nameSearch, setNameSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(date);
    const [selectedKey, setSelectedKey] = useState(
        selected ? assignmentKey(selected) : '',
    );

    useEffect(() => {
        setRows(initialRows.map((r) => ({ ...r, status: 'absent' })));
        setSelectedDate(date);
        setSelectedKey(selected ? assignmentKey(selected) : '');
    }, [date, initialRows, selected]);

    const filteredRows = useMemo(() => {
        const q = nameSearch.trim().toLowerCase();
        if (!q) {
            return rows;
        }
        return rows.filter((r) => {
            const fname = r.stu_fname.toLowerCase();
            const lname = r.stu_lname.toLowerCase();
            const full = `${lname}, ${fname}`;
            const fullAlt = `${fname} ${lname}`;
            return (
                fname.includes(q) ||
                lname.includes(q) ||
                full.includes(q) ||
                fullAlt.includes(q)
            );
        });
    }, [rows, nameSearch]);

    const setStatus = (stuId: number, status: VerificationStatus) => {
        setRows((prev) =>
            prev.map((r) => (r.stu_id === stuId ? { ...r, status } : r)),
        );
    };

    const setStatusForVisible = (status: VerificationStatus) => {
        const visibleIds = new Set(filteredRows.map((r) => r.stu_id));
        setRows((prev) =>
            prev.map((r) =>
                visibleIds.has(r.stu_id) ? { ...r, status } : r,
            ),
        );
    };

    const pendingCounts = useMemo(() => {
        const counts: Record<VerificationStatus, number> = {
            present: 0,
            late: 0,
            excused: 0,
            absent: 0,
        };
        for (const row of rows) {
            counts[row.status] += 1;
        }
        return counts;
    }, [rows]);

    const navigate = (next: {
        date?: string;
        subj_id?: number | null;
        sect_id?: number | null;
    }) => {
        const query: Record<string, string> = {};
        const rawDate = next.date ?? selectedDate;
        const nextDate = rawDate && rawDate > today ? today : rawDate;
        const nextSubj = next.subj_id ?? selected?.subj_id ?? null;
        const nextSect = next.sect_id ?? selected?.sect_id ?? null;

        if (nextDate) {
            query.date = nextDate;
        }
        if (nextSubj != null) {
            query.subj_id = String(nextSubj);
        }
        if (nextSect != null) {
            query.sect_id = String(nextSect);
        }

        router.get(
            teacher.verification.index.url({ query }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    };

    const submit = () => {
        if (!selected) {
            return;
        }

        setSubmitting(true);
        router.post(
            teacher.verification.confirm.url(),
            {
                date,
                subj_id: selected.subj_id,
                sect_id: selected.sect_id,
                rows: rows.map(({ stu_id, status }) => ({ stu_id, status })),
            },
            {
                preserveScroll: true,
                onFinish: () => setSubmitting(false),
            },
        );
    };

    return (
        <TeacherLayout>
            <Head title="Subject Verification" />

            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Subject Verification
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Verify attendance for students in a subject you teach. Confirm absences or mark excused, present, or late.
                        </p>
                    </div>
                    <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs">
                        <ShieldCheck className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                        <span className="font-medium text-foreground">
                            {filteredRows.length} students
                        </span>
                        {selected && (
                            <>
                                <span className="text-border">|</span>
                                <span className="font-medium text-blue-600 dark:text-blue-400">
                                    {selected.subj_name} ({selected.sect_name})
                                </span>
                            </>
                        )}
                    </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl border bg-card p-4 shadow-sm sm:col-span-2 lg:col-span-1">
                        <Label
                            htmlFor="verification-date"
                            className="mb-1.5 block text-xs text-muted-foreground"
                        >
                            Date
                        </Label>
                        <Input
                            id="verification-date"
                            type="date"
                            value={selectedDate}
                            max={today}
                            onChange={(e) => {
                                const nextDate = e.target.value;
                                if (nextDate && nextDate > today) return;
                                setSelectedDate(nextDate);
                                navigate({ date: nextDate });
                            }}
                            className="h-9 cursor-pointer"
                        />
                    </div>

                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.label}
                                className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm"
                            >
                                <div
                                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${card.iconStyle}`}
                                >
                                    <Icon className="size-5" aria-hidden />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                        {card.label}
                                    </p>
                                    <p
                                        className={`text-xl font-bold tabular-nums ${card.valueStyle}`}
                                    >
                                        {summary[card.key]}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <BookOpen
                            className="size-4 text-primary"
                            aria-hidden
                        />
                        Subject & section
                    </div>
                    <div className="grid gap-3 lg:grid-cols-2">
                        <div>
                            <Label className="mb-1.5 block text-xs text-muted-foreground">
                                Class assignment
                            </Label>
                            <Select
                                value={selectedKey || undefined}
                                onValueChange={(value) => {
                                    setSelectedKey(value);
                                    const parsed = parseAssignmentKey(value);
                                    if (!parsed) {
                                        return;
                                    }
                                    navigate({
                                        subj_id: parsed.subj_id,
                                        sect_id: parsed.sect_id,
                                    });
                                }}
                                disabled={assignments.length === 0}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Select subject and section" />
                                </SelectTrigger>
                                <SelectContent>
                                    {assignments.map((assignment) => (
                                        <SelectItem
                                            key={assignmentKey(assignment)}
                                            value={assignmentKey(assignment)}
                                        >
                                            {assignment.subj_code
                                                ? `${assignment.subj_code} — `
                                                : ''}
                                            {assignment.subj_name} ·{' '}
                                            {assignment.gr_level} /{' '}
                                            {assignment.sect_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {selected ? (
                            <div className="flex items-end">
                                <div className="rounded-lg border border-dashed bg-muted/30 px-3 py-2 text-sm">
                                    <span className="font-medium">
                                        {selected.subj_name}
                                    </span>
                                    <span className="text-muted-foreground">
                                        {' '}
                                        · {selected.gr_level} /{' '}
                                        {selected.sect_name}
                                    </span>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {message ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {message}
                        </p>
                    ) : null}
                </div>

                {assignments.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        No subjects are scheduled for you yet. Ask an admin to
                        assign your class schedule.
                    </div>
                ) : !selected ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        Select a subject and section above to start verifying.
                    </div>
                ) : rows.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
                        No absent students to verify for this subject on this
                        date.
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div className="w-full max-w-md space-y-1.5">
                                <Label htmlFor="verify-name-search">
                                    Search by name
                                </Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        id="verify-name-search"
                                        type="search"
                                        placeholder="Last name, first name…"
                                        value={nameSearch}
                                        onChange={(e) =>
                                            setNameSearch(e.target.value)
                                        }
                                        autoComplete="off"
                                        className="h-9 pl-9"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                <span className="mr-1 font-medium text-muted-foreground">
                                    Selected:
                                </span>
                                {STATUS_OPTIONS.map((opt) => (
                                    <span
                                        key={opt.value}
                                        className={cn(
                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold tabular-nums',
                                            opt.pillClass,
                                        )}
                                    >
                                        <span>{pendingCounts[opt.value]}</span>
                                        <span>{opt.label}</span>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {filteredRows.length === 0 ? (
                            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                No learners match “{nameSearch.trim()}”. Clear
                                the search to see everyone.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
                                <table className="w-full min-w-[780px] text-sm">
                                    <thead>
                                        <tr className="border-b bg-muted/70 text-left text-foreground/70">
                                            <th className="px-3 py-2.5 font-medium">
                                                LRN
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Name
                                            </th>
                                            <th className="px-3 py-2.5 font-medium">
                                                Grade / Section
                                            </th>
                                            {STATUS_OPTIONS.map((opt) => {
                                                const matchedCount =
                                                    filteredRows.filter(
                                                        (r) =>
                                                            r.status ===
                                                            opt.value,
                                                    ).length;
                                                const checkedState:
                                                    | boolean
                                                    | 'indeterminate' =
                                                    matchedCount === 0
                                                        ? false
                                                        : matchedCount ===
                                                            filteredRows.length
                                                          ? true
                                                          : 'indeterminate';

                                                return (
                                                    <th
                                                        key={opt.value}
                                                        className="px-3 py-2.5 text-center font-medium"
                                                    >
                                                        <label
                                                            title={`Select all shown students as ${opt.label}`}
                                                            className="inline-flex cursor-pointer items-center justify-center gap-1.5 select-none"
                                                        >
                                                            <Checkbox
                                                                checked={
                                                                    checkedState
                                                                }
                                                                onCheckedChange={() =>
                                                                    setStatusForVisible(
                                                                        opt.value,
                                                                    )
                                                                }
                                                                aria-label={`Select all shown students as ${opt.label}`}
                                                                className={cn(
                                                                    'cursor-pointer',
                                                                    opt.checkboxClass,
                                                                )}
                                                            />
                                                            <span
                                                                className={cn(
                                                                    'text-xs font-semibold',
                                                                    opt.headerTextClass,
                                                                )}
                                                            >
                                                                {opt.label}
                                                            </span>
                                                        </label>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.map((r) => (
                                            <tr
                                                key={r.stu_id}
                                                className="border-b transition-colors hover:bg-muted/30 last:border-0"
                                            >
                                                <td className="px-3 py-2.5 font-mono text-xs tabular-nums">
                                                    {formatLrn(r.lrn)}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    <span className="font-medium">
                                                        {r.stu_lname},{' '}
                                                        {r.stu_fname}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2.5 text-muted-foreground">
                                                    {r.gr_level} / {r.sect}
                                                </td>
                                                {STATUS_OPTIONS.map((opt) => {
                                                    const isSelected =
                                                        r.status === opt.value;
                                                    return (
                                                        <td
                                                            key={opt.value}
                                                            className="px-3 py-2.5 text-center"
                                                        >
                                                            <div className="flex items-center justify-center">
                                                                <Checkbox
                                                                    checked={
                                                                        isSelected
                                                                    }
                                                                    onCheckedChange={() =>
                                                                        setStatus(
                                                                            r.stu_id,
                                                                            opt.value,
                                                                        )
                                                                    }
                                                                    aria-label={`Mark ${r.stu_lname}, ${r.stu_fname} as ${opt.label}`}
                                                                    className={cn(
                                                                        'size-4.5 cursor-pointer',
                                                                        opt.checkboxClass,
                                                                    )}
                                                                />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {selected && rows.length > 0 ? (
                    <div className="flex flex-wrap items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={submitting}
                            onClick={() =>
                                router.visit(
                                    teacher.verification.index.url({
                                        query: {
                                            date,
                                            subj_id: String(selected.subj_id),
                                            sect_id: String(selected.sect_id),
                                        },
                                    }),
                                )
                            }
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={submitting}
                            onClick={() => void submit()}
                        >
                            {submitting
                                ? 'Saving…'
                                : 'Confirm verification'}
                        </Button>
                    </div>
                ) : null}
            </div>
        </TeacherLayout>
    );
}
