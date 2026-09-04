import { Head, Link, router, usePage } from '@inertiajs/react';
import type { ColumnDef } from '@tanstack/react-table';
import { ArrowLeft, CalendarDays, Pencil, Printer, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IoMdAdd, IoMdSearch } from 'react-icons/io';
import { route } from 'ziggy-js';
import { DataTable } from '@/components/DataTable';
import SectionScheduleModal, {
    type ExistingSlot,
    type SlotRoom,
    type SlotSubject,
    type SlotTeacher,
} from '@/components/SectionScheduleModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin/admin-layout';
import { cn } from '@/lib/utils';

const DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
] as const;

type Day = (typeof DAYS)[number];

interface Section {
    sect_id: number;
    sect_name: string;
    gr_level: string;
}

interface ScheduleSlot {
    schedule_id: number;
    tch_id: number;
    subj_id: number;
    room_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    teacher: { tch_id: number; tch_fname: string; tch_mname?: string | null; tch_lname: string } | null;
    subject: { subj_id: number; subj_code: string; subj_name: string } | null;
    room: {
        room_id: number;
        room_no: string;
        building_id: number | null;
        building?: { building_id: number; building_name: string } | null;
    } | null;
}

function teacherFullName(t: {
    tch_fname: string;
    tch_mname?: string | null;
    tch_lname: string;
}): string {
    return [t.tch_fname, t.tch_mname, t.tch_lname].filter(Boolean).join(' ');
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

export default function Show() {
    const { section, schedules, teachers, rooms, subjects } =
        usePage<any>().props as {
            section: Section;
            schedules: ScheduleSlot[];
            teachers: SlotTeacher[];
            rooms: SlotRoom[];
            subjects: SlotSubject[];
        };

    const [search, setSearch] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);

    const handleDelete = (scheduleId: number) => {
        if (!window.confirm('Delete this schedule slot? This cannot be undone.')) {
            return;
        }
        router.delete(
            route('admin.schedule.destroy', { schedule: scheduleId }),
        );
    };

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
            const teacherName = s.teacher ? teacherFullName(s.teacher) : '';
            const roomNo = s.room?.room_no ?? '';
            const buildingName = s.room?.building?.building_name ?? '';
            const day = s.day_of_week ?? '';
            
            return [
                subjectCode,
                subjectName,
                teacherName,
                roomNo,
                buildingName,
                day
            ].join(' ').toLowerCase().includes(q);
        });
    }, [search, sortedSchedules]);

    const SLOT_COLORS = [
        '#fef08a',
        '#86efac',
        '#93c5fd',
        '#f9a8d4',
        '#fca5a5',
        '#c4b5fd',
        '#fdba74',
        '#a5f3fc',
    ];

    const handleExport = () => {
        const timeSet = new Set<string>();
        schedules.forEach((s) => timeSet.add(`${s.start_time}|${s.end_time}`));
        const timeSlots = [...timeSet]
            .sort((a, b) => a.localeCompare(b))
            .map((t) => {
                const [start, end] = t.split('|');
                return { start, end };
            });

        const daysWithSlots = DAYS.filter((d) =>
            schedules.some((s) => s.day_of_week === d),
        );

        const grid: Record<string, Record<string, ScheduleSlot>> = {};
        for (const slot of schedules) {
            if (!grid[slot.day_of_week]) {
                grid[slot.day_of_week] = {};
            }
            grid[slot.day_of_week][slot.start_time] = slot;
        }

        const subjectColors: Record<number, string> = {};
        let colorIdx = 0;
        for (const slot of schedules) {
            if (slot.subj_id && !(slot.subj_id in subjectColors)) {
                subjectColors[slot.subj_id] = SLOT_COLORS[colorIdx % SLOT_COLORS.length];
                colorIdx++;
            }
        }

        const rows = timeSlots
            .map(({ start, end }) => {
                const cells = daysWithSlots
                    .map((day) => {
                        const slot = grid[day]?.[start];
                        if (!slot) {
                            return '<td></td>';
                        }
                        const bg = slot.subj_id ? subjectColors[slot.subj_id] : 'transparent';
                        const subjName = slot.subject?.subj_name ?? '—';
                        const subjCode = slot.subject?.subj_code ?? '';
                        const teacher = slot.teacher ? teacherFullName(slot.teacher) : '';
                        const room = slot.room
                            ? `Room ${slot.room.room_no}${slot.room.building ? ` · ${slot.room.building.building_name}` : ''}`
                            : '';
                        return `<td style="background:${bg};text-align:center;vertical-align:middle;padding:6px 8px;">
                            ${subjCode ? `<div style="font-size:9px;color:#555;font-family:monospace;">${subjCode}</div>` : ''}
                            <div style="font-weight:600;font-size:11px;">${subjName}</div>
                            ${teacher ? `<div style="font-size:10px;color:#333;">${teacher}</div>` : ''}
                            ${room ? `<div style="font-size:9px;color:#666;">${room}</div>` : ''}
                        </td>`;
                    })
                    .join('');

                return `<tr>
                    <td style="background:#fef08a;font-weight:bold;white-space:nowrap;text-align:center;padding:6px 10px;">
                        ${formatTime(start)} – ${formatTime(end)}
                    </td>
                    ${cells}
                </tr>`;
            })
            .join('');

        const dayHeaders = daysWithSlots
            .map((d) => `<th style="background:#fef08a;padding:8px 12px;">${d}</th>`)
            .join('');

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>${section.gr_level} – ${section.sect_name} Schedule</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; font-size: 12px; color: #111; }
        h2, h3, p { text-align: center; margin: 2px 0; }
        h2 { font-size: 15px; font-weight: bold; letter-spacing: .5px; }
        h3 { font-size: 13px; font-weight: bold; }
        .sub { font-size: 11px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #aaa; font-size: 11px; }
        @media print { body { margin: 10mm; } button { display: none; } }
    </style>
</head>
<body>
    <h2>FIRST TERM CLASS PROGRAM</h2>
    <h3>${section.gr_level} — ${section.sect_name}</h3>
    <p class="sub">S.Y. 2026–2027</p>
    <table>
        <thead>
            <tr>
                <th style="background:#fef08a;padding:8px 12px;">Time</th>
                ${dayHeaders}
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>
    <p style="margin-top:20px;font-size:11px;">Prepared by:</p>
    <script>window.onload = () => window.print();<\/script>
</body>
</html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
        }
    };

    const slotForEdit: ExistingSlot | undefined = selectedSlot
        ? {
              schedule_id: selectedSlot.schedule_id,
              tch_id: selectedSlot.tch_id,
              subj_id: selectedSlot.subj_id,
              room_id: selectedSlot.room_id,
              day_of_week: selectedSlot.day_of_week,
              start_time: selectedSlot.start_time,
              end_time: selectedSlot.end_time,
          }
        : undefined;

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
            accessorKey: 'teacher',
            header: 'Teacher',
            cell: ({ row }) => {
                const teacher = row.original.teacher;
                if (!teacher) return <span className="text-muted-foreground">—</span>;
                return (
                    <span className="text-sm font-medium text-foreground/90">
                        {teacherFullName(teacher)}
                    </span>
                );
            },
        },
        {
            accessorKey: 'room',
            header: 'Room Assignment',
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
        {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl active:scale-[0.97]"
                        onClick={() => {
                            setSelectedSlot(row.original);
                            setEditOpen(true);
                        }}
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-xl active:scale-[0.97]"
                        onClick={() => handleDelete(row.original.schedule_id)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout>
            <Head title={`${section.gr_level} — ${section.sect_name} Schedule`} />

            <div className="dash-fade-up space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header banner ── */}
                <div
                    className="relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <Link href={route('admin.schedule.index')}>
                                <Button variant="ghost" size="sm" className="gap-1.5 rounded-xl border">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </Button>
                            </Link>
                            <div className="space-y-0.5">
                                <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                    {section.gr_level} — {section.sect_name}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    Class Schedule Management and Slot Allocations.
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-xs backdrop-blur-sm">
                                <CalendarDays className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                {schedules.length} slot{schedules.length !== 1 ? 's' : ''} total
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
                                    placeholder="Search by subject, teacher, room..."
                                    className="h-9 rounded-xl border-border/60 bg-muted/30 pl-9 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button 
                                    variant="outline" 
                                    onClick={handleExport} 
                                    disabled={schedules.length === 0}
                                    className="rounded-xl text-xs font-semibold"
                                >
                                    <Printer className="mr-2 h-4 w-4" />
                                    Export Schedule
                                </Button>
                                <Button
                                    onClick={() => setAddOpen(true)}
                                    className="gap-1.5 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                >
                                    <IoMdAdd className="size-4" />
                                    ADD SCHEDULE SLOT
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="p-4">
                            <DataTable columns={columns} data={filteredSchedules} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Add modal */}
            <SectionScheduleModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                onSuccess={() => {
                    setAddOpen(false);
                }}
                mode="create"
                sectionId={section.sect_id}
                sectionGrLevel={section.gr_level}
                teachers={teachers}
                rooms={rooms}
                subjects={subjects}
            />

            {/* Edit modal */}
            <SectionScheduleModal
                open={editOpen}
                onClose={() => {
                    setEditOpen(false);
                    setSelectedSlot(null);
                }}
                onSuccess={() => {
                    setEditOpen(false);
                    setSelectedSlot(null);
                }}
                mode="edit"
                sectionId={section.sect_id}
                sectionGrLevel={section.gr_level}
                slot={slotForEdit}
                teachers={teachers}
                rooms={rooms}
                subjects={subjects}
            />
        </AdminLayout>
    );
}
