import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, Calendar, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IoMdAdd, IoMdCreate, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DataTable } from '@/components/DataTable';
import SchoolYearModal, { type SchoolYear } from '@/components/School-Year';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin/admin-layout';
import { archiveRowButtonClassName, archiveModalConfirmClassName } from '@/lib/archive-ui';
import { cn } from '@/lib/utils';

function formatMonthDay(dateStr: string | null | undefined): string {
    if (!dateStr) return '—';
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const date = new Date(dateOnly + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export default function Index() {
    const { schoolYears, archived = false } = usePage<any>().props;

    const [schoolYearList, setSchoolYearList] = useState<SchoolYear[]>(schoolYears?.data ?? []);
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState<SchoolYear | null>(null);
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<SchoolYear | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [itemToRestore, setItemToRestore] = useState<SchoolYear | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        setSchoolYearList(schoolYears?.data ?? []);
    }, [schoolYears]);

    const filteredSchoolYears = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return schoolYearList;
        return schoolYearList.filter((sy) =>
            (sy.sy_label ?? '').toLowerCase().includes(q),
        );
    }, [search, schoolYearList]);

    const handleSaveSuccess = () => {
        router.reload();
        setAddOpen(false);
        setEditOpen(false);
        setSelectedSchoolYear(null);
    };

    const handleArchiveClick = (schoolYear: SchoolYear) => {
        setItemToArchive(schoolYear);
        setArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = () => {
        if (!itemToArchive) return;
        setIsArchiving(true);
        router.delete(
            route('admin.school-year.destroy', { school_Year: itemToArchive.sy_id }),
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

    const handleRestoreClick = (schoolYear: SchoolYear) => {
        setItemToRestore(schoolYear);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;
        setIsRestoring(true);
        router.post(
            route('admin.school-year.restore', { id: itemToRestore.sy_id }),
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



    const columns: ColumnDef<SchoolYear>[] = [
        {
            accessorKey: 'sy_label',
            header: 'Label',
            cell: ({ row }) => row.original.sy_label ?? '—',
        },
        {
            accessorKey: 'start_date',
            header: 'Start Date',
            cell: ({ row }) => formatMonthDay(row.original.start_date),
        },
        {
            accessorKey: 'end_date',
            header: 'End Date',
            cell: ({ row }) => formatMonthDay(row.original.end_date),
        },
        {
            accessorKey: 'is_active',
            header: 'Status',
            cell: ({ row }) => {
                const isActive = row.original.is_active;
                return (
                    <span
                        className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize',
                            isActive
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-muted text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground',
                        )}
                    >
                        <span
                            className={cn(
                                'size-1.5 rounded-full',
                                isActive ? 'bg-emerald-500' : 'bg-muted-foreground/60',
                            )}
                        />
                        {isActive ? 'Active' : 'Inactive'}
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
                                    setSelectedSchoolYear(row.original);
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
            <Head title={archived ? 'Archived School Years' : 'School Years'} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {archived ? 'Archived School Years' : 'School Years Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {archived
                                    ? 'View and manage soft-deleted school year periods.'
                                    : 'Manage academic calendar periods, active years, and term ranges.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <Calendar className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {schoolYearList.length} {archived ? 'Archived' : 'Years'}
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
                                    placeholder="Search by label..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={
                                        archived
                                            ? route('admin.school-year.index')
                                            : route('admin.school-year.index', { archived: 1 })
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                >
                                    <Archive className="h-3.5 w-3.5" />
                                    {archived ? 'Back to Active' : 'View Archived'}
                                </Link>
                                {!archived && (
                                    <Button
                                        onClick={() => setAddOpen(true)}
                                        className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                    >
                                        <IoMdAdd className="size-4" />
                                        ADD SCHOOL YEAR
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredSchoolYears} />
                        </div>
                        {/* Pagination */}
                        {schoolYears?.links && schoolYears.links.length > 0 && (
                            <div className="flex items-center justify-end space-x-2 border-t border-border/50 px-4 py-3">
                                {schoolYears.links.map((link: any, index: number) => (
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

            <SchoolYearModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={handleSaveSuccess}
                mode="create"
            />
            <SchoolYearModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={handleSaveSuccess}
                schoolYear={selectedSchoolYear ?? undefined}
                mode="edit"
            />

            <ConfirmationModal
                isOpen={archiveConfirmOpen}
                onClose={() => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                }}
                onConfirm={handleConfirmArchive}
                title="Archive School Year"
                description={
                    itemToArchive
                        ? `Are you sure you want to archive school year ${itemToArchive.sy_label}?`
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
                title="Restore School Year"
                description={
                    itemToRestore
                        ? `Are you sure you want to restore school year ${itemToRestore.sy_label}?`
                        : ''
                }
                type="restore"
                isLoading={isRestoring}
            />
        </AdminLayout>
    );
}
