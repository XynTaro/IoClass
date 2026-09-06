import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, GraduationCap, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IoMdAdd, IoMdCreate, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DataTable } from '@/components/DataTable';
import TeacherModal from '@/components/TeacherModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { invalidateRfidRegistryCache } from '@/hooks/use-rfid-registry';
import AdminLayout from '@/layouts/admin/admin-layout';
import { archiveRowButtonClassName, archiveModalConfirmClassName } from '@/lib/archive-ui';
import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive';

interface Teacher {
    tch_id: number;
    tch_rfid_uid?: string | null;
    master_card?: string | null;
    tch_fname: string;
    tch_mname?: string | null;
    tch_lname: string;
    tch_email: string;
    status: Status | null;
    avatar?: string | null;
}

export default function Index() {
    const { teachers, archived = false, sections = [], rooms = [], subjects = [] } = usePage<any>().props;
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(
        null,
    );
    const [editOpen, setEditOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);

    // Local state for teachers to update frontend table
    const [teacherList, setTeacherList] = useState<Teacher[]>(
        teachers.data ?? [],
    );
    const [search, setSearch] = useState('');

    // Update teacherList when teachers prop changes (e.g., after reload)
    useEffect(() => {
        setTeacherList(teachers.data ?? []);
    }, [teachers]);

    const filteredTeachers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return teacherList;

        return teacherList.filter((t) => {
            const haystack = [
                t.tch_fname ?? '',
                t.tch_mname ?? '',
                t.tch_lname ?? '',
                t.tch_email ?? '',
                t.tch_rfid_uid ?? '',
                t.master_card ?? '',
                t.status ?? '',
            ]
                .join(' ')
                .toLowerCase();

            return haystack.includes(q);
        });
    }, [search, teacherList]);

    // Handle successful save (create or edit) - AUTO RELOAD FUNCTIONALITY
    const handleSaveSuccess = () => {
        invalidateRfidRegistryCache();
        console.log('Save successful, reloading data...');

        // Option 1: Simple reload of the current page
        router.reload();

        // OR Option 2: If you want to be more specific (but check your Inertia version)
        // router.visit(window.location.pathname, {
        //     only: ['teachers'],
        //     preserveScroll: true,
        // });

        // Close modals
        setEditOpen(false);
        setAddOpen(false);
        setSelectedTeacher(null);
    };

    // Open add modal
    const handleAdd = () => setAddOpen(true);

    // Open edit modal
    const handleEdit = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setEditOpen(true);
    };

    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<Teacher | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [itemToRestore, setItemToRestore] = useState<Teacher | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    const handleArchiveClick = (teacher: Teacher) => {
        setItemToArchive(teacher);
        setArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = () => {
        if (!itemToArchive) return;
        setIsArchiving(true);
        router.delete(
            route('admin.teacher.destroy', { teacher: itemToArchive.tch_id }),
            {
                onSuccess: () => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                    router.reload();
                },
                onFinish: () => setIsArchiving(false),
            },
        );
    };

    const handleRestoreClick = (teacher: Teacher) => {
        setItemToRestore(teacher);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;
        setIsRestoring(true);
        router.post(
            route('admin.teacher.restore', { id: itemToRestore.tch_id }),
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

    const columns: ColumnDef<Teacher>[] = [
        {
            accessorKey: 'profile',
            header: 'Profile',
            cell: ({ row }) => {
                const teacher = row.original;
                const initials = `${teacher.tch_fname?.[0] ?? ''}${teacher.tch_lname?.[0] ?? ''}`.toUpperCase() || 'T';
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-full border border-border bg-muted">
                            <AvatarImage src={teacher.avatar} alt={teacher.tch_fname} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                            {teacher.tch_fname} {teacher.tch_mname ? `${teacher.tch_mname} ` : ''}{teacher.tch_lname}
                        </span>
                    </div>
                );
            }
        },
        { accessorKey: 'tch_email', header: 'Email' },
        {
            accessorKey: 'tch_rfid_uid',
            header: 'RFID',
            cell: ({ row }) => (
                <span className="inline-block rounded-md border border-border/50 bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground/80">
                    {row.original.tch_rfid_uid || '—'}
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
            accessorKey: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex space-x-2">
                    {archived ? (
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRestoreClick(row.original)}
                            >
                                <RotateCcw className="h-4 w-4" />
                                Restore
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(row.original)}
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
            <Head title={archived ? 'Archived Teachers' : 'Teachers Management'} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-blue-500/[0.08] via-indigo-500/[0.05] to-transparent p-5 dark:from-blue-500/[0.12] dark:via-indigo-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {archived ? 'Archived Teachers' : 'Teachers Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {archived
                                    ? 'View and restore archived faculty accounts.'
                                    : 'Manage active teacher profiles, assigned schedules, and RFID badges.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <GraduationCap className="size-3.5 text-blue-500" />
                                {teacherList.length} {archived ? 'Archived' : 'Faculty Members'}
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
                                    placeholder="Search by name, email, or RFID..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={
                                        archived
                                            ? route('admin.teacher.index')
                                            : route('admin.teacher.index', {
                                                archived: 1,
                                            })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                >
                                    <Archive className="h-3.5 w-3.5" />
                                    {archived ? 'Back to Active' : 'View Archived'}
                                </Link>
                                {!archived && (
                                    <Button
                                        onClick={handleAdd}
                                        className="gap-1.5 rounded-xl bg-blue-600 text-xs font-semibold text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500"
                                    >
                                        <IoMdAdd className="size-4" />
                                        ADD TEACHER
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredTeachers} />
                        </div>
                        {/* Pagination */}
                        {teachers?.links && teachers.links.length > 0 && (
                            <div className="flex items-center justify-end space-x-2 border-t border-border/50 px-4 py-3">
                                {teachers.links.map((link: any, index: number) => (
                                    <Link
                                        key={index}
                                        href={link.url || ''}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg border px-3 py-1 text-xs font-medium ${link.active
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'text-muted-foreground hover:bg-muted'
                                            } ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modals */}
            <TeacherModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={handleSaveSuccess}
                teacher={selectedTeacher ?? undefined}
                mode="edit"
                sections={sections}
                rooms={rooms}
                subjects={subjects}
            />

            <ConfirmationModal
                isOpen={archiveConfirmOpen}
                onClose={() => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                }}
                onConfirm={handleConfirmArchive}
                title="Archive Teacher"
                description={
                    itemToArchive
                        ? `Are you sure you want to archive teacher ${itemToArchive.tch_fname} ${itemToArchive.tch_lname}? This will temporarily disable their account access.`
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
                title="Restore Teacher"
                description={
                    itemToRestore
                        ? `Are you sure you want to restore teacher ${itemToRestore.tch_fname} ${itemToRestore.tch_lname}?`
                        : ''
                }
                type="restore"
                isLoading={isRestoring}
            />
            <TeacherModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={handleSaveSuccess}
                mode="create"
                sections={sections}
                rooms={rooms}
                subjects={subjects}
            />
        </AdminLayout>
    );
}
