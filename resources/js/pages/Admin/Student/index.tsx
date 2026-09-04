import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, ArrowDownCircle, ArrowUpCircle, RotateCcw, Trash2, UserPlus, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IoMdAdd, IoMdCreate, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DataTable } from '@/components/DataTable';
import StudentModal, { type SectionOption, type Student } from '@/components/StudentModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { invalidateRfidRegistryCache } from '@/hooks/use-rfid-registry';
import AdminLayout from '@/layouts/admin/admin-layout';
import { archiveRowButtonClassName, archiveModalConfirmClassName } from '@/lib/archive-ui';
import { cn } from '@/lib/utils';

export default function Index() {
    const {
        students,
        archived = false,
        sections = [],
        activeSchoolYear = null,
        promotedSectionIds = [],
    } = usePage<{
        students: any;
        archived: boolean;
        sections: SectionOption[];
        activeSchoolYear: { sy_id: number; sy_label: string } | null;
        promotedSectionIds: number[];
    }>().props;

    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [choiceOpen, setChoiceOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [promoteOpen, setPromoteOpen] = useState(false);
    const [fromSectId, setFromSectId] = useState<number | ''>('');
    const [toSectId, setToSectId] = useState<number | ''>('');
    const [promoting, setPromoting] = useState(false);
    const [promoteErrors, setPromoteErrors] = useState<Record<string, string>>({});
    const [search, setSearch] = useState('');

    const [studentList, setStudentList] = useState<Student[]>(
        students?.data ?? [],
    );

    useEffect(() => {
        setStudentList(students?.data ?? []);
    }, [students]);

    const filteredStudents = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return studentList;
        return studentList.filter((s) => {
            const haystack = [
                s.lrn ?? '',
                s.stu_fname ?? '',
                s.stu_mname ?? '',
                s.stu_lname ?? '',
                s.gender ?? '',
                s.gr_level ?? '',
                s.sect ?? '',
                s.rfid_uid ?? '',
                s.status ?? '',
            ]
                .join(' ')
                .toLowerCase();
            return haystack.includes(q);
        });
    }, [search, studentList]);

    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<Student | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [itemToRestore, setItemToRestore] = useState<Student | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleSaveSuccess = () => {
        invalidateRfidRegistryCache();
        router.reload();
        setEditOpen(false);
        setAddOpen(false);
        setSelectedStudent(null);
    };

    const handleArchiveClick = (student: Student) => {
        setItemToArchive(student);
        setArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = () => {
        if (!itemToArchive) return;
        setIsArchiving(true);
        router.delete(route('admin.student.destroy', { student: itemToArchive.stu_id }), {
            onSuccess: () => {
                setArchiveConfirmOpen(false);
                setItemToArchive(null);
                router.reload();
            },
            onFinish: () => setIsArchiving(false),
        });
    };

    const handleRestoreClick = (student: Student) => {
        setItemToRestore(student);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;
        setIsRestoring(true);
        router.post(
            route('admin.student.restore', { id: itemToRestore.stu_id }),
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



    const handlePromote = () => {
        if (!fromSectId || !toSectId) return;
        setPromoteErrors({});
        router.post(
            route('admin.student.promote'),
            { from_sect_id: fromSectId, to_sect_id: toSectId },
            {
                onStart: () => setPromoting(true),
                onFinish: () => setPromoting(false),
                onSuccess: () => {
                    setPromoteOpen(false);
                    setFromSectId('');
                    setToSectId('');
                    setPromoteErrors({});
                },
                onError: (errors) => setPromoteErrors(errors),
            },
        );
    };

    const sectionsByGrade = useMemo(() => {
        const map = new Map<string, SectionOption[]>();
        for (const s of sections) {
            if (!map.has(s.gr_level)) map.set(s.gr_level, []);
            map.get(s.gr_level)!.push(s);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
    }, [sections]);

    const nextGradeSections = useMemo(() => {
        if (!fromSectId) return [];
        const fromSection = sections.find((s) => s.sect_id === fromSectId);
        if (!fromSection) return [];
        const gradeOrder = sectionsByGrade.map(([grade]) => grade);
        const currentIdx = gradeOrder.indexOf(fromSection.gr_level);
        if (currentIdx === -1 || currentIdx === gradeOrder.length - 1) return [];
        const nextGrade = gradeOrder[currentIdx + 1];
        return sections.filter((s) => s.gr_level === nextGrade);
    }, [fromSectId, sections, sectionsByGrade]);

    const columns: ColumnDef<Student>[] = [
        {
            id: 'photo',
            header: '',
            cell: ({ row }) => {
                const s = row.original;
                const initials = `${s.stu_fname?.[0] ?? ''}${s.stu_lname?.[0] ?? ''}`.toUpperCase();
                return (
                    <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted font-bold text-xs text-muted-foreground shadow-xs">
                        {s.photo ? (
                            <img
                                src={`/storage/${s.photo}`}
                                alt={s.stu_fname}
                                className="size-full object-cover"
                            />
                        ) : (
                            <span>{initials || 'S'}</span>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: 'lrn',
            header: 'LRN',
            cell: ({ row }) => (
                <span className="font-mono text-xs tabular-nums">
                    {row.original.lrn ?? '—'}
                </span>
            ),
        },
        { accessorKey: 'stu_fname', header: 'First Name' },
        { accessorKey: 'stu_mname', header: 'Middle Name' },
        { accessorKey: 'stu_lname', header: 'Last Name' },
        {
            accessorKey: 'gender',
            header: 'Gender',
            cell: ({ row }) => {
                const isFemale = row.original.gender?.toLowerCase() === 'female';
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                            isFemale
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 rounded-full',
                                isFemale ? 'bg-rose-500' : 'bg-blue-500',
                            )}
                        />
                        {row.original.gender ? (isFemale ? 'Female' : 'Male') : '—'}
                    </span>
                );
            },
        },
        { accessorKey: 'gr_level', header: 'Grade' },
        { accessorKey: 'sect', header: 'Section' },
        {
            accessorKey: 'rfid_uid',
            header: 'RFID',
            cell: ({ row }) => (
                <span className="inline-block rounded-md border border-border/50 bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground/80">
                    {row.original.rfid_uid || '—'}
                </span>
            ),
        },
        {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const isActive = row.original.status?.toLowerCase() === 'active';
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                            isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 rounded-full',
                                isActive ? 'bg-emerald-500' : 'bg-red-500',
                            )}
                        />
                        {row.original.status ?? '—'}
                    </span>
                );
            },
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
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedStudent(row.original);
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
            <Head title={archived ? 'Archived Students' : 'Students Management'} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {archived ? 'Archived Students' : 'Students Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {archived
                                    ? 'View and manage soft-deleted student records.'
                                    : 'Manage enrolled student profiles, sections, and RFID cards.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {activeSchoolYear && (
                                <span className="inline-flex items-center rounded-lg border border-emerald-500/15 bg-background/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 backdrop-blur-sm dark:text-emerald-300">
                                    SY: {activeSchoolYear.sy_label}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {studentList.length} {archived ? 'Archived' : 'Students'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Table Card ── */}
                <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                    <CardHeader className="border-b border-border/50 pb-4 pt-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative w-full sm:w-72">
                                <IoMdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, LRN, or RFID..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={
                                        archived
                                            ? route('admin.student.index')
                                            : route('admin.student.index', { archived: 1 })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                >
                                    <Archive className="h-3.5 w-3.5" />
                                    {archived ? 'Back to Active' : 'View Archived'}
                                </Link>
                                {!archived && (
                                    <Button
                                        onClick={() => setChoiceOpen(true)}
                                        className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                    >
                                        <IoMdAdd className="size-4" />
                                        ADD STUDENT
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredStudents} />
                        </div>
                        {/* Pagination */}
                        {students?.links && students.links.length > 0 && (
                            <div className="flex items-center justify-end space-x-2 border-t border-border/50 px-4 py-3">
                                {students.links.map((link: any, index: number) => (
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

            {/* Action choice dialog */}
            <Dialog open={choiceOpen} onOpenChange={setChoiceOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            What would you like to do?
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground">
                            Choose an action to manage your students.
                        </p>
                    </DialogHeader>

                    <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                            type="button"
                            onClick={() => {
                                setChoiceOpen(false);
                                setAddOpen(true);
                            }}
                            className="group flex flex-col items-center gap-3 rounded-lg border-2 border-transparent bg-muted/50 p-5 text-center transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/20">
                                <UserPlus className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="font-semibold text-foreground">
                                    Add New Student
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Enroll a brand-new student into the system.
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setChoiceOpen(false);
                                setPromoteOpen(true);
                            }}
                            className="group flex flex-col items-center gap-3 rounded-lg border-2 border-transparent bg-muted/50 p-5 text-center transition hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition group-hover:bg-primary/20">
                                <ArrowUpCircle className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="font-semibold text-foreground">
                                    Promote Students
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    Move students up to the next grade level.
                                </p>
                            </div>
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Promote modal */}
            <Dialog
                open={promoteOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        setFromSectId('');
                        setToSectId('');
                        setPromoteErrors({});
                    }
                    setPromoteOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            Promote Students
                        </DialogTitle>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">
                                All active students in the selected section will be enrolled into the target section.
                            </p>
                            {activeSchoolYear && (
                                <p className="text-xs font-medium text-primary">
                                    School Year: {activeSchoolYear.sy_label}
                                </p>
                            )}
                        </div>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* From section */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                                From section
                            </label>
                            <select
                                value={fromSectId}
                                onChange={(e) => {
                                    setFromSectId(e.target.value ? Number(e.target.value) : '');
                                    setToSectId('');
                                    setPromoteErrors({});
                                }}
                                className={`h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm ${promoteErrors.from_sect_id ? 'border-red-500' : ''}`}
                            >
                                <option value="">Select source section…</option>
                                {sectionsByGrade.map(([grade, sects]) => (
                                    <optgroup key={grade} label={grade}>
                                        {sects.map((s) => {
                                            const isPromoted = promotedSectionIds.includes(s.sect_id);
                                            return (
                                                <option
                                                    key={s.sect_id}
                                                    value={s.sect_id}
                                                    disabled={isPromoted}
                                                >
                                                    {s.sect_name}
                                                    {isPromoted ? ' (already promoted)' : ''}
                                                </option>
                                            );
                                        })}
                                    </optgroup>
                                ))}
                            </select>
                            {promoteErrors.from_sect_id && (
                                <p className="text-xs text-red-600">{promoteErrors.from_sect_id}</p>
                            )}
                        </div>

                        {/* Arrow */}
                        <div className="flex justify-center">
                            <ArrowDownCircle className="h-6 w-6 text-muted-foreground" />
                        </div>

                        {/* To section */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                                To section
                            </label>
                            <select
                                value={toSectId}
                                onChange={(e) => setToSectId(e.target.value ? Number(e.target.value) : '')}
                                disabled={!fromSectId || nextGradeSections.length === 0}
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="">
                                    {!fromSectId
                                        ? 'Select source section first…'
                                        : nextGradeSections.length === 0
                                          ? 'No higher grade available'
                                          : 'Select target section…'}
                                </option>
                                {nextGradeSections.map((s) => (
                                    <option key={s.sect_id} value={s.sect_id}>
                                        {s.sect_name}
                                    </option>
                                ))}
                            </select>
                            {fromSectId && nextGradeSections.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Showing sections for{' '}
                                    <span className="font-medium">
                                        {nextGradeSections[0].gr_level}
                                    </span>
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPromoteOpen(false)}
                            disabled={promoting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handlePromote}
                            disabled={!fromSectId || !toSectId || promoting}
                        >
                            <ArrowUpCircle className="mr-2 h-4 w-4" />
                            {promoting ? 'Promoting…' : 'Promote students'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Student modals */}
            <StudentModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={handleSaveSuccess}
                mode="create"
                sections={sections}
            />
            <StudentModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={handleSaveSuccess}
                student={selectedStudent ?? undefined}
                mode="edit"
                sections={sections}
            />

            <ConfirmationModal
                isOpen={archiveConfirmOpen}
                onClose={() => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                }}
                onConfirm={handleConfirmArchive}
                title="Archive Student"
                description={
                    itemToArchive
                        ? `Are you sure you want to archive student ${itemToArchive.stu_fname} ${itemToArchive.stu_lname}? This will temporarily remove them from active sections.`
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
                title="Restore Student"
                description={
                    itemToRestore
                        ? `Are you sure you want to restore student ${itemToRestore.stu_fname} ${itemToRestore.stu_lname}?`
                        : ''
                }
                type="restore"
                isLoading={isRestoring}
            />
        </AdminLayout>
    );
}
