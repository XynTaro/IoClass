import { useForm } from '@inertiajs/react';
import {
    CalendarClock,
    Plus,
    Trash2,
    BookOpen,
    Calendar,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { FormFieldError } from '@/components/form-field-error';
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
    '07:00',
    '07:15',
    '07:30',
    '07:45',
    '08:00',
    '08:15',
    '08:30',
    '08:45',
    '09:00',
    '09:15',
    '09:30',
    '09:45',
    '10:00',
    '10:15',
    '10:30',
    '10:45',
    '11:00',
    '11:15',
    '11:30',
    '11:45',
    '12:00',
    '12:15',
    '12:30',
    '12:45',
    '13:00',
    '13:15',
    '13:30',
    '13:45',
    '14:00',
    '14:15',
    '14:30',
    '14:45',
    '15:00',
    '15:15',
    '15:30',
    '15:45',
    '16:00',
    '16:15',
    '16:30',
    '16:45',
    '17:00',
    '17:15',
    '17:30',
    '17:45',
    '18:00',
    '18:15',
    '18:30',
    '18:45',
    '19:00',
    '19:15',
    '19:30',
    '19:45',
    '20:00',
    '20:15',
    '20:30',
    '20:45',
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
    allSchedules?: any[];
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
    allSchedules,
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
        {
            room_id: '',
            days: [],
            start_time: '',
            end_time: '',
            buildingFilter: '',
        },
    ]);

    const updateSlot = (index: number, patch: Partial<DayTimeSlot>) => {
        if ('start_time' in patch) {
            form.clearErrors(`schedules.${index}.start_time` as never);
            form.clearErrors(`schedules.${index}.sect_id` as never);
            form.clearErrors('start_time' as never);
            form.clearErrors('sect_id' as never);
        }
        if ('end_time' in patch) {
            form.clearErrors(`schedules.${index}.end_time` as never);
            form.clearErrors('end_time' as never);
            form.clearErrors(`schedules.${index}.start_time` as never);
            form.clearErrors('start_time' as never);
        }
        if ('room_id' in patch) {
            form.clearErrors(`schedules.${index}.room_id` as never);
            form.clearErrors('room_id' as never);
            form.clearErrors(`schedules.${index}.start_time` as never);
            form.clearErrors('start_time' as never);
        }
        if ('buildingFilter' in patch) {
            form.clearErrors(`schedules.${index}.buildingFilter` as never);
            form.clearErrors(`schedules.${index}.building_id` as never);
            form.clearErrors('buildingFilter' as never);
            form.clearErrors('building_id' as never);
        }
        setSlots((current) =>
            current.map((item, i) =>
                i === index ? { ...item, ...patch } : item,
            ),
        );
    };

    const handleAddSlot = () => {
        setSlots((current) => [
            ...current,
            {
                room_id: '',
                days: [],
                start_time: '',
                end_time: '',
                buildingFilter: '',
            },
        ]);
    };

    const handleRemoveSlot = (index: number) => {
        setSlots((current) => current.filter((_, i) => i !== index));
    };

    const toggleDay = (slotIndex: number, day: string) => {
        form.clearErrors(`schedules.${slotIndex}.days` as never);
        form.clearErrors(`schedules.${slotIndex}.days.0` as never);
        form.clearErrors(`schedules.${slotIndex}.start_time` as never);
        form.clearErrors('start_time' as never);
        form.clearErrors('days' as never);
        form.clearErrors('day_of_week' as never);
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
                    start_time: slot.start_time
                        ? slot.start_time.slice(0, 5)
                        : '',
                    end_time: slot.end_time ? slot.end_time.slice(0, 5) : '',
                    buildingFilter:
                        slotRoom?.building_id != null
                            ? String(slotRoom.building_id)
                            : '',
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
                {
                    room_id: '',
                    days: [],
                    start_time: '',
                    end_time: '',
                    buildingFilter: '',
                },
            ]);
        }
    }, [open, mode, slot]);

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
            setSlots([
                {
                    room_id: '',
                    days: [],
                    start_time: '',
                    end_time: '',
                    buildingFilter: '',
                },
            ]);
        }
    }, [open]);

    const scheduleConflicts = useMemo<
        Array<{
            slotIndex: number;
            type: 'section' | 'teacher' | 'room' | 'intra';
            message: string;
        }>
    >(() => {
        if (!allSchedules) return [];
        const result: Array<{
            slotIndex: number;
            type: 'section' | 'teacher' | 'room' | 'intra';
            message: string;
        }> = [];

        const selectedTeacherId = form.data.tch_id
            ? Number(form.data.tch_id)
            : null;
        const teacherObj = selectedTeacherId
            ? teachers.find((t) => t.tch_id === selectedTeacherId)
            : null;
        const teacherName = teacherObj
            ? teacherFullName(teacherObj)
            : selectedTeacherId
              ? `Teacher #${selectedTeacherId}`
              : '';

        for (const [slotIndex, s] of slots.entries()) {
            if (!s.start_time || !s.end_time || !s.days || s.days.length === 0)
                continue;
            const slotStart = s.start_time.slice(0, 5);
            const slotEnd = s.end_time.slice(0, 5);
            if (slotEnd <= slotStart) continue;

            const selectedRoomId = s.room_id ? Number(s.room_id) : null;
            const roomObj = selectedRoomId
                ? rooms.find((r) => r.room_id === selectedRoomId)
                : null;
            const currentRoomName = roomObj?.room_no
                ? `Room ${roomObj.room_no}`
                : selectedRoomId
                  ? `Room #${selectedRoomId}`
                  : 'Room';

            for (const sched of allSchedules) {
                if (mode === 'edit' && slot?.schedule_id === sched.schedule_id)
                    continue;
                if (!s.days.includes(sched.day_of_week)) continue;

                const schedStart = (sched.start_time || '').slice(0, 5);
                const schedEnd = (sched.end_time || '').slice(0, 5);
                if (!schedStart || !schedEnd) continue;

                const hasOverlap =
                    schedStart < slotEnd && schedEnd > slotStart;
                if (!hasOverlap) continue;

                const secName =
                    sched.section?.sect_name ??
                    (sched.sect_id === sectionId
                        ? 'this section'
                        : `Section #${sched.sect_id}`);
                const rmName = sched.room?.room_no
                    ? `Room ${sched.room.room_no}`
                    : sched.room_id
                      ? `Room #${sched.room_id}`
                      : 'Room';
                const schedTeacherName = sched.teacher
                    ? teacherFullName(sched.teacher)
                    : sched.tch_id
                      ? `Teacher #${sched.tch_id}`
                      : 'Teacher';
                const schedSubjName =
                    sched.subject?.subj_name ??
                    sched.subject?.subj_code ??
                    (sched.subj_id
                        ? `Subject #${sched.subj_id}`
                        : 'a subject');

                // 1. Section conflict: this section already has an assigned teacher/subject at that time
                if (sched.sect_id === sectionId) {
                    result.push({
                        slotIndex,
                        type: 'section',
                        message: `This section already has ${schedSubjName} (${schedTeacherName}) scheduled on ${sched.day_of_week} (${schedStart} - ${schedEnd}) in ${rmName}.`,
                    });
                }

                // 2. Teacher conflict: selected teacher is already teaching at that time
                if (
                    selectedTeacherId &&
                    sched.tch_id === selectedTeacherId &&
                    sched.sect_id !== sectionId
                ) {
                    result.push({
                        slotIndex,
                        type: 'teacher',
                        message: `Teacher ${teacherName} already has a class on ${sched.day_of_week} (${schedStart} - ${schedEnd}) with ${secName} in ${rmName}.`,
                    });
                }

                // 3. Room conflict: selected room is already occupied
                if (
                    selectedRoomId &&
                    sched.room_id === selectedRoomId &&
                    sched.sect_id !== sectionId
                ) {
                    result.push({
                        slotIndex,
                        type: 'room',
                        message: `${currentRoomName} is already occupied by Section ${secName} on ${sched.day_of_week} (${schedStart} - ${schedEnd}).`,
                    });
                }
            }

            // 4. Intra-batch conflict between multiple slots
            for (let oIdx = 0; oIdx < slotIndex; oIdx++) {
                const other = slots[oIdx];
                if (
                    !other.start_time ||
                    !other.end_time ||
                    !other.days ||
                    other.days.length === 0
                )
                    continue;
                const oStart = other.start_time.slice(0, 5);
                const oEnd = other.end_time.slice(0, 5);
                if (oEnd <= oStart) continue;

                const commonDays = s.days.filter((d) =>
                    other.days.includes(d),
                );
                if (
                    commonDays.length > 0 &&
                    slotStart < oEnd &&
                    slotEnd > oStart
                ) {
                    result.push({
                        slotIndex,
                        type: 'intra',
                        message: `Slot #${slotIndex + 1} conflicts with Slot #${oIdx + 1} on ${commonDays.join(', ')} (${oStart} - ${oEnd}).`,
                    });
                }
            }
        }

        return result;
    }, [
        allSchedules,
        form.data.tch_id,
        slots,
        teachers,
        rooms,
        mode,
        slot?.schedule_id,
        sectionId,
    ]);

    const warnings = useMemo(() => {
        const list: string[] = [];

        scheduleConflicts.forEach((c) => {
            if (!list.includes(c.message)) {
                list.push(c.message);
            }
        });

        slots.forEach((s, idx) => {
            if (s.start_time && s.end_time && s.end_time <= s.start_time) {
                list.push(
                    `Slot #${idx + 1}: End time must be after start time.`,
                );
            }
        });

        return list;
    }, [scheduleConflicts, slots]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'edit' && slot) {
            const firstSlot = slots[0];
            const errors: Record<string, string> = {};
            if (!form.data.tch_id) errors.tch_id = 'Teacher is required.';
            if (!form.data.subj_id) errors.subj_id = 'Subject is required.';
            if (!firstSlot.buildingFilter || firstSlot.buildingFilter === 'all-buildings') {
                errors.buildingFilter = 'Building is required.';
            }
            if (!firstSlot.room_id) errors.room_id = 'Room is required.';
            if (!firstSlot.days || firstSlot.days.length === 0)
                errors.days = 'Day is required.';
            if (!firstSlot.start_time)
                errors.start_time = 'Start time is required.';
            if (!firstSlot.end_time) errors.end_time = 'End time is required.';
            else if (
                firstSlot.start_time &&
                firstSlot.end_time <= firstSlot.start_time
            ) {
                errors.end_time = 'End time must be after start time.';
            }

            scheduleConflicts.forEach((c) => {
                errors.start_time = c.message;
                if (c.type === 'teacher') {
                    errors.tch_id = c.message;
                } else if (c.type === 'room') {
                    errors.room_id = c.message;
                } else if (c.type === 'section') {
                    errors.subj_id = c.message;
                }
            });

            if (Object.keys(errors).length > 0) {
                form.setError(errors);
                return;
            }

            form.transform((data) => ({
                tch_id: data.tch_id,
                sect_id: sectionId,
                subj_id: data.subj_id,
                room_id: firstSlot.room_id,
                day_of_week: firstSlot.days[0] ?? '',
                start_time: firstSlot.start_time
                    ? firstSlot.start_time.slice(0, 5)
                    : '',
                end_time: firstSlot.end_time
                    ? firstSlot.end_time.slice(0, 5)
                    : '',
            }));

            form.put(
                route('admin.schedule.update', { schedule: slot.schedule_id }),
                {
                    onSuccess: () => {
                        onSuccess?.();
                        onClose();
                    },
                },
            );
            return;
        }

        const createErrors: Record<string, string> = {};
        if (!form.data.tch_id) createErrors.tch_id = 'Teacher is required.';
        if (!form.data.subj_id) createErrors.subj_id = 'Subject is required.';

        slots.forEach((s, idx) => {
            if (!s.buildingFilter || s.buildingFilter === 'all-buildings') {
                createErrors[`schedules.${idx}.buildingFilter`] = 'Building is required.';
            }
            if (!s.room_id) {
                createErrors[`schedules.${idx}.room_id`] = 'Room is required.';
            }
            if (!s.days || s.days.length === 0) {
                createErrors[`schedules.${idx}.days`] = 'Day is required.';
            }
            if (!s.start_time) {
                createErrors[`schedules.${idx}.start_time`] = 'Start time is required.';
            }
            if (!s.end_time) {
                createErrors[`schedules.${idx}.end_time`] = 'End time is required.';
            } else if (s.start_time && s.end_time <= s.start_time) {
                createErrors[`schedules.${idx}.end_time`] = 'End time must be after start time.';
            }
        });

        scheduleConflicts.forEach((c) => {
            createErrors[`schedules.${c.slotIndex}.start_time`] = c.message;
            if (c.slotIndex === 0) {
                createErrors.start_time = c.message;
            }
            if (c.type === 'teacher') {
                createErrors.tch_id = c.message;
                createErrors[`schedules.${c.slotIndex}.tch_id`] = c.message;
            } else if (c.type === 'room') {
                createErrors[`schedules.${c.slotIndex}.room_id`] = c.message;
            } else if (c.type === 'section') {
                createErrors.subj_id = c.message;
                createErrors['schedules.0.subj_id'] = c.message;
            }
        });

        if (Object.keys(createErrors).length > 0) {
            form.setError(createErrors as any);
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

    const errors = form.errors as Record<string, string>;
    const teacherError =
        errors.tch_id ||
        errors['schedules.0.tch_id'] ||
        Object.entries(errors).find(([k]) => k.includes('tch_id'))?.[1];

    const subjectError =
        errors.subj_id ||
        errors['schedules.0.subj_id'] ||
        Object.entries(errors).find(([k]) => k.includes('subj_id'))?.[1];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-2xl">
                <div className="space-y-4 p-6 pt-4">
                    <ModalHeader
                        icon={CalendarClock}
                        tone="emerald"
                        title={
                            mode === 'edit'
                                ? 'Edit Schedule Slot'
                                : 'Add Schedule Slot'
                        }
                        description={`Teacher, subject, room, day, and time for Grade Level ${sectionGrLevel}`}
                    />

                    <form
                        onSubmit={handleSubmit}
                        className="max-h-[72vh] space-y-5 overflow-y-auto pr-2"
                    >
                        {/* Class Allocation details wrapper */}
                        <div className="space-y-4 rounded-xl border border-border bg-linear-to-b from-card to-muted/25 p-4 shadow-xs dark:from-card/5 dark:to-muted/5">
                            <div className="mb-1 flex items-center gap-2 border-b border-border/20 pb-2">
                                <BookOpen className="size-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Class Details
                                </span>
                            </div>

                            {/* Teacher and Subject fields side-by-side */}
                            <div className="grid gap-3 sm:grid-cols-2">
                                {/* Teacher */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/90">
                                        Teacher{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={
                                            form.data.tch_id === ''
                                                ? ''
                                                : String(form.data.tch_id)
                                        }
                                        onValueChange={(v) => {
                                            form.setData('tch_id', Number(v));
                                            form.clearErrors('tch_id' as never);
                                            form.clearErrors('schedules.0.tch_id' as never);
                                            form.clearErrors('start_time' as never);
                                            form.clearErrors('schedules.0.start_time' as never);
                                        }}
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                'h-9.5 rounded-xl',
                                                teacherError &&
                                                'border-red-500 focus:ring-red-500/20',
                                            )}
                                        >
                                            <SelectValue placeholder="Select teacher" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {teachers.map((t) => (
                                                <SelectItem
                                                    key={t.tch_id}
                                                    value={String(t.tch_id)}
                                                >
                                                    {teacherFullName(t)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormFieldError
                                        label="Teacher"
                                        message={teacherError}
                                    />
                                </div>

                                {/* Subject */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold text-foreground/90">
                                        Subject{' '}
                                        <span className="text-destructive">
                                            *
                                        </span>
                                    </Label>
                                    <Select
                                        value={
                                            form.data.subj_id === ''
                                                ? ''
                                                : String(form.data.subj_id)
                                        }
                                        onValueChange={(v) => {
                                            form.setData('subj_id', Number(v));
                                            form.clearErrors(
                                                'subj_id' as never,
                                            );
                                            form.clearErrors(
                                                'schedules.0.subj_id' as never,
                                            );
                                        }}
                                    >
                                        <SelectTrigger
                                            className={cn(
                                                'h-9.5 rounded-xl',
                                                subjectError &&
                                                'border-red-500 focus:ring-red-500/20',
                                            )}
                                        >
                                            <SelectValue placeholder="Select subject" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {availableSubjects.length === 0 ? (
                                                <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                                                    No subjects available for
                                                    this grade level.
                                                </p>
                                            ) : (
                                                availableSubjects.map((s) => (
                                                    <SelectItem
                                                        key={s.subj_id}
                                                        value={String(
                                                            s.subj_id,
                                                        )}
                                                    >
                                                        {s.subj_code} —{' '}
                                                        {s.subj_name}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormFieldError
                                        label="Subject"
                                        message={subjectError}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Time Slots List */}
                        <div className="space-y-4 pt-1">
                            <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                                <Calendar className="size-4 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                    Weekly Schedule Slots
                                </span>
                            </div>

                            {warnings.length > 0 && (
                                <div className="space-y-1 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                                    <p className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
                                        ⚠️ Live Schedule Conflict Alerts
                                    </p>
                                    <ul className="list-disc space-y-0.5 pl-4 text-amber-600 dark:text-amber-300/80">
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
                                        (index === 0
                                            ? (errors.day_of_week ?? errors.days)
                                            : undefined);
                                    const startTimeError =
                                        errors[
                                        `schedules.${index}.start_time`
                                        ] ??
                                        errors[`schedules.${index}.sect_id`] ??
                                        (index === 0
                                            ? (errors.start_time ?? errors.sect_id)
                                            : undefined);
                                    const endTimeError =
                                        errors[`schedules.${index}.end_time`] ??
                                        (index === 0
                                            ? errors.end_time
                                            : undefined);
                                    const buildingError =
                                        errors[`schedules.${index}.buildingFilter`] ??
                                        errors[`schedules.${index}.building_id`] ??
                                        (index === 0
                                            ? (errors.buildingFilter ?? errors.building_id)
                                            : undefined);
                                    const roomError =
                                        errors[`schedules.${index}.room_id`] ??
                                        (index === 0
                                            ? errors.room_id
                                            : undefined);

                                    const durationText = (() => {
                                        const start = slot.start_time;
                                        const end = slot.end_time;
                                        if (!start || !end || end <= start)
                                            return null;
                                        const [startH, startM] = start
                                            .split(':')
                                            .map(Number);
                                        const [endH, endM] = end
                                            .split(':')
                                            .map(Number);
                                        const totalMinutes =
                                            endH * 60 +
                                            endM -
                                            (startH * 60 + startM);
                                        if (totalMinutes <= 0) return null;

                                        const hours = Math.floor(
                                            totalMinutes / 60,
                                        );
                                        const minutes = totalMinutes % 60;

                                        const parts = [];
                                        if (hours > 0) parts.push(`${hours}h`);
                                        if (minutes > 0)
                                            parts.push(`${minutes}m`);
                                        return parts.join(' ');
                                    })();

                                    return (
                                        <div
                                            key={index}
                                            className="space-y-4 rounded-xl border border-border bg-card/40 p-4 shadow-xs transition-all duration-200 hover:shadow-md dark:bg-card/10"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                                                        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-black text-emerald-600 dark:text-emerald-400">
                                                            {index + 1}
                                                        </span>
                                                        {mode === 'edit'
                                                            ? 'Schedule Details'
                                                            : `Time Slot`}
                                                    </span>
                                                    {durationText && (
                                                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                                            ⏱️ {durationText}
                                                        </span>
                                                    )}
                                                </div>
                                                {mode === 'create' &&
                                                    slots.length > 1 && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7.5 rounded-lg px-2 text-xs text-destructive transition-all duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                                                            onClick={() =>
                                                                handleRemoveSlot(
                                                                    index,
                                                                )
                                                            }
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
                                                        Building{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Select
                                                        value={
                                                            slot.buildingFilter || ''
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) => {
                                                            updateSlot(index, {
                                                                buildingFilter:
                                                                    value,
                                                                room_id: '',
                                                            });
                                                            form.clearErrors(
                                                                `schedules.${index}.buildingFilter` as never,
                                                            );
                                                            form.clearErrors(
                                                                `schedules.${index}.building_id` as never,
                                                            );
                                                            if (mode === 'edit') {
                                                                form.clearErrors('buildingFilter' as never);
                                                                form.clearErrors('building_id' as never);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            className={cn(
                                                                'h-9.5 rounded-xl',
                                                                buildingError &&
                                                                    'border-red-500 focus:ring-red-500/20',
                                                            )}
                                                        >
                                                            <SelectValue placeholder="Select Building" />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {buildings.map(
                                                                (b) => (
                                                                    <SelectItem
                                                                        key={
                                                                            b.building_id
                                                                        }
                                                                        value={String(
                                                                            b.building_id,
                                                                        )}
                                                                    >
                                                                        {
                                                                            b.building_name
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormFieldError
                                                        label="Building"
                                                        message={buildingError}
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <Label className="text-xs font-semibold text-foreground/80">
                                                        Room{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <Select
                                                        value={
                                                            slot.room_id === ''
                                                                ? ''
                                                                : String(
                                                                    slot.room_id,
                                                                )
                                                        }
                                                        disabled={!slot.buildingFilter || slot.buildingFilter === 'all-buildings'}
                                                        onValueChange={(
                                                            value,
                                                        ) => {
                                                            updateSlot(index, {
                                                                room_id:
                                                                    Number(
                                                                        value,
                                                                    ),
                                                            });
                                                            form.clearErrors(`schedules.${index}.room_id` as never);
                                                            if (mode === 'edit') {
                                                                form.clearErrors('room_id' as never);
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger
                                                            className={cn(
                                                                'h-9.5 rounded-xl',
                                                                roomError &&
                                                                'border-red-500 focus:ring-red-500/20',
                                                            )}
                                                        >
                                                            <SelectValue
                                                                placeholder={
                                                                    !slot.buildingFilter || slot.buildingFilter === 'all-buildings'
                                                                        ? 'Select building first'
                                                                        : 'Select Room'
                                                                }
                                                            />
                                                        </SelectTrigger>
                                                        <SelectContent className="rounded-xl">
                                                            {(slot.buildingFilter &&
                                                            slot.buildingFilter !==
                                                                'all-buildings'
                                                                ? rooms.filter(
                                                                    (r) =>
                                                                        r.building_id ===
                                                                        Number(
                                                                            slot.buildingFilter,
                                                                        ),
                                                                )
                                                                : []
                                                            ).map((r) => (
                                                                <SelectItem
                                                                    key={
                                                                        r.room_id
                                                                    }
                                                                    value={String(
                                                                        r.room_id,
                                                                    )}
                                                                >
                                                                    {r.room_no}{' '}
                                                                    {r.building &&
                                                                        `(${r.building.building_name})`}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormFieldError
                                                        label="Room"
                                                        message={roomError}
                                                    />
                                                </div>
                                            </div>

                                            {/* Day selection styled as modern enterprise tags */}
                                            <div className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <Label className="text-xs font-semibold text-foreground/80">
                                                        Meeting Day(s){' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    {mode === 'create' && (
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateSlot(
                                                                        index,
                                                                        {
                                                                            days: [
                                                                                'Monday',
                                                                                'Wednesday',
                                                                                'Friday',
                                                                            ],
                                                                        },
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                                                            >
                                                                MWF
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateSlot(
                                                                        index,
                                                                        {
                                                                            days: [
                                                                                'Tuesday',
                                                                                'Thursday',
                                                                            ],
                                                                        },
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                                                            >
                                                                TTh
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateSlot(
                                                                        index,
                                                                        {
                                                                            days: [
                                                                                'Monday',
                                                                                'Tuesday',
                                                                                'Wednesday',
                                                                                'Thursday',
                                                                                'Friday',
                                                                            ],
                                                                        },
                                                                    )
                                                                }
                                                                className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                                                            >
                                                                Weekdays
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {DAYS_OF_WEEK.map((day) => {
                                                        const isChecked =
                                                            slot.days.includes(
                                                                day,
                                                            );
                                                        return (
                                                            <button
                                                                key={day}
                                                                type="button"
                                                                onClick={() =>
                                                                    toggleDay(
                                                                        index,
                                                                        day,
                                                                    )
                                                                }
                                                                className={cn(
                                                                    'relative flex h-9.5 min-w-[56px] cursor-pointer items-center justify-center rounded-xl border px-3 text-xs font-medium transition-all duration-200 select-none active:scale-95',
                                                                    isChecked
                                                                        ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-700 shadow-xs shadow-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400'
                                                                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                                                                )}
                                                            >
                                                                {day.slice(
                                                                    0,
                                                                    3,
                                                                )}
                                                                {isChecked && (
                                                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-background" />
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                <FormFieldError
                                                    label="Day"
                                                    message={dayError}
                                                />
                                            </div>

                                            {/* Time range layout */}
                                            <div className="grid gap-3 sm:grid-cols-2">
                                                <div className="space-y-1.5">
                                                    <Label
                                                        htmlFor={`start_time_${index}`}
                                                        className="text-xs font-semibold text-foreground/80"
                                                    >
                                                        Start time{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <input
                                                        id={`start_time_${index}`}
                                                        type="time"
                                                        value={slot.start_time}
                                                        onChange={(e) =>
                                                            updateSlot(index, {
                                                                start_time:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className={cn(
                                                            'flex h-12 w-full rounded-xl border bg-background px-4 py-2.5 text-base font-semibold shadow-xs transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden',
                                                            startTimeError
                                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                                                : 'border-border',
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
                                                        End time{' '}
                                                        <span className="text-destructive">
                                                            *
                                                        </span>
                                                    </Label>
                                                    <input
                                                        id={`end_time_${index}`}
                                                        type="time"
                                                        value={slot.end_time}
                                                        onChange={(e) =>
                                                            updateSlot(index, {
                                                                end_time:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className={cn(
                                                            'flex h-12 w-full rounded-xl border bg-background px-4 py-2.5 text-base font-semibold shadow-xs transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden',
                                                            endTimeError
                                                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                                                : 'border-border',
                                                        )}
                                                    />

                                                    {/* Quick Presets below End Time */}
                                                    {slot.start_time && (
                                                        <div className="flex flex-wrap items-center gap-1 pt-1">
                                                            {[
                                                                45, 60, 90, 120,
                                                            ].map((mins) => {
                                                                const label =
                                                                    mins === 60
                                                                        ? '1h'
                                                                        : mins ===
                                                                            90
                                                                            ? '1.5h'
                                                                            : mins ===
                                                                                120
                                                                                ? '2h'
                                                                                : `${mins}m`;
                                                                return (
                                                                    <button
                                                                        key={
                                                                            mins
                                                                        }
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const [
                                                                                h,
                                                                                m,
                                                                            ] =
                                                                                slot.start_time
                                                                                    .split(
                                                                                        ':',
                                                                                    )
                                                                                    .map(
                                                                                        Number,
                                                                                    );
                                                                            const date =
                                                                                new Date();
                                                                            date.setHours(
                                                                                h,
                                                                            );
                                                                            date.setMinutes(
                                                                                m +
                                                                                mins,
                                                                            );
                                                                            const newH =
                                                                                String(
                                                                                    date.getHours(),
                                                                                ).padStart(
                                                                                    2,
                                                                                    '0',
                                                                                );
                                                                            const newM =
                                                                                String(
                                                                                    date.getMinutes(),
                                                                                ).padStart(
                                                                                    2,
                                                                                    '0',
                                                                                );
                                                                            updateSlot(
                                                                                index,
                                                                                {
                                                                                    end_time: `${newH}:${newM}`,
                                                                                },
                                                                            );
                                                                        }}
                                                                        className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
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
                                    className="h-10 w-full rounded-xl border-dashed border-emerald-500/30 bg-emerald-50/10 text-xs font-bold text-emerald-600 transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-50/20 active:scale-[0.99] dark:text-emerald-400 dark:hover:bg-emerald-500/10"
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
                            {form.processing
                                ? 'Saving…'
                                : mode === 'edit'
                                    ? 'Save changes'
                                    : 'Add slot'}
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
