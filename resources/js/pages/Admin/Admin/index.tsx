import { Head, Link, router, usePage } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { Archive, RotateCcw, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { IoMdAdd, IoMdCreate, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import AdminModal from '@/components/AdminModal';
import ConfirmationModal from '@/components/ConfirmationModal';

import { DataTable } from '@/components/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin/admin-layout';
import { archiveRowButtonClassName, archiveModalConfirmClassName } from '@/lib/archive-ui';
import { cn } from '@/lib/utils';


interface Admin {
    admin_id: number;
    fname: string;
    mname?: string | null;
    lname: string;
    email: string;
    contact_number?: string | null;
    is_deleted?: boolean;
    avatar?: string | null;
}

export default function Index() {
    const { admins, archived = false } = usePage<any>().props;
    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
    const [adminList, setAdminList] = useState<Admin[]>(admins.data ?? []);
    const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
    const [itemToArchive, setItemToArchive] = useState<Admin | null>(null);
    const [isArchiving, setIsArchiving] = useState(false);
    const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
    const [itemToRestore, setItemToRestore] = useState<Admin | null>(null);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        setAdminList(admins.data ?? []);
    }, [admins]);

    const filteredAdmins = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return adminList;

        return adminList.filter((a) =>
            [a.fname, a.lname, a.email].join(' ').toLowerCase().includes(q),
        );
    }, [adminList, search]);

    const handleArchiveClick = (admin: Admin) => {
        setItemToArchive(admin);
        setArchiveConfirmOpen(true);
    };

    const handleConfirmArchive = () => {
        if (!itemToArchive) return;
        setIsArchiving(true);
        router.delete(
            route('admin.admin.destroy', { admin: itemToArchive.admin_id }),
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

    const handleRestoreClick = (admin: Admin) => {
        setItemToRestore(admin);
        setRestoreConfirmOpen(true);
    };

    const handleConfirmRestore = () => {
        if (!itemToRestore) return;
        setIsRestoring(true);
        router.post(
            route('admin.admin.restore', { id: itemToRestore.admin_id }),
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

    const columns: ColumnDef<Admin>[] = [
        {
            accessorKey: 'profile',
            header: 'Profile',
            cell: ({ row }) => {
                const admin = row.original;
                const initials = `${admin.fname?.[0] ?? ''}${admin.lname?.[0] ?? ''}`.toUpperCase() || 'A';
                return (
                    <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 rounded-full border border-border bg-muted">
                            <AvatarImage src={admin.avatar} alt={admin.fname} />
                            <AvatarFallback className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">{initials}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">
                            {admin.fname} {admin.mname ? `${admin.mname} ` : ''}{admin.lname}
                        </span>
                    </div>
                );
            }
        },
        { accessorKey: 'email', header: 'Email' },
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
                                onClick={() => {
                                    setSelectedAdmin(row.original);
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
            <Head title={archived ? 'Archived Admins' : 'Admins Management'} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-purple-500/[0.08] via-indigo-500/[0.05] to-transparent p-5 dark:from-purple-500/[0.12] dark:via-indigo-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-purple-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {archived ? 'Archived Admins' : 'Admins Management'}
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                {archived
                                    ? 'View and manage soft-deleted administrator accounts.'
                                    : 'Manage system administrators and administrative credentials.'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <ShieldCheck className="size-3.5 text-purple-600 dark:text-purple-400" />
                                {adminList.length} {archived ? 'Archived' : 'System Admins'}
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
                                    placeholder="Search by name or email..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-purple-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Link
                                    href={
                                        archived
                                            ? route('admin.admin.index')
                                            : route('admin.admin.index', {
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
                                        onClick={() => setAddOpen(true)}
                                        className="gap-1.5 rounded-xl bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500"
                                    >
                                        <IoMdAdd className="size-4" />
                                        ADD ADMIN
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredAdmins} />
                        </div>
                        {/* Pagination */}
                        {admins?.links && admins.links.length > 0 && (
                            <div className="flex items-center justify-end space-x-2 border-t border-border/50 px-4 py-3">
                                {admins.links.map((link: any, index: number) => (
                                    <Link
                                        key={index}
                                        href={link.url || ''}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        className={`rounded-lg border px-3 py-1 text-xs font-medium ${
                                            link.active
                                                ? 'bg-purple-600 text-white border-purple-600'
                                                : 'text-muted-foreground hover:bg-muted'
                                        } ${!link.url ? 'pointer-events-none opacity-50' : ''}`}
                                    />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AdminModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={() => {
                    setAddOpen(false);
                    router.reload();
                }}
                mode="create"
            />

            <AdminModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={() => {
                    setEditOpen(false);
                    setSelectedAdmin(null);
                    router.reload();
                }}
                admin={selectedAdmin ?? undefined}
                mode="edit"
            />

            <ConfirmationModal
                isOpen={archiveConfirmOpen}
                onClose={() => {
                    setArchiveConfirmOpen(false);
                    setItemToArchive(null);
                }}
                onConfirm={handleConfirmArchive}
                title="Archive Administrator"
                description={
                    itemToArchive
                        ? `Are you sure you want to archive administrator ${itemToArchive.fname} ${itemToArchive.lname}?`
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
                title="Restore Administrator"
                description={
                    itemToRestore
                        ? `Are you sure you want to restore administrator ${itemToRestore.fname} ${itemToRestore.lname}?`
                        : ''
                }
                type="restore"
                isLoading={isRestoring}
            />
        </AdminLayout>
    );
}
