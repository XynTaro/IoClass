import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { Archive, Building2, RotateCcw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IoMdAdd, IoMdCreate, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import BuildingModal, { type Building } from '@/components/BuildingModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin/admin-layout';
import { archiveRowButtonClassName, archiveModalConfirmClassName } from '@/lib/archive-ui';
import { cn } from '@/lib/utils';

export default function Index() {
    const { buildings, archived = false } = usePage<any>().props;

    const [buildingList, setBuildingList] = useState<Building[]>(buildings?.data ?? []);
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<Building | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [itemToRestore, setItemToRestore] = useState<Building | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        setBuildingList(buildings?.data ?? []);
    }, [buildings]);

    const filteredBuildings = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return buildingList;
        return buildingList.filter((b) =>
            (b.building_name ?? '').toLowerCase().includes(q),
        );
    }, [search, buildingList]);

    const handleSaveSuccess = () => {
        router.reload();
        setAddOpen(false);
        setEditOpen(false);
        setSelectedBuilding(null);
    };

    const handleArchiveClick = (building: Building) => {
        setItemToArchive(building);
        setArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = () => {
        if (!itemToArchive) return;
        setIsArchiving(true);
        router.delete(route('admin.building.destroy', { id: itemToArchive.building_id }), {
            onSuccess: () => {
                setArchiveConfirmOpen(false);
                setItemToArchive(null);
                router.reload();
            },
            onFinish: () => setIsArchiving(false),
        });
    };

    const handleRestoreClick = (building: Building) => {
        setItemToRestore(building);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;
        setIsRestoring(true);
        router.post(
            route('admin.building.restore', { id: itemToRestore.building_id }),
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



    const columns: ColumnDef<Building>[] = [
        {
            accessorKey: 'building_name',
            header: 'Building Name',
            cell: ({ row }) => row.original.building_name ?? '—',
        },
        {
            accessorKey: 'rooms_count',
            header: 'Rooms',
            cell: ({ row }) => (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-semibold tabular-nums">
                    {row.original.rooms_count ?? 0}
                </span>
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
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setSelectedBuilding(row.original);
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
            <Head title={archived ? 'Archived Buildings' : 'Buildings'} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {archived ? 'Archived Buildings' : 'Buildings Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {archived
                                    ? 'View and manage soft-deleted building records.'
                                    : 'Manage campus buildings and their associated facilities.'}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <Building2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {buildingList.length} {archived ? 'Archived' : 'Buildings'}
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
                                    placeholder="Search by building name..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={
                                        archived
                                            ? route('admin.building.index')
                                            : route('admin.building.index', { archived: 1 })
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
                                        ADD BUILDING
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredBuildings} />
                        </div>
                        {/* Pagination */}
                        {buildings?.links && buildings.links.length > 0 && (
                            <div className="flex items-center justify-end space-x-2 border-t border-border/50 px-4 py-3">
                                {buildings.links.map((link: any, index: number) => (
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

            <BuildingModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={handleSaveSuccess}
                mode="create"
            />
            <BuildingModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={handleSaveSuccess}
                building={selectedBuilding ?? undefined}
                mode="edit"
            />

            <ConfirmationModal
                isOpen={archiveConfirmOpen}
                onClose={() => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                }}
                onConfirm={handleConfirmArchive}
                title="Archive Building"
                description={
                    itemToArchive
                        ? `Are you sure you want to archive building ${itemToArchive.building_name}? All rooms assigned to this building may be affected.`
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
                title="Restore Building"
                description={
                    itemToRestore
                        ? `Are you sure you want to restore building ${itemToRestore.building_name}?`
                        : ''
                }
                type="restore"
                isLoading={isRestoring}
            />
        </AdminLayout>
    );
}
