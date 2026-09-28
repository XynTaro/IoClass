import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, BookOpen, Eye, Filter, RotateCcw, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IoMdAdd, IoMdCreate, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DataTable } from '@/components/DataTable';
import SubjectModal from '@/components/SubjectModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin/admin-layout';
import { archiveRowButtonClassName, archiveModalConfirmClassName } from '@/lib/archive-ui';
import { cn } from '@/lib/utils';

interface Subject {
    subj_id: number;
    subj_code: string | null;
    subj_name: string | null;
    gr_level: string | null;
}

export default function Index() {
    const {
        subjects,
        archived = false,
        gradeLevels = [],
        filters = {},
    } = usePage<any>().props as {
        subjects: any;
        archived: boolean;
        gradeLevels: string[];
        filters?: {
            gradeLevel?: string;
        };
    };

    const [subjectList, setSubjectList] = useState<Subject[]>(subjects?.data ?? []);
    const [selectedGrade, setSelectedGrade] = useState<string>(filters?.gradeLevel ?? 'all');
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<Subject | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [itemToRestore, setItemToRestore] = useState<Subject | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        setSubjectList(subjects?.data ?? []);
    }, [subjects]);

    useEffect(() => {
        if (filters?.gradeLevel !== undefined) {
            setSelectedGrade(filters.gradeLevel);
        }
    }, [filters?.gradeLevel]);

    const sortedGradeLevels = useMemo(() => {
        const unique = new Set([
            ...gradeLevels,
            ...(subjectList.map((s) => s.gr_level).filter(Boolean) as string[]),
            'Grade 7',
            'Grade 8',
            'Grade 9',
            'Grade 10',
            'Grade 11',
            'Grade 12',
        ]);
        return Array.from(unique).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true }),
        );
    }, [gradeLevels, subjectList]);

    const filteredSubjects = useMemo(() => {
        let list = subjectList;
        if (selectedGrade && selectedGrade !== 'all') {
            list = list.filter((s) => s.gr_level === selectedGrade);
        }
        const q = search.trim().toLowerCase();
        if (!q) return list;
        return list.filter((s) =>
            [s.subj_code ?? '', s.subj_name ?? '', s.gr_level ?? ''].join(' ').toLowerCase().includes(q),
        );
    }, [search, selectedGrade, subjectList]);

    const handleGradeChange = (value: string) => {
        setSelectedGrade(value);
        router.get(
            route('admin.subject.index'),
            {
                ...(archived ? { archived: 1 } : {}),
                ...(value && value !== 'all' ? { gradeLevel: value } : {}),
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    const handleSaveSuccess = () => {
        router.reload();
        setAddOpen(false);
        setEditOpen(false);
        setSelectedSubject(null);
    };

    const handleArchiveClick = (subject: Subject) => {
        setItemToArchive(subject);
        setArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = () => {
        if (!itemToArchive) return;
        setIsArchiving(true);
        router.delete(route('admin.subject.destroy', { subject: itemToArchive.subj_id }), {
            onSuccess: () => {
                setArchiveConfirmOpen(false);
                setItemToArchive(null);
                router.reload();
            },
            onFinish: () => setIsArchiving(false),
        });
    };

    const handleRestoreClick = (subject: Subject) => {
        setItemToRestore(subject);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;
        setIsRestoring(true);
        router.post(
            route('admin.subject.restore', { id: itemToRestore.subj_id }),
            {},
            {
                onSuccess: () => {
                    setRestoreConfirmOpen(false);
                    setItemToRestore(null);
                    router.reload();
                },
                onFinish: () => setIsRestoring(false),
            },
        );
    };



    const columns: ColumnDef<Subject>[] = [
        {
            accessorKey: 'subj_code',
            header: 'Code',
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums">
                    {row.original.subj_code ?? '—'}
                </span>
            ),
        },
        {
            accessorKey: 'subj_name',
            header: 'Subject Name',
            cell: ({ row }) => row.original.subj_name ?? '—',
        },
        {
            accessorKey: 'gr_level',
            header: 'Grade Level',
            cell: ({ row }) =>
                row.original.gr_level ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {row.original.gr_level}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    {archived ? (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreClick(row.original)}
                            >
                                <RotateCcw className="h-4 w-4" />
                                Restore
                            </Button>
                        </>
                    ) : (
                        <>
                            <Link
                                href={route('admin.subject.show', { id: row.original.subj_id })}
                            >
                                <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4" />
                                    View
                                </Button>
                            </Link>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedSubject(row.original);
                                    setEditOpen(true);
                                }}
                            >
                                <IoMdCreate className="h-4 w-4" />
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                className={cn(archiveRowButtonClassName)}
                                onClick={() => handleArchiveClick(row.original)}
                            >
                                <Archive className="h-4 w-4" />
                                Archive
                            </Button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AdminLayout>
            <Head title={archived ? 'Archived Subjects' : 'Subjects'} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {archived ? 'Archived Subjects' : 'Subjects Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {archived
                                    ? 'View and manage soft-deleted academic subject records.'
                                    : 'Manage academic subject descriptions, codes, and grade-level requirements.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <BookOpen className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {subjects?.total ?? subjectList.length} {archived ? 'Archived' : 'Subjects'}
                            </span>
                            {selectedGrade && selectedGrade !== 'all' && (
                                <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                    {selectedGrade}
                                    <button
                                        type="button"
                                        onClick={() => handleGradeChange('all')}
                                        className="ml-1 rounded p-0.5 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 cursor-pointer"
                                        title="Clear filter"
                                    >
                                        <X className="size-3" />
                                    </button>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Table Card ── */}
                <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/50 pb-4 pt-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
                                <div className="relative w-full sm:w-64">
                                    <IoMdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Search by code or name..."
                                        className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="w-full sm:w-48">
                                    <Select value={selectedGrade} onValueChange={handleGradeChange}>
                                        <SelectTrigger className="h-9 w-full rounded-xl border-border/60 bg-muted/30 text-xs font-medium focus:ring-1 focus:ring-emerald-500">
                                            <div className="flex items-center gap-1.5 truncate">
                                                <Filter className="size-3.5 text-muted-foreground shrink-0" />
                                                <SelectValue placeholder="All Grade Levels" />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="all" className="text-xs">
                                                All Grade Levels
                                            </SelectItem>
                                            {sortedGradeLevels.map((grade) => (
                                                <SelectItem key={grade} value={grade} className="text-xs">
                                                    {grade}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {selectedGrade && selectedGrade !== 'all' && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleGradeChange('all')}
                                        className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                        title="Clear grade filter"
                                    >
                                        <X className="mr-1 size-3.5" />
                                        Clear filter
                                    </Button>
                                )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={
                                        archived
                                            ? route('admin.subject.index', {
                                                  ...(selectedGrade && selectedGrade !== 'all' ? { gradeLevel: selectedGrade } : {}),
                                              })
                                            : route('admin.subject.index', {
                                                  archived: 1,
                                                  ...(selectedGrade && selectedGrade !== 'all' ? { gradeLevel: selectedGrade } : {}),
                                              })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                >
                                    <Archive className="h-3.5 w-3.5" />
                                    {archived ? 'Back to Active' : 'View Archived'}
                                </Link>
                                {!archived && (
                                    <Button
                                        onClick={() => setAddOpen(true)}
                                        className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 cursor-pointer"
                                    >
                                        <IoMdAdd className="size-4" />
                                        ADD SUBJECT
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredSubjects} />
                        </div>
                        {/* Pagination */}
                        {subjects?.links && subjects.links.length > 0 && (
                            <div className="flex items-center justify-end space-x-2 border-t border-border/50 px-4 py-3">
                                {subjects.links.map((link: any, index: number) => (
                                    <Link
                                        key={index}
                                        href={link.url || ''}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg border px-3 py-1 text-xs font-medium ${
                                            link.active
                                                ? 'bg-emerald-600 text-white border-emerald-600'
                                                : 'text-muted-foreground hover:bg-muted'
                                        } ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <SubjectModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={handleSaveSuccess}
                mode="create"
                storeRoute="admin.subject.store"
                updateRoute="admin.subject.update"
                gradeLevels={sortedGradeLevels}
            />
            <SubjectModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={handleSaveSuccess}
                subject={selectedSubject ?? undefined}
                mode="edit"
                storeRoute="admin.subject.store"
                updateRoute="admin.subject.update"
                gradeLevels={sortedGradeLevels}
            />

            <ConfirmationModal
                isOpen={archiveConfirmOpen}
                onClose={() => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                }}
                onConfirm={handleConfirmArchive}
                title="Archive Subject"
                description={
                    itemToArchive
                        ? `Are you sure you want to archive subject ${itemToArchive.subj_name} (${itemToArchive.subj_code})?`
                        : ''
                }
                type="archive"
                isLoading={isArchiving}
            />

            <ConfirmationModal
                isOpen={restoreConfirmOpen}
                onClose={() => {
                    setRestoreConfirmOpen(false);
                    setItemToRestore(null);
                }}
                onConfirm={handleConfirmRestore}
                title="Restore Subject"
                description={
                    itemToRestore
                        ? `Are you sure you want to restore subject ${itemToRestore.subj_name} (${itemToRestore.subj_code})?`
                        : ''
                }
                type="restore"
                isLoading={isRestoring}
            />
        </AdminLayout>
    );
}
