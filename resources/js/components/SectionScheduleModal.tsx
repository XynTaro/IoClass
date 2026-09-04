import { useForm } from '@inertiajs/react';
import { CalendarClock, Plus, Trash2, BookOpen, Calendar } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { ModalAccentBar, ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
] as const;

const GENERATED_TIME_OPTIONS = [
    '07:00', '07:15', '07:30', '07:45',
    '08:00', '08:15', '08:30', '08:45',
    '09:00', '09:15', '09:30', '09:45',
    '10:00', '10:15', '10:30', '10:45',
    '11:00', '11:15', '11:30', '11:45',
    '12:00', '12:15', '12:30', '12:45',
    '13:00', '13:15', '13:30', '13:45',
    '14:00', '14:15', '14:30', '14:45',
    '15:00', '15:15', '15:30', '15:45',
    '16:00', '16:15', '16:30', '16:45',
    '17:00', '17:15', '17:30', '17:45',
    '18:00', '18:15', '18:30', '18:45',
    '19:00', '19:15', '19:30', '19:45',
    '20:00', '20:15', '20:30', '20:45',
];

const timeToAmPm = (timeStr: string): string => {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    const padHour = String(hour).padStart(2, '0');
    const padMin = String(m).padStart(2, '0');
    return `${padHour}:${padMin} ${period}`;
};

function FormFieldError({ label, message }: { label: string; message?: string }) {
    if (!message) {
        return null;
    }
    return (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            <strong className="font-semibold">{label}</strong>{' '}
            <span className="font-normal">{message}</span>
        </p>
    );
}

export interface SlotTeacher {
    tch_id: number;
    tch_fname: string;
    tch_mname?: string | null;
    tch_lname: string;
}

export interface SlotRoom {
    room_id: number;
    room_no: string;
    building_id: number | null;
    building?: { building_id: number; building_name: string } | null;
}

export interface SlotSubject {
    subj_id: number;
    subj_code: string;
    subj_name: string;
    gr_level?: string | null;
}

export interface ExistingSlot {
    schedule_id: number;
    tch_id: number;
    subj_id: number;
    room_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
}

export interface DayTimeSlot {
    room_id: number | '';
    days: string[];
    start_time: string;
    end_time: string;
    buildingFilter?: string;
}

interface FormData {
    tch_id: number | '';
    subj_id: number | '';
    room_id: number | '';
    day_of_week: string;
    start_time: string;
    end_time: string;
}

interface SectionScheduleModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    sectionId: number;
    sectionGrLevel?: string | null;
    teachers: SlotTeacher[];
    rooms: SlotRoom[];
    subjects: SlotSubject[];
    slot?: ExistingSlot;
    mode: 'create' | 'edit';
}

function teacherFullName(t: SlotTeacher): string {
    return [t.tch_fname, t.tch_mname, t.tch_lname].filter(Boolean).join(' ');
}

export default function SectionScheduleModal({
    open,
    onClose,
    onSuccess,
    sectionId,
    sectionGrLevel,
    teachers,
    rooms,
    subjects,
    slot,
    mode,
}: SectionScheduleModalProps) {
    const availableSubjects = useMemo(() => {
        if (!sectionGrLevel) {
            return subjects;
        }
        return subjects.filter((s) => s.gr_level === sectionGrLevel);
    }, [subjects, sectionGrLevel]);

    const buildings = useMemo(
        () =>
            [
                ...new Map(
                    rooms
                        .filter((r) => r.building)
                        .map((r) => [r.building!.building_id, r.building!]),
                ).values(),
            ].sort((a, b) => a.building_name.localeCompare(b.building_name)),
        [rooms],
    );

    const form = useForm<FormData>({
        tch_id: '',
        subj_id: '',
        room_id: '',
        day_of_week: '',
        start_time: '',
        end_time: '',
    });

    const [slots, setSlots] = useState<DayTimeSlot[]>([
        { room_id: '', days: [], start_time: '', end_time: '', buildingFilter: '' },
    ]);

    const updateSlot = (index: number, patch: Partial<DayTimeSlot>) => {
        setSlots((current) =>
            current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
        );
    };

    const handleAddSlot = () => {
        setSlots((current) => [...current, { room_id: '', days: [], start_time: '', end_time: '', buildingFilter: '' }]);
    };

    const handleRemoveSlot = (index: number) => {
        setSlots((current) => current.filter((_, i) => i !== index));
    };

    const toggleDay = (slotIndex: number, day: string) => {
        const slot = slots[slotIndex];
        if (mode === 'edit') {
            updateSlot(slotIndex, { days: [day] });
        } else {
            const days = slot.days.includes(day)
                ? slot.days.filter((d) => d !== day)
                : [...slot.days, day];
            updateSlot(slotIndex, { days });
        }
    };

    useEffect(() => {
        if (open && mode === 'edit' && slot) {
            form.setData({
                tch_id: slot.tch_id,
                subj_id: slot.subj_id,
                room_id: slot.room_id,
                day_of_week: slot.day_of_week,
                start_time: slot.start_time,
                end_time: slot.end_time,
            });
            const slotRoom = rooms.find((r) => r.room_id === slot.room_id);
            setSlots([
                {
                    room_id: slot.room_id,
                    days: [slot.day_of_week],
                    start_time: slot.start_time ? slot.start_time.slice(0, 5) : '',
                    end_time: slot.end_time ? slot.end_time.slice(0, 5) : '',
                    buildingFilter: slotRoom?.building_id != null ? String(slotRoom.building_id) : '',
                },
            ]);
        } else if (open && mode === 'create') {
            form.setData({
                tch_id: '',
                subj_id: '',
                room_id: '',
                day_of_week: '',
                start_time: '',
                end_time: '',
            });
            setSlots([
                { room_id: '', days: [], start_time: '', end_time: '', buildingFilter: '' },
            ]);
        }
    }, [open, mode, slot]);

    useEffect(() => {
        if (!open) {
            form.reset();
            setSlots([
                { room_id: '', days: [], start_time: '', end_time: '', buildingFilter: '' },
            ]);
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'edit' && slot) {
            const firstSlot = slots[0];
            form.transform((data) => ({
                tch_id: data.tch_id,
                sect_id: sectionId,
                subj_id: data.subj_id,
                room_id: firstSlot.room_id,
                day_of_week: firstSlot.days[0] ?? '',
                start_time: firstSlot.start_time ? firstSlot.start_time.slice(0, 5) : '',
                end_time: firstSlot.end_time ? firstSlot.end_time.slice(0, 5) : '',
            }));
            form.put(route('admin.schedule.update', { schedule: slot.schedule_id }), {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
            });
            return;
        }

        form.transform((data) => ({
            tch_id: data.tch_id,
            schedules: slots.map((s) => ({
                sect_id: sectionId,
                room_id: s.room_id,
                subj_id: data.subj_id,
                days: s.days,
                start_time: s.start_time ? s.start_time.slice(0, 5) : '',
                end_time: s.end_time ? s.end_time.slice(0, 5) : '',
            })),
            is_adviser: false,
            adviser_sect_id: null,
        }));

        form.post(route('admin.schedule.store'), {
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
        });
    };

    const warnings = useMemo(() => {
        const list: string[] = [];

        slots.forEach((s, idx) => {
            if (s.start_time && s.end_time && s.end_time <= s.start_time) {
                list.push(`Slot #${idx + 1}: End time must be after start time.`);
            }

            slots.forEach((other, oIdx) => {
                if (idx >= oIdx) return;
                if (!s.start_time || !s.end_time || !other.start_time || !other.end_time) return;

                const commonDays = s.days.filter((d) => other.days.includes(d));
                if (commonDays.length === 0) return;

                const sStart = s.start_time;
                const sEnd = s.end_time;
                const oStart = other.start_time;
                const oEnd = other.end_time;

                const hasOverlap = (sStart < oEnd) && (sEnd > oStart);
                if (hasOverlap) {
                    list.push(
                        `Time collision: Slot #${idx + 1} and Slot #${oIdx + 1} overlap on ${commonDays.join(', ')}.`
                    );
                }
            });
        });

        return list;
    }, [slots]);

    const errors = form.errors as Record<string, string>;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-xl">
                <ModalAccentBar />
                <div className="space-y-4 p-6 pt-4">
                    <ModalHeader
                        icon={CalendarClock}
                        tone="sky"
                        title={mode === 'edit' ? 'Edit Schedule Slot' : 'Add Schedule Slot'}
                        description={`Teacher, subject, room, day, and time for Grade Level ${sectionGrLevel}`}
                    />

                    <form onSubmit={handleSubmit} className="max-h-[72vh] space-y-5 overflow-y-auto pr-2">
                        {/* Class Allocation details wrapper */}
                        <div className="space-y-4 rounded-xl border border-border bg-linear-to-b from-card to-muted/25 p-4 shadow-xs dark:from-card/5 dark:to-muted/5">
                            <div className="flex items-center gap-2 border-b border-border/20 pb-2 mb-1">
                                <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Class Details
                                </span>
                            </div>

                            {/* Teacher and Subject fields side-by-side */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                {/* Teacher */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/90">
                                        Teacher <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.tch_id === '' ? '' : String(form.data.tch_id)}
                                        onValueChange={(v) => {
                                            form.setData('tch_id', Number(v));
                                            form.clearErrors('tch_id' as never);
                                        }}
                                    >
                                        <SelectTrigger className={cn("rounded-xl h-9.5", (errors['schedules.0.tch_id'] || errors.tch_id) && 'border-red-500 focus:ring-red-500/20')}>
                                            <SelectValue placeholder="Select teacher" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {teachers.map((t) => (
                                                <SelectItem key={t.tch_id} value={String(t.tch_id)}>
                                                    {teacherFullName(t)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormFieldError label="Teacher" message={errors.tch_id} />
                                </div>

                                {/* Subject */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/90">
                                        Subject <span className="text-destructive">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.subj_id === '' ? '' : String(form.data.subj_id)}
                                        onValueChange={(v) => {
                                            form.setData('subj_id', Number(v));
                                            form.clearErrors('subj_id' as never);
                                        }}
                                    >
                                        <SelectTrigger className={cn("rounded-xl h-9.5", errors['schedules.0.subj_id'] && 'border-red-500 focus:ring-red-500/20')}>
                                            <SelectValue placeholder="Select subject" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {availableSubjects.length === 0 ? (
                                                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                    No subjects available for this grade level.
                                                </p>
                                            ) : (
                                                availableSubjects.map((s) => (
                                                    <SelectItem key={s.subj_id} value={String(s.subj_id)}>
                                                        {s.subj_code} — {s.subj_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormFieldError label="Subject" message={errors['schedules.0.subj_id']} />
                                </div>
                            </div>
                        </div>

                        {/* Time Slots List */}
                        <div className="space-y-4 pt-1">
                            <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                                <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Weekly Schedule Slots
                                </span>
                            </div>

                            {warnings.length > 0 && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:text-amber-300 dark:bg-amber-500/10 space-y-1">
                                    <p className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                                        ⚠️ Live Schedule Conflict Alerts
                                    </p>
                                    <ul className="list-disc pl-4 space-y-0.5 text-amber-600 dark:text-amber-300/80">
                                        {warnings.map((w, idx) => (
                                            <li key={idx}>{w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="space-y-4">
                                {slots.map((slot, index) => {
                                    const dayError =
                                        errors[`schedules.${index}.days`] ??
                                        errors[`schedules.${index}.days.0`] ??
                                        (mode === 'edit' ? errors.day_of_week : undefined);
                                    const startTimeError =
                                        errors[`schedules.${index}.start_time`] ??
                                        (mode === 'edit' ? errors.start_time : undefined);
                                    const endTimeError =
                                        errors[`schedules.${index}.end_time`] ??
                                        (mode === 'edit' ? errors.end_time : undefined);
                                    const roomError =
                                        errors[`schedules.${index}.room_id`] ??
                                        (mode === 'edit' ? errors.room_id : undefined);

                                    const durationText = (() => {
                                        const start = slot.start_time;
                                        const end = slot.end_time;
                                        if (!start || !end || end <= start) return null;
                                        const [startH, startM] = start.split(':').map(Number);
                                        const [endH, endM] = end.split(':').map(Number);
                                        const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                                        if (totalMinutes <= 0) return null;

                                        const hours = Math.floor(totalMinutes / 60);
                                        const minutes = totalMinutes % 60;

                                        const parts = [];
                                        if (hours > 0) parts.push(`${hours}h`);
                                        if (minutes > 0) parts.push(`${minutes}m`);
                                        return parts.join(' ');
                                    })();

                                    return (
                                        <div
                                            key={index}
                                            className="space-y-4 rounded-xl border border-border bg-card/40 pl-6 pr-4 py-4 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md dark:bg-card/10"
                                        >
                                            <div className="absolute inset-y-0 left-0 w-1 bg-linear-to-b from-emerald-500 to-teal-500" />
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-foreground/80 flex items-center gap-1.5">
                                                        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                                                            {index + 1}
                                                        </span>
                                                        {mode === 'edit' ? 'Schedule Details' : `Time Slot`}
                                                    </span>
                                                    {durationText && (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                                                            ⏱️ {durationText}
                                                        </span>
                                                    )}
                                                </div>
                                                {mode === 'create' && slots.length > 1 && (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7.5 rounded-lg px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive active:scale-95 transition-all duration-150"
                                                        onClick={() => handleRemoveSlot(index)}
                                                    >
                                                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                                                        Remove
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Building & Room Selection */}
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-foreground/80">
                                                        Building
                                                    </Label>
                                                    <Select
                                                        value={slot.buildingFilter || 'all-buildings'}
                                                        onValueChange={(value) =>
                                                            updateSlot(index, {
                                                                buildingFilter: value,
                                                                room_id: '',
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className="rounded-xl h-9.5">
                                                            <SelectValue placeholder="All Buildings" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            <SelectItem value="all-buildings">All Buildings</SelectItem>
                                                            {buildings.map((b) => (
                                                                <SelectItem key={b.building_id} value={String(b.building_id)}>
                                                                    {b.building_name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-foreground/80">
                                                        Room <span className="text-destructive">*</span>
                                                    </Label>
                                                    <Select
                                                        value={slot.room_id === '' ? '' : String(slot.room_id)}
                                                        onValueChange={(value) =>
                                                            updateSlot(index, {
                                                                room_id: Number(value),
                                                            })
                                                        }
                                                    >
                                                        <SelectTrigger className={cn("rounded-xl h-9.5", roomError && "border-red-500 focus:ring-red-500/20")}>
                                                            <SelectValue placeholder="Select Room" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {(slot.buildingFilter && slot.buildingFilter !== 'all-buildings'
                                                                ? rooms.filter((r) => r.building_id === Number(slot.buildingFilter))
                                                                : rooms
                                                            ).map((r) => (
                                                                <SelectItem key={r.room_id} value={String(r.room_id)}>
                                                                    {r.room_no} {r.building && `(${r.building.building_name})`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormFieldError label="Room" message={roomError} />
                                                </div>
                                            </div>

                                            {/* Day selection styled as modern enterprise tags */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-foreground/80">
                                                        Meeting Day(s) <span className="text-destructive">*</span>
                                                    </Label>
                                                    {mode === 'create' && (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSlot(index, { days: ['Monday', 'Wednesday', 'Friday'] })}
                                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                                                            >
                                                                MWF
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSlot(index, { days: ['Tuesday', 'Thursday'] })}
                                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                                                            >
                                                                TTh
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateSlot(index, { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] })}
                                                                className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                                                            >
                                                                Weekdays
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {DAYS_OF_WEEK.map((day) => {
                                                        const isChecked = slot.days.includes(day);
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() => toggleDay(index, day)}
                                                                className={cn(
                                                                    "relative flex h-9.5 items-center justify-center rounded-xl border text-xs font-medium transition-all duration-200 active:scale-95 px-3 min-w-[56px] select-none cursor-pointer",
                                                                    isChecked
                                                                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 dark:bg-emerald-500/20 font-bold shadow-xs shadow-emerald-500/10"
                                                                        : "border-border bg-background hover:bg-muted text-muted-foreground"
                                                                )}
                                                            >
                                                                {day.slice(0, 3)}
                                                                {isChecked && (
                                                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <FormFieldError label="Day" message={dayError} />
                                            </div>

                                            {/* Time range layout */}
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor={`start_time_${index}`}
                                                        className="text-xs font-semibold text-foreground/80"
                                                    >
                                                        Start time <span className="text-destructive">*</span>
                                                    </Label>
                                                    <input
                                                        id={`start_time_${index}`}
                                                        type="time"
                                                        value={slot.start_time}
                                                        onChange={(e) =>
                                                            updateSlot(index, {
                                                                start_time: e.target.value,
                                                            })
                                                        }
                                                        className={cn(
                                                            "flex h-12 w-full rounded-xl border bg-background px-4 py-2.5 text-base font-semibold shadow-xs transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                                                            startTimeError ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : "border-border"
                                                        )}
                                                    />
                                                    <FormFieldError
                                                        label="Start time"
                                                        message={startTimeError}
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor={`end_time_${index}`}
                                                        className="text-xs font-semibold text-foreground/80"
                                                    >
                                                        End time <span className="text-destructive">*</span>
                                                    </Label>
                                                    <input
                                                        id={`end_time_${index}`}
                                                        type="time"
                                                        value={slot.end_time}
                                                        onChange={(e) =>
                                                            updateSlot(index, {
                                                                end_time: e.target.value,
                                                            })
                                                        }
                                                        className={cn(
                                                            "flex h-12 w-full rounded-xl border bg-background px-4 py-2.5 text-base font-semibold shadow-xs transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500",
                                                            endTimeError ? "border-red-500 focus:ring-red-500/20 focus:border-red-500" : "border-border"
                                                        )}
                                                    />

                                                    {/* Quick Presets below End Time */}
                                                    {slot.start_time && (
                                                        <div className="flex flex-wrap items-center gap-1 pt-1">
                                                            {[45, 60, 90, 120].map((mins) => {
                                                                const label = mins === 60 ? '1h' : mins === 90 ? '1.5h' : mins === 120 ? '2h' : `${mins}m`;
                                                                return (
                                                                    <button
                                                                        key={mins}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const [h, m] = slot.start_time.split(':').map(Number);
                                                                            const date = new Date();
                                                                            date.setHours(h);
                                                                            date.setMinutes(m + mins);
                                                                            const newH = String(date.getHours()).padStart(2, '0');
                                                                            const newM = String(date.getMinutes()).padStart(2, '0');
                                                                            updateSlot(index, { end_time: `${newH}:${newM}` });
                                                                        }}
                                                                        className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded-md transition-all active:scale-95 cursor-pointer"
                                                                    >
                                                                        +{label}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    )}

                                                    <FormFieldError
                                                        label="End time"
                                                        message={endTimeError}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {mode === 'create' && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddSlot}
                                    className="w-full h-10 rounded-xl border-dashed border-emerald-500/30 hover:border-emerald-500 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/10 hover:bg-emerald-50/20 dark:hover:bg-emerald-500/10 transition-all duration-200 active:scale-[0.99]"
                                >
                                    <Plus className="mr-1.5 h-4 w-4" />
                                    Add Another Time Slot
                                </Button>
                            )}
                        </div>
                    </form>

                    <DialogFooter className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={onClose}
                            disabled={form.processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={form.processing}
                            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {form.processing ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add slot'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
