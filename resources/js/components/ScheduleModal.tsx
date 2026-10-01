import { router, useForm, usePage } from '@inertiajs/react';
import {
    CalendarDays,
    Check,
    ChevronLeft,
    MapPin,
    Plus,
    Trash2,
    UserRound,
    WifiOff,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import type { AddressFormData, PendingTeacherData } from '@/components/Address';
import { ModalHeader, ModalStepIndicator } from '@/components/modal-header';
import { cn } from '@/lib/utils';
import { useOnlineStatus } from '@/hooks/use-online-status';
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

const CREATE_STEPS = [
    { label: 'Teacher', icon: UserRound },
    { label: 'Address', icon: MapPin },
    { label: 'Schedule', icon: CalendarDays },
];

export type PendingTeacherWithAddressData = PendingTeacherData &
    AddressFormData;

export const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
] as const;

const WEEKDAYS = DAYS_OF_WEEK.slice(0, 5);

export interface ScheduleSection {
    sect_id: number;
    sect_name: string;
    gr_level: string;
}

export interface ScheduleRoom {
    room_id: number;
    room_no: string;
    building_id: number | null;
    building?: { building_id: number; building_name: string } | null;
}

export interface ScheduleSubject {
    subj_id: number;
    subj_code: string;
    subj_name: string;
}

export interface Schedule {
    schedule_id?: number;
    sect_id: number;
    room_id: number;
    subj_id: number;
    day_of_week: string;
    start_time: string;
    end_time: string;
    is_adviser: boolean;
    adviser_sect_id: number | null;
}

export interface ScheduleSlotPayload {
    sect_id: number;
    room_id: number;
    subj_id: number;
    days: string[];
    start_time: string;
    end_time: string;
}

interface ScheduleSlotState {
    gradeFilter: string;
    buildingFilter: string;
    sect_id: number | '';
    room_id: number | '';
    subj_id: number | '';
    days: string[];
    start_time: string;
    end_time: string;
}

interface AdviserFormData {
    is_adviser: boolean;
    adviser_sect_id: number | '';
}

interface ScheduleModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    schedule?: Schedule;
    mode: 'create' | 'edit';
    sections: ScheduleSection[];
    rooms: ScheduleRoom[];
    subjects: ScheduleSubject[];
    teacherData?: PendingTeacherWithAddressData;
    teacherId?: number;
    onBack?: () => void;
}

function createEmptySlot(): ScheduleSlotState {
    return {
        gradeFilter: '',
        buildingFilter: '',
        sect_id: '',
        room_id: '',
        subj_id: '',
        days: [],
        start_time: '',
        end_time: '',
    };
}

function slotToPayload(slot: ScheduleSlotState): ScheduleSlotPayload {
    return {
        sect_id: Number(slot.sect_id),
        room_id: Number(slot.room_id),
        subj_id: Number(slot.subj_id),
        days: slot.days,
        start_time: slot.start_time ? slot.start_time.slice(0, 5) : '',
        end_time: slot.end_time ? slot.end_time.slice(0, 5) : '',
    };
}

function slotFieldError(
    errors: Record<string, string>,
    index: number,
    field: string,
    isEdit = false,
): string | undefined {
    if (isEdit) {
        return errors[field] ?? errors[`schedules.${index}.${field}`];
    }
    return errors[`schedules.${index}.${field}`];
}

interface ScheduleSlotEditorProps {
    slot: ScheduleSlotState;
    index: number;
    canRemove: boolean;
    sections: ScheduleSection[];
    rooms: ScheduleRoom[];
    subjects: ScheduleSubject[];
    gradeLevels: string[];
    buildings: { building_id: number; building_name: string }[];
    errors: Record<string, string>;
    singleDayOnly?: boolean;
    isEditMode?: boolean;
    onChange: (index: number, slot: ScheduleSlotState) => void;
    onRemove: (index: number) => void;
}

function ScheduleSlotEditor({
    slot,
    index,
    canRemove,
    sections,
    rooms,
    subjects,
    gradeLevels,
    buildings,
    errors,
    singleDayOnly = false,
    isEditMode = false,
    onChange,
    onRemove,
}: ScheduleSlotEditorProps) {
    const filteredSections =
        slot.gradeFilter && slot.gradeFilter !== 'all'
            ? sections.filter((s) => s.gr_level === slot.gradeFilter)
            : sections;

    const filteredRooms =
        slot.buildingFilter && slot.buildingFilter !== 'all'
            ? rooms.filter((r) => r.building_id === Number(slot.buildingFilter))
            : [];

    const updateSlot = (patch: Partial<ScheduleSlotState>) => {
        onChange(index, { ...slot, ...patch });
    };

    const toggleDay = (day: string) => {
        if (singleDayOnly) {
            updateSlot({ days: [day] });
            return;
        }

        const days = slot.days.includes(day)
            ? slot.days.filter((d) => d !== day)
            : [...slot.days, day];

        updateSlot({ days });
    };

    const selectDays = (days: readonly string[]) => {
        updateSlot({ days: [...days] });
    };

    const sectError = slotFieldError(errors, index, 'sect_id', isEditMode);
    const buildingError = slotFieldError(
        errors,
        index,
        'buildingFilter',
        isEditMode,
    );
    const roomError = slotFieldError(errors, index, 'room_id', isEditMode);
    const subjError = slotFieldError(errors, index, 'subj_id', isEditMode);
    const startTimeError = slotFieldError(
        errors,
        index,
        'start_time',
        isEditMode,
    );
    const endTimeError = slotFieldError(errors, index, 'end_time', isEditMode);
    const dayError = isEditMode
        ? (errors.day_of_week ??
          errors.days ??
          errors[`schedules.${index}.days`] ??
          errors[`schedules.${index}.days.0`])
        : (errors[`schedules.${index}.days`] ??
          errors[`schedules.${index}.days.0`]);

    const durationText = (() => {
        const start = slot.start_time;
        const end = slot.end_time;
        if (!start || !end || end <= start) return null;
        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        const totalMinutes = endH * 60 + endM - (startH * 60 + startM);
        if (totalMinutes <= 0) return null;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        const parts = [];
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        return parts.join(' ');
    })();

    return (
        <div className="space-y-4 rounded-xl border border-border bg-card/40 p-4 shadow-xs transition-all duration-200 hover:shadow-md dark:bg-card/10">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-foreground/80">
                        <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-black text-emerald-600 dark:text-emerald-400">
                            {index + 1}
                        </span>
                        {singleDayOnly
                            ? 'Schedule Slot'
                            : `Time Slot ${index + 1}`}
                    </span>
                    {durationText && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/10 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            ⏱️ {durationText}
                        </span>
                    )}
                </div>
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7.5 rounded-lg px-2 text-xs text-destructive transition-all duration-150 hover:bg-destructive/10 hover:text-destructive active:scale-95"
                        onClick={() => onRemove(index)}
                    >
                        <Trash2 className="mr-1 h-3.5 w-3.5" />
                        Remove
                    </Button>
                )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                        Grade Level
                    </Label>
                    <Select
                        value={slot.gradeFilter || 'all'}
                        onValueChange={(value) =>
                            updateSlot({
                                gradeFilter: value === 'all' ? '' : value,
                                sect_id: '',
                            })
                        }
                    >
                        <SelectTrigger className="h-9.5 rounded-xl">
                            <SelectValue placeholder="All grade levels" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">
                                All grade levels
                            </SelectItem>
                            {gradeLevels.map((g) => (
                                <SelectItem key={g} value={g}>
                                    {g}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                        Section <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={slot.sect_id === '' ? '' : String(slot.sect_id)}
                        onValueChange={(v) =>
                            updateSlot({ sect_id: Number(v) })
                        }
                    >
                        <SelectTrigger
                            className={cn(
                                'h-9.5 rounded-xl',
                                sectError && 'border-red-500 focus:ring-red-500/20',
                            )}
                        >
                            <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {filteredSections.map((s) => (
                                <SelectItem
                                    key={s.sect_id}
                                    value={String(s.sect_id)}
                                >
                                    {slot.gradeFilter &&
                                    slot.gradeFilter !== 'all'
                                        ? s.sect_name
                                        : `${s.gr_level} — ${s.sect_name}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormFieldError label="Section" message={sectError} />
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                        Building <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={slot.buildingFilter || ''}
                        onValueChange={(value) =>
                            updateSlot({
                                buildingFilter: value === 'all' ? '' : value,
                                room_id: '',
                            })
                        }
                    >
                        <SelectTrigger
                            className={cn(
                                'h-9.5 rounded-xl',
                                buildingError && 'border-red-500 focus:ring-red-500/20',
                            )}
                        >
                            <SelectValue placeholder="Select building" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {buildings.map((b) => (
                                <SelectItem
                                    key={b.building_id}
                                    value={String(b.building_id)}
                                >
                                    {b.building_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormFieldError label="Building" message={buildingError} />
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                        Room <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={slot.room_id === '' ? '' : String(slot.room_id)}
                        disabled={!slot.buildingFilter || slot.buildingFilter === 'all'}
                        onValueChange={(v) =>
                            updateSlot({ room_id: Number(v) })
                        }
                    >
                        <SelectTrigger
                            className={cn(
                                'h-9.5 rounded-xl',
                                roomError && 'border-red-500 focus:ring-red-500/20',
                            )}
                        >
                            <SelectValue
                                placeholder={
                                    !slot.buildingFilter || slot.buildingFilter === 'all'
                                        ? 'Select building first'
                                        : 'Select room'
                                }
                            />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {filteredRooms.map((r) => (
                                <SelectItem
                                    key={r.room_id}
                                    value={String(r.room_id)}
                                >
                                    {r.room_no}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormFieldError label="Room" message={roomError} />
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-foreground/80">
                    Subject <span className="text-destructive">*</span>
                </Label>
                <Select
                    value={slot.subj_id === '' ? '' : String(slot.subj_id)}
                    onValueChange={(v) => updateSlot({ subj_id: Number(v) })}
                >
                    <SelectTrigger
                        className={cn(
                            'h-9.5 rounded-xl',
                            subjError && 'border-red-500 focus:ring-red-500/20',
                        )}
                    >
                        <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        {subjects.map((s) => (
                            <SelectItem
                                key={s.subj_id}
                                value={String(s.subj_id)}
                            >
                                {s.subj_code} — {s.subj_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormFieldError label="Subject" message={subjError} />
            </div>

            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground/80">
                        Meeting Day(s) <span className="text-destructive">*</span>
                    </Label>
                    {!singleDayOnly && (
                        <div className="flex items-center gap-1.5">
                            <button
                                type="button"
                                onClick={() =>
                                    selectDays([
                                        'Monday',
                                        'Wednesday',
                                        'Friday',
                                    ])
                                }
                                className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                            >
                                MWF
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    selectDays(['Tuesday', 'Thursday'])
                                }
                                className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                            >
                                TTh
                            </button>
                            <button
                                type="button"
                                onClick={() => selectDays(WEEKDAYS)}
                                className="cursor-pointer rounded-md bg-emerald-500/5 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                            >
                                Weekdays
                            </button>
                            <button
                                type="button"
                                onClick={() => selectDays([])}
                                className="cursor-pointer rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-all hover:bg-muted/80 active:scale-95"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                    {WEEKDAYS.map((day) => {
                        const isChecked = slot.days.includes(day);
                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => toggleDay(day)}
                                className={cn(
                                    'relative flex h-9.5 min-w-[56px] cursor-pointer items-center justify-center rounded-xl border px-3 text-xs font-medium transition-all duration-200 select-none active:scale-95',
                                    isChecked
                                        ? 'border-emerald-500 bg-emerald-500/10 font-bold text-emerald-700 shadow-xs shadow-emerald-500/10 dark:bg-emerald-500/20 dark:text-emerald-400'
                                        : 'border-border bg-background text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {day.slice(0, 3)}
                                {isChecked && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 ring-2 ring-background" />
                                )}
                            </button>
                        );
                    })}
                </div>
                <FormFieldError label="Days" message={dayError} />
            </div>

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
                            updateSlot({ start_time: e.target.value })
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
                        End time <span className="text-destructive">*</span>
                    </Label>
                    <input
                        id={`end_time_${index}`}
                        type="time"
                        value={slot.end_time}
                        onChange={(e) =>
                            updateSlot({ end_time: e.target.value })
                        }
                        className={cn(
                            'flex h-12 w-full rounded-xl border bg-background px-4 py-2.5 text-base font-semibold shadow-xs transition-all duration-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden',
                            endTimeError
                                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                : 'border-border',
                        )}
                    />

                    {/* Quick Duration Presets below End Time */}
                    {slot.start_time && (
                        <div className="flex flex-wrap items-center gap-1 pt-1">
                            {[45, 60, 90, 120].map((mins) => {
                                const label =
                                    mins === 60
                                        ? '1h'
                                        : mins === 90
                                            ? '1.5h'
                                            : mins === 120
                                                ? '2h'
                                                : `${mins}m`;
                                return (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => {
                                            const [h, m] = slot.start_time
                                                .split(':')
                                                .map(Number);
                                            const date = new Date();
                                            date.setHours(h);
                                            date.setMinutes(m + mins);
                                            const newH = String(
                                                date.getHours(),
                                            ).padStart(2, '0');
                                            const newM = String(
                                                date.getMinutes(),
                                            ).padStart(2, '0');
                                            updateSlot({
                                                end_time: `${newH}:${newM}`,
                                            });
                                        }}
                                        className="cursor-pointer rounded-md bg-emerald-500/5 px-2 py-0.5 text-[10px] font-bold text-emerald-600 transition-all hover:bg-emerald-500/10 active:scale-95 dark:text-emerald-400"
                                    >
                                        +{label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                    <FormFieldError label="End time" message={endTimeError} />
                </div>
            </div>
        </div>
    );
}

export default function ScheduleModal({
    open,
    onClose,
    onSuccess,
    schedule,
    mode,
    sections,
    rooms,
    subjects,
    teacherData,
    teacherId,
    onBack,
}: ScheduleModalProps) {
    const [slots, setSlots] = useState<ScheduleSlotState[]>([
        createEmptySlot(),
    ]);
    const [adviserGradeFilter, setAdviserGradeFilter] = useState('');
    const [isSkipping, setIsSkipping] = useState(false);

    const adviserForm = useForm<AdviserFormData>({
        is_adviser: false,
        adviser_sect_id: '',
    });

    const submitForm = useForm({});

    const isEditMode = mode === 'edit' && !!schedule?.schedule_id;
    const showAdviser = !!teacherData;

    const gradeLevels = useMemo(
        () =>
            [...new Set(sections.map((s) => s.gr_level).filter(Boolean))].sort(
                (a, b) => a.localeCompare(b, undefined, { numeric: true }),
            ),
        [sections],
    );

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

    const adviserSections = useMemo(
        () =>
            adviserGradeFilter && adviserGradeFilter !== 'all'
                ? sections.filter((s) => s.gr_level === adviserGradeFilter)
                : sections,
        [sections, adviserGradeFilter],
    );

    useEffect(() => {
        if (!schedule || mode !== 'edit' || !open) {
            return;
        }

        const sect = sections.find((s) => s.sect_id === schedule.sect_id);
        const room = rooms.find((r) => r.room_id === schedule.room_id);

        setSlots([
            {
                gradeFilter: sect?.gr_level ?? '',
                buildingFilter:
                    room?.building_id != null ? String(room.building_id) : '',
                sect_id: schedule.sect_id,
                room_id: schedule.room_id,
                subj_id: schedule.subj_id,
                days: schedule.day_of_week ? [schedule.day_of_week] : [],
                start_time: schedule.start_time
                    ? schedule.start_time.slice(0, 5)
                    : '',
                end_time: schedule.end_time
                    ? schedule.end_time.slice(0, 5)
                    : '',
            },
        ]);

        adviserForm.setData({
            is_adviser: schedule.is_adviser ?? false,
            adviser_sect_id: schedule.adviser_sect_id ?? '',
        });

        if (schedule.adviser_sect_id) {
            const adviserSect = sections.find(
                (s) => s.sect_id === schedule.adviser_sect_id,
            );
            if (adviserSect) {
                setAdviserGradeFilter(adviserSect.gr_level);
            }
        }
    }, [schedule, mode, open]);

    const { isOnline } = useOnlineStatus();
    const [clientErrors, setClientErrors] = useState<Record<string, string>>(
        {},
    );

    useEffect(() => {
        if (!open) {
            setSlots([createEmptySlot()]);
            setAdviserGradeFilter('');
            adviserForm.reset();
            submitForm.clearErrors();
            setClientErrors({});
        }
    }, [open]);

    const updateSlot = (index: number, slot: ScheduleSlotState) => {
        setSlots((current) =>
            current.map((item, i) => (i === index ? slot : item)),
        );
        // Clear client errors for this slot
        setClientErrors((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (key.startsWith(`schedules.${index}.`)) {
                    delete next[key];
                }
            });
            if (isEditMode) {
                delete next.buildingFilter;
                delete next.building_id;
                delete next.room_id;
            }
            return next;
        });
    };

    const addSlot = () => {
        setSlots((current) => [...current, createEmptySlot()]);
    };

    const removeSlot = (index: number) => {
        setSlots((current) => current.filter((_, i) => i !== index));
    };

    const buildSchedulePayload = (): ScheduleSlotPayload[] =>
        slots.map(slotToPayload);

    const isSlotEmpty = (slot: ScheduleSlotState): boolean => {
        return (
            !slot.sect_id &&
            !slot.buildingFilter &&
            !slot.room_id &&
            !slot.subj_id &&
            (!slot.days || slot.days.length === 0) &&
            !slot.start_time &&
            !slot.end_time
        );
    };

    const validateSlot = (
        slot: ScheduleSlotState,
        index: number,
    ): Record<string, string> => {
        const errs: Record<string, string> = {};
        if (!slot.sect_id)
            errs[`schedules.${index}.sect_id`] = 'Please select a section.';
        if (!slot.buildingFilter || slot.buildingFilter === 'all') {
            errs[`schedules.${index}.buildingFilter`] =
                'Please select a building.';
            if (isEditMode) {
                errs.buildingFilter = 'Please select a building.';
            }
        }
        if (!slot.room_id)
            errs[`schedules.${index}.room_id`] = 'Please select a room.';
        if (!slot.subj_id)
            errs[`schedules.${index}.subj_id`] = 'Please select a subject.';
        if (!slot.days || slot.days.length === 0)
            errs[`schedules.${index}.days`] = 'Please select at least one day.';
        if (!slot.start_time) {
            errs[`schedules.${index}.start_time`] =
                'Please enter a start time.';
        }
        if (!slot.end_time) {
            errs[`schedules.${index}.end_time`] = 'Please enter an end time.';
        } else if (slot.start_time && slot.end_time <= slot.start_time) {
            errs[`schedules.${index}.end_time`] =
                'End time must be after start time.';
        }
        return errs;
    };

    const handleSkip = () => {
        if (!teacherData) {
            return;
        }

        if (!isOnline) {
            setClientErrors({
                general:
                    'No internet connection. Your entered teacher details are safe in this form. Please reconnect to the internet and click Skip again.',
            });
            setIsSkipping(false);
            return;
        }

        setIsSkipping(true);
        router.post(
            route('admin.teacher.storeWithAddress'),
            teacherData as unknown as Record<string, string>,
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    sessionStorage.removeItem('ioclass_draft_teacher_create');
                    onSuccess?.();
                    onClose();
                },
                onError: (errs) => {
                    setClientErrors(errs);
                },
                onFinish: () => setIsSkipping(false),
            },
        );
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (teacherData) {
            if (!isOnline) {
                setClientErrors({
                    general:
                        'No internet connection. Your entered teacher and schedule details are safe in this form. Please reconnect to the internet and click Save again.',
                });
                return;
            }

            const activeSlots = slots.filter((s) => !isSlotEmpty(s));

            // If user touched or partially filled slots, validate each active slot
            let newErrors: Record<string, string> = {};
            activeSlots.forEach((slot) => {
                const originalIndex = slots.indexOf(slot);
                const slotErrs = validateSlot(
                    slot,
                    originalIndex >= 0 ? originalIndex : 0,
                );
                newErrors = { ...newErrors, ...slotErrs };
            });

            if (
                adviserForm.data.is_adviser &&
                !adviserForm.data.adviser_sect_id
            ) {
                newErrors.adviser_sect_id =
                    'Please select an advisory section.';
            }

            if (Object.keys(newErrors).length > 0) {
                setClientErrors(newErrors);
                return;
            }

            setClientErrors({});

            const schedulePayload = activeSlots.map(slotToPayload);
            const adviserFields = {
                is_adviser: adviserForm.data.is_adviser,
                adviser_sect_id: adviserForm.data.is_adviser
                    ? adviserForm.data.adviser_sect_id
                    : '',
            };

            submitForm.transform(() => ({
                ...teacherData,
                schedules: schedulePayload,
                ...adviserFields,
            }));
            submitForm.post(route('admin.teacher.storeWithAddress'), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    sessionStorage.removeItem('ioclass_draft_teacher_create');
                    onSuccess?.();
                    onClose();
                },
                onError: (errs) => {
                    setClientErrors(errs);
                },
            });
            return;
        }

        const schedulePayload = buildSchedulePayload();
        const adviserFields = {
            is_adviser: adviserForm.data.is_adviser,
            adviser_sect_id: adviserForm.data.is_adviser
                ? adviserForm.data.adviser_sect_id
                : '',
        };

        if (mode === 'edit' && schedule) {
            const slotErrs = validateSlot(slots[0], 0);
            if (Object.keys(slotErrs).length > 0) {
                setClientErrors(slotErrs);
                return;
            }
            setClientErrors({});

            submitForm.transform(() => ({
                sect_id: slots[0]?.sect_id
                    ? Number(slots[0].sect_id)
                    : schedule.sect_id,
                room_id: slots[0]?.room_id
                    ? Number(slots[0].room_id)
                    : schedule.room_id,
                subj_id: slots[0]?.subj_id
                    ? Number(slots[0].subj_id)
                    : schedule.subj_id,
                day_of_week: slots[0]?.days[0] ?? schedule.day_of_week ?? '',
                start_time: slots[0]?.start_time
                    ? slots[0].start_time.slice(0, 5)
                    : '',
                end_time: slots[0]?.end_time
                    ? slots[0].end_time.slice(0, 5)
                    : '',
            }));
            submitForm.put(
                route('admin.schedule.update', schedule.schedule_id),
                {
                    preserveState: true,
                    preserveScroll: true,
                    onSuccess: () => {
                        onSuccess?.();
                        onClose();
                    },
                    onError: (errs) => {
                        setClientErrors(errs);
                    },
                },
            );
            return;
        }

        if (!teacherId) {
            return;
        }

        let newErrors: Record<string, string> = {};
        slots.forEach((slot, index) => {
            const slotErrs = validateSlot(slot, index);
            newErrors = { ...newErrors, ...slotErrs };
        });

        if (Object.keys(newErrors).length > 0) {
            setClientErrors(newErrors);
            return;
        }
        setClientErrors({});

        submitForm.transform(() => ({
            tch_id: teacherId,
            schedules: schedulePayload,
            ...adviserFields,
        }));
        submitForm.post(route('admin.schedule.store'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onError: (errs) => {
                setClientErrors(errs);
            },
        });
    };

    const pageErrors = (usePage<any>().props.errors ?? {}) as Record<
        string,
        string
    >;
    const errors = {
        ...pageErrors,
        ...(submitForm.errors as Record<string, string>),
        ...clientErrors,
    };
    const isProcessing = submitForm.processing || adviserForm.processing;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-2xl">
                <div className="space-y-4 p-6 pt-4">
                    <ModalHeader
                        icon={CalendarDays}
                        tone="emerald"
                        title={
                            teacherData
                                ? 'Teacher Schedule'
                                : mode === 'edit'
                                  ? 'Edit Schedule'
                                  : 'Add Schedule'
                        }
                        description={
                            teacherData
                                ? 'Step 3 of 3: Add teaching schedule slots and optional advisory section'
                                : mode === 'edit'
                                  ? 'Update schedule slot details, room, and time'
                                  : 'Add one or more slots — select multiple days when the same class repeats'
                        }
                    />

                    {teacherData && (
                        <ModalStepIndicator steps={CREATE_STEPS} current={3} />
                    )}

                    {!isOnline && (
                        <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            <WifiOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                Internet connection lost. Your entered data has
                                been preserved in this modal.
                            </span>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        className="max-h-[68vh] space-y-5 overflow-y-auto pr-1"
                    >
                        {Object.entries(errors)
                            .filter(
                                ([key]) =>
                                    !key.startsWith('schedules.') &&
                                    key !== 'adviser_sect_id',
                            )
                            .map(([key, msg]) => (
                                <div
                                    key={key}
                                    className="flex items-center justify-between rounded-lg border border-red-500/50 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
                                    role="alert"
                                >
                                    <div>
                                        {key !== 'general' && (
                                            <strong className="capitalize">
                                                {key
                                                    .replace(/^tch_/, '')
                                                    .replace(/_/g, ' ')}
                                                :{' '}
                                            </strong>
                                        )}
                                        <span>{msg}</span>
                                    </div>
                                    {onBack && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs"
                                            onClick={onBack}
                                        >
                                            Back to edit
                                        </Button>
                                    )}
                                </div>
                            ))}

                        {/* Weekly Schedule Slots Header */}
                        <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                            <CalendarDays className="size-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Weekly Schedule Slots
                            </span>
                        </div>

                        <div className="space-y-4">
                            {slots.map((slot, index) => (
                                <ScheduleSlotEditor
                                    key={index}
                                    slot={slot}
                                    index={index}
                                    canRemove={!isEditMode && slots.length > 1}
                                    sections={sections}
                                    rooms={rooms}
                                    subjects={subjects}
                                    gradeLevels={gradeLevels}
                                    buildings={buildings}
                                    errors={errors}
                                    singleDayOnly={isEditMode}
                                    isEditMode={isEditMode}
                                    onChange={updateSlot}
                                    onRemove={removeSlot}
                                />
                            ))}
                        </div>

                        {!isEditMode && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addSlot}
                                className="w-full cursor-pointer rounded-xl border-dashed border-emerald-500/40 bg-emerald-500/5 py-4 text-xs font-semibold text-emerald-600 transition-all duration-200 hover:border-emerald-500 hover:bg-emerald-500/10 active:scale-[0.99] dark:text-emerald-400"
                            >
                                <Plus className="mr-1.5 h-4 w-4" />
                                Add Another Time Slot
                            </Button>
                        )}

                        {showAdviser && (
                            <div className="space-y-4 rounded-xl border border-border bg-card/40 p-4 shadow-xs transition-all duration-200 dark:bg-card/10">
                                <div className="flex items-center gap-2 border-b border-border/20 pb-2">
                                    <UserRound className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Advisory Assignment
                                    </span>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Checkbox
                                        id="is_adviser"
                                        checked={adviserForm.data.is_adviser}
                                        onCheckedChange={(checked) => {
                                            adviserForm.setData(
                                                'is_adviser',
                                                Boolean(checked),
                                            );
                                            if (!checked) {
                                                adviserForm.setData(
                                                    'adviser_sect_id',
                                                    '',
                                                );
                                                setAdviserGradeFilter('');
                                            }
                                        }}
                                        className="mt-0.5"
                                    />
                                    <div>
                                        <Label
                                            htmlFor="is_adviser"
                                            className="cursor-pointer text-sm font-semibold text-foreground/90"
                                        >
                                            This teacher is an adviser
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Assign an advisory section separate
                                            from the teaching slots above.
                                        </p>
                                    </div>
                                </div>

                                {adviserForm.data.is_adviser && (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80">
                                                Advisory Grade Level
                                            </Label>
                                            <Select
                                                value={
                                                    adviserGradeFilter || 'all'
                                                }
                                                onValueChange={(value) => {
                                                    setAdviserGradeFilter(
                                                        value === 'all'
                                                            ? ''
                                                            : value,
                                                    );
                                                    adviserForm.setData(
                                                        'adviser_sect_id',
                                                        '',
                                                    );
                                                }}
                                            >
                                                <SelectTrigger className="h-9.5 rounded-xl">
                                                    <SelectValue placeholder="All grade levels" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="all">
                                                        All grade levels
                                                    </SelectItem>
                                                    {gradeLevels.map((g) => (
                                                        <SelectItem
                                                            key={g}
                                                            value={g}
                                                        >
                                                            {g}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground/80">
                                                Advisory Section{' '}
                                                <span className="text-destructive">
                                                    *
                                                </span>
                                            </Label>
                                            <Select
                                                value={
                                                    adviserForm.data
                                                        .adviser_sect_id === ''
                                                        ? ''
                                                        : String(
                                                              adviserForm.data
                                                                  .adviser_sect_id,
                                                          )
                                                }
                                                onValueChange={(v) => {
                                                    adviserForm.setData(
                                                        'adviser_sect_id',
                                                        Number(v),
                                                    );
                                                }}
                                            >
                                                <SelectTrigger
                                                    className={cn(
                                                        'h-9.5 rounded-xl',
                                                        errors.adviser_sect_id &&
                                                            'border-red-500 focus:ring-red-500/20',
                                                    )}
                                                >
                                                    <SelectValue placeholder="Select section" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl">
                                                    {adviserSections.map(
                                                        (s) => (
                                                            <SelectItem
                                                                key={s.sect_id}
                                                                value={String(
                                                                    s.sect_id,
                                                                )}
                                                            >
                                                                {adviserGradeFilter
                                                                    ? s.sect_name
                                                                    : `${s.gr_level} — ${s.sect_name}`}
                                                            </SelectItem>
                                                        ),
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormFieldError
                                                label="Advisory section"
                                                message={errors.adviser_sect_id}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>

                    <DialogFooter className="flex justify-end gap-2 border-t border-border/20 pt-4">
                        {teacherData ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={onBack}
                                    disabled={isProcessing || isSkipping}
                                >
                                    <ChevronLeft className="mr-1 size-4" />
                                    Back
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="rounded-xl"
                                    onClick={handleSkip}
                                    disabled={isProcessing || isSkipping}
                                >
                                    {isSkipping
                                        ? 'Saving…'
                                        : 'Skip (no schedule)'}
                                </Button>
                                <Button
                                    type="submit"
                                    onClick={handleSubmit}
                                    disabled={isProcessing || isSkipping}
                                    className="rounded-xl bg-emerald-600 text-white shadow-xs transition-all duration-150 hover:bg-emerald-700 active:scale-95"
                                >
                                    <Check className="mr-1 size-4" />
                                    {isProcessing
                                        ? 'Saving…'
                                        : 'Save with schedule'}
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="rounded-xl"
                                    onClick={onClose}
                                    disabled={isProcessing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isProcessing}
                                    onClick={handleSubmit}
                                    className="rounded-xl bg-emerald-600 text-white shadow-xs transition-all duration-150 hover:bg-emerald-700 active:scale-95"
                                >
                                    {isProcessing
                                        ? 'Saving…'
                                        : mode === 'edit'
                                          ? 'Save changes'
                                          : 'Add schedule'}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
