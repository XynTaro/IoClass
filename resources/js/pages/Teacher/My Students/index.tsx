import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import {
    Eye,
    Filter,
    GraduationCap,
    LayoutGrid,
    List,
    RefreshCw,
    Search,
    ShieldCheck,
    UserCheck,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import TeacherLayout from '@/layouts/teacher/teacher-layout';
import teacher from '@/routes/teacher';
import studentRecords from '@/routes/teacher/student-records';

type Status = 'active' | 'inactive';

interface Student {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_mname?: string | null;
    stu_lname: string;
    gender?: string | null;
    photo?: string | null;
    gr_level: string;
    sect: string;
    status: Status;
    attendance_count: number;
    is_advisory: boolean;
}

type SchoolYear = {
    sy_id: number;
    sy_label: string;
    is_active: boolean;
};

type PageProps = {
    students: {
        data: Student[];
        total?: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    schoolYears: SchoolYear[];
    filters: {
        q?: string | null;
        gradeLevel?: string | null;
        section?: string | null;
        status?: string | null;
        syId?: string | null;
    };
    gradeLevels: string[];
    sections: string[];
};

export default function TeacherStudentsIndex() {
    const { students, schoolYears, filters, gradeLevels, sections } =
        usePage<PageProps>().props;

    const [search, setSearch] = useState(filters?.q ?? '');
    const [gradeLevel, setGradeLevel] = useState<string>(
        filters?.gradeLevel ?? 'all',
    );
    const [section, setSection] = useState<string>(filters?.section ?? 'all');
    const [statusFilter, setStatusFilter] = useState<string>(
        filters?.status ?? 'all',
    );
    const [syId, setSyId] = useState<string>(filters?.syId ?? 'all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const isFilterActive =
        search !== '' ||
        gradeLevel !== 'all' ||
        section !== 'all' ||
        statusFilter !== 'all' ||
        syId !== 'all';

    function clearFilters() {
        setSearch('');
        setGradeLevel('all');
        setSection('all');
        setStatusFilter('all');
        setSyId('all');
        applyFilters({
            q: '',
            gradeLevel: 'all',
            section: 'all',
            status: 'all',
            syId: 'all',
        });
    }

    useEffect(() => {
        setSearch(filters?.q ?? '');
        setGradeLevel(filters?.gradeLevel ?? 'all');
        setSection(filters?.section ?? 'all');
        setStatusFilter(filters?.status ?? 'all');
        setSyId(filters?.syId ?? 'all');
    }, [
        filters?.q,
        filters?.gradeLevel,
        filters?.section,
        filters?.status,
        filters?.syId,
    ]);

    const list = students?.data ?? [];
    const advisoryCount = list.filter((s) => s.is_advisory).length;

    const columns: ColumnDef<Student>[] = [
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
                        <div className="flex flex-col">
                            <span className="font-medium text-foreground">
                                {first} {last}
                            </span>
                            {row.original.is_advisory && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                                    <ShieldCheck className="size-3" />
                                    Advisory Student
                                </span>
                            )}
                        </div>
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
                    <span className="font-medium text-muted-foreground">
                        {row.original.sect}
                    </span>
                    {row.original.is_advisory && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300">
                            Advisory
                        </span>
                    )}
                </div>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const status = row.original.status;
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${
                            status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400'
                                : 'bg-red-500/10 text-red-700 ring-red-500/20 dark:bg-red-500/15 dark:text-red-400'
                        }`}
                    >
                        <span
                            className={`size-1.5 rounded-full ${
                                status === 'active' ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                        />
                        {status}
                    </span>
                );
            },
        },
        {
            accessorKey: 'attendance_count',
            header: 'Days Attended',
            cell: ({ row }) => {
                const count = Number(row.original.attendance_count ?? 0);
                return (
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400">
                        <UserCheck className="size-3.5" />
                        {count} {count === 1 ? 'day' : 'days'}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: 'Logs',
            cell: ({ row }) => (
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 cursor-pointer shadow-xs"
                    onClick={() =>
                        router.visit(
                            studentRecords.show.url(row.original.stu_id),
                        )
                    }
                >
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    View Logs
                </Button>
            ),
        },
    ];

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

    function applyFilters(
        next?: Partial<{
            q: string;
            gradeLevel: string;
            section: string;
            status: string;
            syId: string;
        }>,
    ) {
        const q = (next?.q ?? search).trim();
        const nextGradeLevel = next?.gradeLevel ?? gradeLevel;
        const nextSection = next?.section ?? section;
        const nextStatus = next?.status ?? statusFilter;
        const nextSyId = next?.syId ?? syId;

        const query: Record<string, string> = {};

        if (q !== '') {
            query.q = q;
        }
        if (nextGradeLevel !== 'all') {
            query.gradeLevel = nextGradeLevel;
        }
        if (nextSection !== 'all') {
            query.section = nextSection;
        }
        if (nextStatus !== 'all') {
            query.status = nextStatus;
        }
        if (nextSyId !== 'all') {
            query.syId = nextSyId;
        }

        router.get(
            teacher.students.index.url({ query }),
            {},
            {
                preserveScroll: true,
                preserveState: true,
                replace: true,
            },
        );
    }

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

    return (
        <TeacherLayout>
            <Head title="My Students" />

            <div className="space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Page Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            My Students
                        </h1>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Masterlist for your advisory and subject classes with cumulative attendance counts and logbook access.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs">
                            <GraduationCap
                                className="size-3.5 shrink-0 text-blue-600 dark:text-blue-400"
                                aria-hidden
                            />
                            <span className="font-medium text-foreground">
                                {students.total ?? list.length} students total
                            </span>
                        </div>
                        {advisoryCount > 0 && (
                            <div className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-xs dark:bg-blue-500/15 dark:text-blue-300">
                                <ShieldCheck className="size-3.5 shrink-0" />
                                <span>{advisoryCount} in your advisory</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters Control Center */}
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <Filter className="size-4 text-primary" aria-hidden />
                            Filter Controls
                        </div>
                        <div className="flex items-center gap-2">
                            {isFilterActive && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
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
                                    className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                                    onClick={() => setViewMode('table')}
                                >
                                    <List className="size-3.5" />
                                    Table
                                </Button>
                                <Button
                                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                                    size="sm"
                                    className="h-7 px-2.5 text-xs gap-1 cursor-pointer"
                                    onClick={() => setViewMode('grid')}
                                >
                                    <LayoutGrid className="size-3.5" />
                                    Grid
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or LRN..."
                                className="h-9 pl-9 focus-visible:ring-1"
                            />
                        </div>

                        {/* School Year Select Dropdown */}
                        <div>
                            <Select
                                value={syId}
                                onValueChange={(v) => {
                                    setSyId(v);
                                    applyFilters({ syId: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="School Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All School Years</SelectItem>
                                    {schoolYears.map((sy) => (
                                        <SelectItem key={sy.sy_id} value={String(sy.sy_id)}>
                                            {sy.sy_label} {sy.is_active ? '(Active)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
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
                                    <SelectItem value="all">All grades</SelectItem>
                                    {gradeOptions.map((g) => (
                                        <SelectItem key={g} value={g}>
                                            {g}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
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
                                    <SelectItem value="all">All sections</SelectItem>
                                    {sectionOptions.map((sect) => (
                                        <SelectItem key={sect} value={sect}>
                                            {sect}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => {
                                    setStatusFilter(v);
                                    applyFilters({ status: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-full">
                                    <SelectValue placeholder="Enrollment Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
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
                            <p className="text-base font-semibold">No students found.</p>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Try adjusting the school year, grade level, section, or search query above.
                            </p>
                        </div>
                        {isFilterActive && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={clearFilters}
                                className="mt-2 text-xs font-medium cursor-pointer"
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
                    /* Card Grid View */
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {list.map((student) => {
                            const initials = `${student.stu_fname[0] ?? ''}${
                                student.stu_lname[0] ?? ''
                            }`.toUpperCase();
                            const isActive = student.status === 'active';

                            return (
                                <div
                                    key={student.stu_id}
                                    className={`flex flex-col items-center justify-between rounded-2xl border p-5 text-center shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${
                                        isActive
                                            ? 'border-emerald-200 dark:border-emerald-800/40 hover:border-emerald-500 bg-card hover:bg-emerald-500/[0.02]'
                                            : 'border-red-200 dark:border-red-800/40 hover:border-red-500 bg-card hover:bg-red-500/[0.02]'
                                    }`}
                                >
                                    <div className="flex flex-col items-center w-full">
                                        {/* Avatar with Status ring */}
                                        <div
                                            className={`relative mb-3 flex size-14 items-center justify-center rounded-full bg-background border text-sm font-bold text-primary dark:text-primary-foreground shadow-xs ring-4 ${
                                                isActive
                                                    ? 'ring-emerald-500/20'
                                                    : 'ring-red-500/20'
                                            }`}
                                        >
                                            {initials}
                                            <span
                                                className={`absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-background ${
                                                    isActive
                                                        ? 'bg-emerald-500'
                                                        : 'bg-red-500'
                                                }`}
                                            />
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
                                        {/* Grade & Section pill + Advisory indicator */}
                                        <div className="flex flex-wrap items-center justify-center gap-1">
                                            <div className="inline-flex items-center rounded-full bg-muted/80 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                                {student.gr_level} — {student.sect}
                                            </div>
                                            {student.is_advisory && (
                                                <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-300">
                                                    Advisory
                                                </span>
                                            )}
                                        </div>

                                        {/* Attendance count */}
                                        <div className="pt-2 border-t border-border/60">
                                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-emerald-700 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400">
                                                <UserCheck className="size-3" />
                                                {student.attendance_count}{' '}
                                                {student.attendance_count === 1
                                                    ? 'day'
                                                    : 'days'}{' '}
                                                attended
                                            </span>
                                        </div>

                                        {/* View Logs button */}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full gap-1.5 text-xs cursor-pointer shadow-xs"
                                            onClick={() =>
                                                router.visit(
                                                    studentRecords.show.url(
                                                        student.stu_id,
                                                    ),
                                                )
                                            }
                                        >
                                            <Eye className="size-3.5" />
                                            View Logs
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {students?.links && students.links.length > 1 && (
                    <div className="flex flex-wrap items-center justify-end gap-1.5 py-2">
                        {students.links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.url || ''}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                                    link.active
                                        ? 'border-primary bg-primary text-primary-foreground font-semibold'
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
