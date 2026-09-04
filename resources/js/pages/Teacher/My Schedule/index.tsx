import { Head, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IoMdSearch } from 'react-icons/io';
import { DataTable } from '@/components/DataTable';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import TeacherLayout from '@/layouts/teacher/teacher-layout';
import { cn } from '@/lib/utils';

interface ScheduleSlot {
    schedule_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    subject: { subj_id: number; subj_code: string; subj_name: string } | null;
    section: { sect_id: number; sect_name: string; gr_level: string } | null;
    room: {
        room_id: number;
        room_no: string;
        building_id: number | null;
        building?: { building_id: number; building_name: string } | null;
    } | null;
}

function formatTime(time: string): string {
    if (!time) {
        return '—';
    }
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export default function MySchedule() {
    const { schedules } = usePage<any>().props as {
        schedules: ScheduleSlot[];
    };

    const [search, setSearch] = useState('');

    const sortedSchedules = useMemo(() => {
        const dayOrder = {
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6,
            'Sunday': 7,
        } as Record<string, number>;

        return [...schedules].sort((a, b) => {
            const dayA = dayOrder[a.day_of_week] ?? 99;
            const dayB = dayOrder[b.day_of_week] ?? 99;
            if (dayA !== dayB) {
                return dayA - dayB;
            }
            return (a.start_time || '').localeCompare(b.start_time || '');
        });
    }, [schedules]);

    const filteredSchedules = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return sortedSchedules;
        return sortedSchedules.filter((s) => {
            const subjectCode = s.subject?.subj_code ?? '';
            const subjectName = s.subject?.subj_name ?? '';
            const sectionName = s.section?.sect_name ?? '';
            const grLevel = s.section?.gr_level ?? '';
            const roomNo = s.room?.room_no ?? '';
            const buildingName = s.room?.building?.building_name ?? '';
            const day = s.day_of_week ?? '';
            
            return [
                subjectCode,
                subjectName,
                sectionName,
                grLevel,
                roomNo,
                buildingName,
                day
            ].join(' ').toLowerCase().includes(q);
        });
    }, [search, sortedSchedules]);

    const columns: ColumnDef<ScheduleSlot>[] = [
        {
            accessorKey: 'day_of_week',
            header: 'Day',
            cell: ({ row }) => {
                const day = row.original.day_of_week;
                const colors: Record<string, string> = {
                    Monday: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50',
                    Tuesday: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50',
                    Wednesday: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/30 dark:text-pink-400 dark:border-pink-900/50',
                    Thursday: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50',
                    Friday: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50',
                    Saturday: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-900/50',
                    Sunday: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50',
                };
                const colorClass = colors[day] || 'bg-muted text-muted-foreground border-border';
                return (
                    <span className={cn("inline-flex items-center rounded-lg border px-2.5 py-0.5 text-xs font-semibold tracking-wide", colorClass)}>
                        {day}
                    </span>
                );
            },
        },
        {
            id: 'time',
            header: 'Time Slot',
            cell: ({ row }) => (
                <div className="flex flex-col gap-0.5 font-mono text-xs tabular-nums text-foreground/90">
                    <span className="font-semibold">{formatTime(row.original.start_time)}</span>
                    <span className="text-[10px] text-muted-foreground">to {formatTime(row.original.end_time)}</span>
                </div>
            ),
        },
        {
            accessorKey: 'subject',
            header: 'Subject',
            cell: ({ row }) => {
                const subject = row.original.subject;
                if (!subject) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="space-y-0.5">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {subject.subj_code}
                        </span>
                        <p className="text-sm font-medium text-foreground">
                            {subject.subj_name}
                        </p>
                    </div>
                );
            },
        },
        {
            accessorKey: 'section',
            header: 'Section',
            cell: ({ row }) => {
                const section = row.original.section;
                if (!section) return <span className="text-muted-foreground">—</span>;
                return (
                    <span className="text-sm font-semibold text-foreground/90">
                        {section.gr_level} — {section.sect_name}
                    </span>
                );
            },
        },
        {
            accessorKey: 'room',
            header: 'Room',
            cell: ({ row }) => {
                const room = row.original.room;
                if (!room) return <span className="text-muted-foreground">—</span>;
                return (
                    <div className="space-y-0.5">
                        <span className="text-sm font-medium text-foreground">
                            Room {room.room_no}
                        </span>
                        {room.building && (
                            <p className="text-xs text-muted-foreground">
                                {room.building.building_name}
                            </p>
                        )}
                    </div>
                );
            },
        },
    ];

    return (
        <TeacherLayout>
            <Head title="My Schedule" />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-blue-500/[0.08] via-indigo-500/[0.05] to-transparent p-5 dark:from-blue-500/[0.12] dark:via-indigo-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-600" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                My Schedule
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                View your assigned class hours, subjects, and room allocations.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <CalendarDays className="size-3.5 text-blue-600 dark:text-blue-400" />
                                {schedules.length} class{schedules.length !== 1 ? 'es' : ''} total
                            </span>
                        </div>
                    </div>
                </div>

                {schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                        <CalendarDays className="mb-3 h-10 w-10 text-muted-foreground/40" />
                        <p className="text-sm font-medium text-muted-foreground">
                            No schedule assigned yet
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Your schedule will appear here once assigned by the admin.
                        </p>
                    </div>
                ) : (
                    /* ── Table Card ── */
                    <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                        <CardHeader className="border-b border-border/50 pb-4 pt-5">
                            <div className="relative w-full sm:w-72">
                                <IoMdSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by subject, section, room..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="p-4">
                                <DataTable columns={columns} data={filteredSchedules} />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </TeacherLayout>
    );
}
