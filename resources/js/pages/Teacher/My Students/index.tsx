import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Search, LayoutGrid, List, RefreshCw, Users, UserCheck, UserX, Filter } from 'lucide-react';
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

type Status = 'active' | 'inactive';

interface Student {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_lname: string;
    gr_level: string;
    sect: string;
    status: Status;
}

type PageProps = {
    students: {
        data: Student[];
        total?: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    filters: { q?: string | null; gradeLevel?: string | null; section?: string | null };
    gradeLevels: string[];
    sections: string[];
};

export default function TeacherStudentsIndex() {
    const { students, filters, gradeLevels, sections } =
        usePage<PageProps>().props;

    const [search, setSearch] = useState(filters?.q ?? '');
    const [gradeLevel, setGradeLevel] = useState<string>(
        filters?.gradeLevel ?? 'all',
    );
    const [section, setSection] = useState<string>(filters?.section ?? 'all');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

    const isFilterActive =
        search !== '' ||
        gradeLevel !== 'all' ||
        section !== 'all';

    function clearFilters() {
        setSearch('');
        setGradeLevel('all');
        setSection('all');
        applyFilters({
            q: '',
            gradeLevel: 'all',
            section: 'all',
        });
    }

    useEffect(() => {
        setSearch(filters?.q ?? '');
        setGradeLevel(filters?.gradeLevel ?? 'all');
        setSection(filters?.section ?? 'all');
    }, [filters?.q, filters?.gradeLevel, filters?.section]);

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
                        <span className={`size-1.5 rounded-full ${status === 'active' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {status}
                    </span>
                );
            },
        },
    ];

    const list = students?.data ?? [];

    const sectionOptions = useMemo(
        () => (sections ?? []).slice().sort((a, b) => a.localeCompare(b)),
        [sections],
    );
    const gradeOptions = useMemo(
        () => (gradeLevels ?? []).slice().sort((a, b) => a.localeCompare(b)),
        [gradeLevels],
    );

    function applyFilters(
        next?: Partial<{ q: string; gradeLevel: string; section: string }>,
    ) {
        const q = (next?.q ?? search).trim();
        const nextGradeLevel = next?.gradeLevel ?? gradeLevel;
        const nextSection = next?.section ?? section;

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
                {/* Page Header — matches My Schedule & My Attendance style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                My Students
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                View students in your advisory and class sections.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
                            <Users className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                            <span className="font-medium text-foreground">
                                {students.total ?? list.length} students total
                            </span>
                        </div>
                    </div>
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
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                        <div className="relative">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or LRN..."
                                className="h-9 pl-9 focus-visible:ring-1"
                            />
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
                                Try adjusting the grade level, section, or search query filters above.
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
                                        <div className={`relative mb-3 flex size-14 items-center justify-center rounded-full bg-background border text-sm font-bold text-primary dark:text-primary-foreground shadow-xs ring-4 ${
                                            isActive ? 'ring-emerald-500/20' : 'ring-red-500/20'
                                        }`}>
                                            {initials}
                                            <span className={`absolute right-0 bottom-0 size-3.5 rounded-full border-2 border-background ${
                                                isActive ? 'bg-emerald-500' : 'bg-red-500'
                                            }`} />
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

                                        {/* Status */}
                                        <div className="flex flex-col gap-1.5 pt-2.5 border-t border-border/60">
                                            <span className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                                                isActive
                                                    ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                                                    : 'text-red-700 dark:text-red-400 bg-red-500/10'
                                            }`}>
                                                {student.status}
                                            </span>
                                        </div>
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
