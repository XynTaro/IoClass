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

const STATUS_OPTIONS = [
    { value: 'absent', label: 'Absent' },
    { value: 'excused', label: 'Excused' },
    { value: 'present', label: 'Present (manual)' },
    { value: 'late', label: 'Late (manual)' },
] as const;

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

    const [rows, setRows] = useState<
        Array<VerificationRow & { status: string }>
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

    const setStatus = (stuId: number, status: string) => {
        setRows((prev) =>
            prev.map((r) => (r.stu_id === stuId ? { ...r, status } : r)),
        );
    };

    const navigate = (next: {
        date?: string;
        subj_id?: number | null;
        sect_id?: number | null;
    }) => {
        const query: Record<string, string> = {};
        const nextDate = next.date ?? selectedDate;
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
                {/* Page Header — matches My Schedule & My Attendance style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                Subject Verification
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Verify attendance for students in a subject you teach. Confirm absences or mark excused, present, or late.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
                            <ShieldCheck className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
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
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                navigate({ date: e.target.value });
                            }}
                            className="h-9"
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
                        <div className="max-w-md space-y-1.5">
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

                        {filteredRows.length === 0 ? (
                            <p className="rounded-xl border border-dashed py-8 text-center text-sm text-muted-foreground">
                                No learners match “{nameSearch.trim()}”. Clear
                                the search to see everyone.
                            </p>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border bg-background shadow-sm">
                                <table className="w-full min-w-[720px] text-sm">
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
                                            <th className="px-3 py-2.5 font-medium">
                                                Set status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRows.map((r) => (
                                            <tr
                                                key={r.stu_id}
                                                className="border-b last:border-0"
                                            >
                                                <td className="px-3 py-2 font-mono text-xs tabular-nums">
                                                    {formatLrn(r.lrn)}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="font-medium">
                                                        {r.stu_lname},{' '}
                                                        {r.stu_fname}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-muted-foreground">
                                                    {r.gr_level} / {r.sect}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <select
                                                        className="w-full max-w-52 rounded-md border border-input bg-background px-2 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        value={r.status}
                                                        onChange={(e) =>
                                                            setStatus(
                                                                r.stu_id,
                                                                e.target.value,
                                                            )
                                                        }
                                                    >
                                                        {STATUS_OPTIONS.map(
                                                            (o) => (
                                                                <option
                                                                    key={
                                                                        o.value
                                                                    }
                                                                    value={
                                                                        o.value
                                                                    }
                                                                >
                                                                    {o.label}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                </td>
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
