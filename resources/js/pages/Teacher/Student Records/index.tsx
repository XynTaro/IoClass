import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Eye, Search, GraduationCap, UserCheck, Users } from 'lucide-react';
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
import studentRecords from '@/routes/teacher/student-records';

interface StudentRecord {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_lname: string;
    gr_level: string;
    sect: string;
    attendance_count: number;
}

type Subject = { subj_id: number; subj_code: string; subj_name: string };
type SchoolYear = { sy_id: number; sy_label: string; is_active: boolean };

type PageProps = {
    students: {
        data: StudentRecord[];
        links: { url: string | null; label: string; active: boolean }[];
    };
    subjects: Subject[];
    schoolYears: SchoolYear[];
    filters: {
        q?: string | null;
        gradeLevel?: string | null;
        section?: string | null;
        syId?: string | null;
        date?: string | null;
    };
    gradeLevels: string[];
    sections: string[];
};

export default function TeacherStudentRecords() {
    const { students, subjects, schoolYears, filters, gradeLevels, sections } =
        usePage<PageProps>().props;

    const [search, setSearch] = useState(filters?.q ?? '');
    const [gradeLevel, setGradeLevel] = useState<string>(
        filters?.gradeLevel ?? 'all',
    );
    const [section, setSection] = useState<string>(filters?.section ?? 'all');
    const [syId, setSyId] = useState<string>(filters?.syId ?? 'all');
    const [date, setDate] = useState<string>(filters?.date ?? '');

    useEffect(() => {
        setSearch(filters?.q ?? '');
        setGradeLevel(filters?.gradeLevel ?? 'all');
        setSection(filters?.section ?? 'all');
        setSyId(filters?.syId ?? 'all');
        setDate(filters?.date ?? '');
    }, [filters?.q, filters?.gradeLevel, filters?.section, filters?.syId, filters?.date]);

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
        next?: Partial<{ q: string; gradeLevel: string; section: string; syId: string; date: string }>,
    ) {
        const q = (next?.q ?? search).trim();
        const nextGradeLevel = next?.gradeLevel ?? gradeLevel;
        const nextSection = next?.section ?? section;
        const nextSyId = next?.syId ?? syId;
        const nextDate = next?.date ?? date;

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
        if (nextSyId !== 'all') {
            query.syId = nextSyId;
        }
        if (nextDate !== '') {
            query.date = nextDate;
        }

        router.get(
            studentRecords.index.url({ query }),
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



    const columns: ColumnDef<StudentRecord>[] = [
        {
            accessorKey: 'lrn',
            header: 'LRN',
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums bg-muted px-2 py-0.5 rounded text-muted-foreground border">
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
            id: 'gradeSection',
            header: 'Grade & Section',
            cell: ({ row }) => (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400 px-2.5 py-0.5 rounded-full font-medium ring-1 ring-blue-500/10">
                    {row.original.gr_level} — {row.original.sect}
                </span>
            ),
        },
        {
            accessorKey: 'attendance_count',
            header: 'Attendance Count',
            cell: ({ row }) => {
                const count = Number(row.original.attendance_count ?? 0);
                return (
                    <span className="inline-flex items-center gap-1.5 font-semibold tabular-nums text-foreground bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 px-2.5 py-0.5 rounded-md">
                        <UserCheck className="size-3.5" />
                        {count} {count === 1 ? 'day' : 'days'}
                    </span>
                );
            },
        },
        {
            id: 'actions',
            header: 'Action',
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

    return (
        <TeacherLayout>
            <Head title="Student Records" />

            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* Page Header — matches My Schedule & My Attendance style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                Student Records
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Track student attendance counts and view individual detailed logs for your classes.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
                            <Users className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                            <span className="font-medium text-foreground">
                                {list.length} students total
                            </span>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-card p-4 shadow-xs space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="relative w-full md:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or LRN..."
                                className="h-9 rounded-md border bg-background pl-9 text-sm shadow-xs focus-visible:ring-1"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* School Year Select Dropdown */}
                            <Select
                                value={syId}
                                onValueChange={(v) => {
                                    setSyId(v);
                                    applyFilters({ syId: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-[150px]">
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

                            {/* Calendar Picker Filter */}
                            <Input
                                type="date"
                                value={date}
                                onChange={(e) => {
                                    const nextDate = e.target.value;
                                    setDate(nextDate);
                                    applyFilters({ date: nextDate });
                                }}
                                className="h-9 w-[150px] cursor-pointer"
                            />

                            {/* Grade Level Select */}
                            <Select
                                value={gradeLevel}
                                onValueChange={(v) => {
                                    setGradeLevel(v);
                                    applyFilters({ gradeLevel: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-[130px]">
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

                            {/* Section Select */}
                            <Select
                                value={section}
                                onValueChange={(v) => {
                                    setSection(v);
                                    applyFilters({ section: v });
                                }}
                            >
                                <SelectTrigger className="h-9 w-[130px]">
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

                            {/* Clear Filters Button */}
                            {(search || gradeLevel !== 'all' || section !== 'all' || syId !== 'all' || date) && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearch('');
                                        setGradeLevel('all');
                                        setSection('all');
                                        setSyId('all');
                                        setDate('');
                                        applyFilters({
                                            q: '',
                                            gradeLevel: 'all',
                                            section: 'all',
                                            syId: 'all',
                                            date: '',
                                        });
                                    }}
                                    className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5 cursor-pointer"
                                >
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </div>

                    {list.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-12 text-center bg-muted/20">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                                <GraduationCap className="size-6" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold">No student records found</p>
                                <p className="text-xs text-muted-foreground">
                                    Try adjusting your filters or search terms.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                            <DataTable columns={columns} data={list} />
                        </div>
                    )}

                    {students?.links && students.links.length > 1 && (
                        <div className="flex flex-wrap items-center justify-end gap-1.5 py-2">
                            {students.links.map((link, index) => (
                                <Link
                                    key={index}
                                    href={link.url || ''}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={`rounded-md border px-3 py-1.5 text-xs transition-colors ${
                                        link.active ? 'border-primary bg-primary text-primary-foreground font-semibold' : 'hover:bg-muted'
                                    } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </TeacherLayout>
    );
}
