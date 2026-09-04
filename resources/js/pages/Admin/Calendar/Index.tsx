import { Head, router, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    Edit2,
    Plus,
    Trash2,
    X,
    CalendarOff,
    PartyPopper,
    CloudOff,
    Coffee,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { route } from 'ziggy-js';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AdminLayout from '@/layouts/admin/admin-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarEvent {
    id: number;
    sy_id: number;
    title: string;
    description: string | null;
    type: 'holiday' | 'break' | 'suspension' | 'special_event';
    start_date: string;
    end_date: string;
    is_school_day: boolean;
}

interface SchoolYear {
    sy_id: number;
    sy_label: string;
    is_active: boolean;
}

interface Props {
    events: CalendarEvent[];
    schoolYears: SchoolYear[];
    selectedSyId: number | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin/dashboard' },
    { title: 'Academic Calendar', href: '/admin/calendar' },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const EVENT_TYPES = [
    { value: 'holiday', label: 'Holiday', icon: CalendarOff, color: 'bg-red-500', lightBg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-900/50' },
    { value: 'break', label: 'Break', icon: Coffee, color: 'bg-blue-500', lightBg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-900/50' },
    { value: 'suspension', label: 'Suspension', icon: CloudOff, color: 'bg-orange-500', lightBg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-900/50' },
    { value: 'special_event', label: 'Special Event', icon: PartyPopper, color: 'bg-emerald-500', lightBg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-900/50' },
] as const;

const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function typeConfig(type: string) {
    return EVENT_TYPES.find((t) => t.value === type) ?? EVENT_TYPES[0];
}

function formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isSameDay(a: string, b: string): boolean {
    return a.split('T')[0] === b.split('T')[0];
}

// ─── Calendar grid helpers ────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
    return new Date(year, month, 1).getDay();
}

function dateToString(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getEventsForDate(events: CalendarEvent[], dateStr: string): CalendarEvent[] {
    return events.filter((e) => {
        const start = e.start_date.split('T')[0];
        const end = e.end_date.split('T')[0];
        return dateStr >= start && dateStr <= end;
    });
}

// ─── Event Modal ──────────────────────────────────────────────────────────────

interface EventModalProps {
    open: boolean;
    onClose: () => void;
    event?: CalendarEvent | null;
    syId: number;
}

function EventModal({ open, onClose, event, syId }: EventModalProps) {
    const isEdit = !!event;

    const [form, setForm] = useState({
        title: '',
        description: '',
        type: 'holiday' as string,
        start_date: '',
        end_date: '',
        is_school_day: false,
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            if (event) {
                setForm({
                    title: event.title,
                    description: event.description ?? '',
                    type: event.type,
                    start_date: event.start_date.split('T')[0],
                    end_date: event.end_date.split('T')[0],
                    is_school_day: event.is_school_day,
                });
            } else {
                const today = new Date().toISOString().split('T')[0];
                setForm({
                    title: '',
                    description: '',
                    type: 'holiday',
                    start_date: today,
                    end_date: today,
                    is_school_day: false,
                });
            }
            setErrors({});
        }
    }, [open, event]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setErrors({});

        const payload = {
            ...form,
            sy_id: syId,
        };

        if (isEdit && event) {
            router.put(route('admin.calendar.update', { id: event.id }), payload, {
                onSuccess: () => {
                    onClose();
                    router.reload();
                },
                onError: (errs) => {
                    setErrors(errs as Record<string, string>);
                },
                onFinish: () => setSaving(false),
            });
        } else {
            router.post(route('admin.calendar.store'), payload, {
                onSuccess: () => {
                    onClose();
                    router.reload();
                },
                onError: (errs) => {
                    setErrors(errs as Record<string, string>);
                },
                onFinish: () => setSaving(false),
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarDays className="size-5 text-emerald-600" />
                        {isEdit ? 'Edit Event' : 'Add Event'}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="event-title">Title</Label>
                        <Input
                            id="event-title"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. National Heroes Day"
                            required
                        />
                        {errors.title && <p className="text-xs text-red-500">{errors.title}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="event-type">Type</Label>
                        <Select value={form.type} onValueChange={(val) => {
                            setForm({
                                ...form,
                                type: val,
                                is_school_day: val === 'special_event',
                            });
                        }}>
                            <SelectTrigger id="event-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {EVENT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        <span className="flex items-center gap-2">
                                            <span className={cn('size-2 rounded-full', t.color)} />
                                            {t.label}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.type && <p className="text-xs text-red-500">{errors.type}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="event-start">Start Date</Label>
                            <Input
                                id="event-start"
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                required
                            />
                            {errors.start_date && <p className="text-xs text-red-500">{errors.start_date}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="event-end">End Date</Label>
                            <Input
                                id="event-end"
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                required
                            />
                            {errors.end_date && <p className="text-xs text-red-500">{errors.end_date}</p>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="event-desc">Description (optional)</Label>
                        <Input
                            id="event-desc"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="Additional details..."
                        />
                        {errors.description && <p className="text-xs text-red-500">{errors.description}</p>}
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-3">
                        <input
                            id="event-school-day"
                            type="checkbox"
                            checked={form.is_school_day}
                            onChange={(e) => setForm({ ...form, is_school_day: e.target.checked })}
                            className="size-4 rounded border-border accent-emerald-600"
                        />
                        <div>
                            <Label htmlFor="event-school-day" className="cursor-pointer text-sm font-medium">
                                School day
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                If checked, attendance will still be expected on this day.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {saving ? 'Saving...' : isEdit ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Calendar Cell ────────────────────────────────────────────────────────────

function CalendarCell({
    day,
    dateStr,
    events,
    isToday,
    isCurrentMonth,
    onEventClick,
}: {
    day: number;
    dateStr: string;
    events: CalendarEvent[];
    isToday: boolean;
    isCurrentMonth: boolean;
    onEventClick: (e: CalendarEvent) => void;
}) {
    const isWeekend = new Date(dateStr + 'T00:00:00').getDay() === 0 || new Date(dateStr + 'T00:00:00').getDay() === 6;

    return (
        <div
            className={cn(
                'group relative min-h-[90px] rounded-lg border p-1.5 transition-colors md:min-h-[100px]',
                isCurrentMonth
                    ? 'border-border/60 bg-card hover:border-border'
                    : 'border-transparent bg-muted/20',
                isToday && 'ring-2 ring-emerald-500/40 border-emerald-500/40',
                isWeekend && isCurrentMonth && 'bg-muted/30',
            )}
        >
            <span
                className={cn(
                    'inline-flex size-6 items-center justify-center rounded-full text-xs font-medium',
                    isToday
                        ? 'bg-emerald-600 text-white'
                        : isCurrentMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground/50',
                )}
            >
                {day}
            </span>

            <div className="mt-0.5 space-y-0.5">
                {events.slice(0, 2).map((evt) => {
                    const cfg = typeConfig(evt.type);
                    return (
                        <button
                            key={evt.id}
                            type="button"
                            onClick={() => onEventClick(evt)}
                            className={cn(
                                'flex w-full items-center gap-1 truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium leading-tight transition-all hover:opacity-80',
                                cfg.lightBg,
                                cfg.text,
                            )}
                            title={evt.title}
                        >
                            <span className={cn('size-1.5 shrink-0 rounded-full', cfg.color)} />
                            <span className="truncate">{evt.title}</span>
                        </button>
                    );
                })}
                {events.length > 2 && (
                    <span className="block px-1 text-[9px] text-muted-foreground">
                        +{events.length - 2} more
                    </span>
                )}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarIndex({ events, schoolYears, selectedSyId }: Props) {
    const today = new Date();
    const [viewMonth, setViewMonth] = useState(today.getMonth());
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [addOpen, setAddOpen] = useState(false);
    const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [view, setView] = useState<'calendar' | 'list'>('calendar');

    // Reset view month/year when events change
    useEffect(() => {
        setViewMonth(today.getMonth());
        setViewYear(today.getFullYear());
    }, [selectedSyId]);

    const handleSyChange = (syId: string) => {
        router.get(route('admin.calendar.index'), { sy_id: syId }, { preserveState: true });
    };

    const handlePrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(viewYear - 1);
        } else {
            setViewMonth(viewMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(viewYear + 1);
        } else {
            setViewMonth(viewMonth + 1);
        }
    };

    const handleDeleteClick = (event: CalendarEvent) => {
        setEventToDelete(event);
        setDeleteConfirmOpen(true);
    };

    const handleConfirmDelete = () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        router.delete(route('admin.calendar.destroy', { id: eventToDelete.id }), {
            onSuccess: () => {
                setDeleteConfirmOpen(false);
                setEventToDelete(null);
                router.reload();
            },
            onFinish: () => setIsDeleting(false),
        });
    };

    // Build calendar grid
    const calendarDays = useMemo(() => {
        const daysInMonth = getDaysInMonth(viewYear, viewMonth);
        const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
        const todayStr = today.toISOString().split('T')[0];

        const cells: {
            day: number;
            dateStr: string;
            events: CalendarEvent[];
            isToday: boolean;
            isCurrentMonth: boolean;
        }[] = [];

        // Previous month padding
        const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
        const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
        const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

        for (let i = firstDay - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const ds = dateToString(prevYear, prevMonth, d);
            cells.push({
                day: d,
                dateStr: ds,
                events: getEventsForDate(events, ds),
                isToday: ds === todayStr,
                isCurrentMonth: false,
            });
        }

        // Current month
        for (let d = 1; d <= daysInMonth; d++) {
            const ds = dateToString(viewYear, viewMonth, d);
            cells.push({
                day: d,
                dateStr: ds,
                events: getEventsForDate(events, ds),
                isToday: ds === todayStr,
                isCurrentMonth: true,
            });
        }

        // Next month padding
        const totalCells = Math.ceil(cells.length / 7) * 7;
        const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
        const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;

        for (let d = 1; cells.length < totalCells; d++) {
            const ds = dateToString(nextYear, nextMonth, d);
            cells.push({
                day: d,
                dateStr: ds,
                events: getEventsForDate(events, ds),
                isToday: ds === todayStr,
                isCurrentMonth: false,
            });
        }

        return cells;
    }, [viewYear, viewMonth, events]);

    // Summary stats
    const stats = useMemo(() => {
        const byType: Record<string, number> = {};
        events.forEach((e) => {
            byType[e.type] = (byType[e.type] || 0) + 1;
        });
        const nonSchoolDays = events.filter((e) => !e.is_school_day).length;
        return { byType, total: events.length, nonSchoolDays };
    }, [events]);

    const activeSy = schoolYears.find((sy) => sy.sy_id === selectedSyId);

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin · Academic Calendar" />
            <div className="space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Header ── */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">
                            Academic Calendar
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Manage holidays, breaks, suspensions and special events.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* School Year filter */}
                        <Select
                            value={selectedSyId?.toString() ?? ''}
                            onValueChange={handleSyChange}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="School Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {schoolYears.map((sy) => (
                                    <SelectItem key={sy.sy_id} value={sy.sy_id.toString()}>
                                        {sy.sy_label}
                                        {sy.is_active && ' (Active)'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => setAddOpen(true)}
                            className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={!selectedSyId}
                        >
                            <Plus className="size-4" />
                            Add Event
                        </Button>
                    </div>
                </div>

                {/* ── Stats pills ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
                    <Card className="border-border/60">
                        <CardContent className="flex items-center gap-3 p-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
                                <CalendarDays className="size-4 text-foreground" />
                            </div>
                            <div>
                                <p className="text-lg font-bold tabular-nums">{stats.total}</p>
                                <p className="text-[11px] text-muted-foreground">Total Events</p>
                            </div>
                        </CardContent>
                    </Card>
                    {EVENT_TYPES.map((t) => (
                        <Card key={t.value} className={cn('border-border/60', t.border)}>
                            <CardContent className="flex items-center gap-3 p-3">
                                <div className={cn('flex size-9 items-center justify-center rounded-lg', t.lightBg)}>
                                    <t.icon className={cn('size-4', t.text)} />
                                </div>
                                <div>
                                    <p className="text-lg font-bold tabular-nums">{stats.byType[t.value] ?? 0}</p>
                                    <p className="text-[11px] text-muted-foreground">{t.label}s</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── View toggle + month navigation ── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrevMonth}
                            className="size-8 p-0"
                        >
                            <ChevronLeft className="size-4" />
                        </Button>
                        <h2 className="min-w-[160px] text-center text-base font-semibold text-foreground">
                            {MONTH_NAMES[viewMonth]} {viewYear}
                        </h2>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextMonth}
                            className="size-8 p-0"
                        >
                            <ChevronRight className="size-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setViewMonth(today.getMonth());
                                setViewYear(today.getFullYear());
                            }}
                            className="ml-1 text-xs"
                        >
                            Today
                        </Button>
                    </div>
                    <div className="flex rounded-lg border border-border p-0.5">
                        <button
                            type="button"
                            onClick={() => setView('calendar')}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                view === 'calendar'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            Calendar
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('list')}
                            className={cn(
                                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                view === 'list'
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            List
                        </button>
                    </div>
                </div>

                {/* ── Calendar view ── */}
                {view === 'calendar' && (
                    <Card className="overflow-hidden border-border/60">
                        <CardContent className="p-2 sm:p-4">
                            {/* Day headers */}
                            <div className="mb-1 grid grid-cols-7 gap-1">
                                {DAY_LABELS.map((d) => (
                                    <div
                                        key={d}
                                        className={cn(
                                            'py-2 text-center text-xs font-semibold uppercase tracking-wider',
                                            d === 'Sun' || d === 'Sat'
                                                ? 'text-muted-foreground/60'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>
                            {/* Calendar grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((cell, idx) => (
                                    <CalendarCell
                                        key={idx}
                                        day={cell.day}
                                        dateStr={cell.dateStr}
                                        events={cell.events}
                                        isToday={cell.isToday}
                                        isCurrentMonth={cell.isCurrentMonth}
                                        onEventClick={(e) => setEditEvent(e)}
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── List view ── */}
                {view === 'list' && (
                    <Card className="overflow-hidden border-border/60">
                        <CardContent className="p-0">
                            {events.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                    <CalendarDays className="mb-3 size-10 text-muted-foreground/40" />
                                    <p className="text-sm text-muted-foreground">
                                        No events for this school year.
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-3 gap-1.5"
                                        onClick={() => setAddOpen(true)}
                                        disabled={!selectedSyId}
                                    >
                                        <Plus className="size-3.5" />
                                        Add your first event
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {events.map((evt) => {
                                        const cfg = typeConfig(evt.type);
                                        const isSingle = isSameDay(evt.start_date, evt.end_date);
                                        return (
                                            <div
                                                key={evt.id}
                                                className="group flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6"
                                            >
                                                {/* Type indicator */}
                                                <div className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', cfg.lightBg)}>
                                                    <cfg.icon className={cn('size-5', cfg.text)} />
                                                </div>

                                                {/* Info */}
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-foreground">
                                                            {evt.title}
                                                        </p>
                                                        <span
                                                            className={cn(
                                                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize',
                                                                cfg.lightBg,
                                                                cfg.text,
                                                            )}
                                                        >
                                                            <span className={cn('size-1.5 rounded-full', cfg.color)} />
                                                            {cfg.label}
                                                        </span>
                                                        {evt.is_school_day && (
                                                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                                School Day
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {isSingle
                                                            ? formatDate(evt.start_date)
                                                            : `${formatDate(evt.start_date)} → ${formatDate(evt.end_date)}`}
                                                        {evt.description && (
                                                            <span className="ml-2 text-muted-foreground/70">
                                                                · {evt.description}
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>

                                                {/* Actions */}
                                                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="size-8 p-0"
                                                        onClick={() => setEditEvent(evt)}
                                                    >
                                                        <Edit2 className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="size-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                                                        onClick={() => handleDeleteClick(evt)}
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* ── Legend ── */}
                <div className="flex flex-wrap items-center gap-4">
                    {EVENT_TYPES.map((t) => (
                        <div key={t.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn('size-2.5 rounded-full', t.color)} />
                            {t.label}
                        </div>
                    ))}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="size-2.5 rounded-full ring-2 ring-emerald-500/40 bg-transparent" />
                        Today
                    </div>
                </div>
            </div>

            {/* ── Modals ── */}
            <EventModal
                open={addOpen}
                onClose={() => setAddOpen(false)}
                syId={selectedSyId!}
            />
            <EventModal
                open={!!editEvent}
                onClose={() => setEditEvent(null)}
                event={editEvent}
                syId={selectedSyId!}
            />
            <ConfirmationModal
                isOpen={deleteConfirmOpen}
                onClose={() => {
                    setDeleteConfirmOpen(false);
                    setEventToDelete(null);
                }}
                onConfirm={handleConfirmDelete}
                title="Delete Event"
                description={`Are you sure you want to delete "${eventToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                isLoading={isDeleting}
                confirmVariant="destructive"
            />
        </AdminLayout>
    );
}
