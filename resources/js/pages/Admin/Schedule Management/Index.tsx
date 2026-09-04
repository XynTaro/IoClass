import { Head, Link, usePage } from '@inertiajs/react';
import { type ColumnDef } from '@tanstack/react-table';
import { CalendarDays, Eye } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import { DataTable } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin/admin-layout';

interface SectionRow {
    sect_id: number;
    sect_name: string;
    gr_level: string;
    schedules_count: number;
}

export default function Index() {
    const { sections } = usePage<any>().props as {
        sections: SectionRow[];
    };

    const [search, setSearch] = useState('');

    const filteredSections = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) {
            return sections;
        }
        return sections.filter((s) =>
            `${s.gr_level} ${s.sect_name}`.toLowerCase().includes(q),
        );
    }, [sections, search]);

    const columns: ColumnDef<SectionRow>[] = [
        {
            id: 'gr_level',
            header: 'Grade Level',
            cell: ({ row }) => (
                <span className="font-medium">{row.original.gr_level}</span>
            ),
        },
        {
            id: 'sect_name',
            header: 'Section',
            cell: ({ row }) => <span>{row.original.sect_name}</span>,
        },
        {
            id: 'schedules_count',
            header: 'Schedule Slots',
            cell: ({ row }) => (
                <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        row.original.schedules_count > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-muted text-muted-foreground'
                    }`}
                >
                    {row.original.schedules_count}{' '}
                    {row.original.schedules_count === 1 ? 'slot' : 'slots'}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <Link
                    href={route('admin.schedule.section.show', {
                        sectionId: row.original.sect_id,
                    })}
                >
                    <Button size="sm" variant="outline">
                        <Eye className="mr-1.5 h-4 w-4" />
                        View Schedule
                    </Button>
                </Link>
            ),
        },
    ];

    return (
        <AdminLayout>
            <Head title="Schedule Management" />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                Schedule Management
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Select a section to view and manage its weekly schedule.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <CalendarDays className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {filteredSections.length} {filteredSections.length === 1 ? 'Section' : 'Sections'}
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
                                    placeholder="Search by grade level or section..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredSections} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
