import { router, useForm } from '@inertiajs/react';
import { CalendarDays, Check, ChevronLeft, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import type { AddressFormData, PendingTeacherData } from '@/components/Address';
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

export type PendingTeacherWithAddressData = PendingTeacherData & AddressFormData;

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

function slotFieldError(errors: Record<string, string>, index: number, field: string, isEdit = false): string | undefined {
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
    const filteredSections = slot.gradeFilter && slot.gradeFilter !== 'all'
        ? sections.filter((s) => s.gr_level === slot.gradeFilter)
        : sections;

    const filteredRooms = slot.buildingFilter && slot.buildingFilter !== 'all'
        ? rooms.filter((r) => r.building_id === Number(slot.buildingFilter))
        : rooms;

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
    const roomError = slotFieldError(errors, index, 'room_id', isEditMode);
    const subjError = slotFieldError(errors, index, 'subj_id', isEditMode);
    const startTimeError = slotFieldError(errors, index, 'start_time', isEditMode);
    const endTimeError = slotFieldError(errors, index, 'end_time', isEditMode);
    const dayError = isEditMode
        ? (errors.day_of_week ?? errors.days ?? errors[`schedules.${index}.days`] ?? errors[`schedules.${index}.days.0`])
        : (errors[`schedules.${index}.days`] ?? errors[`schedules.${index}.days.0`]);

    return (
        <div className="space-y-4 rounded-xl border border-l-4 border-l-indigo-400 bg-card p-4 shadow-sm dark:border-l-indigo-600">
            <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">
                    {singleDayOnly ? 'Schedule slot' : `Schedule slot ${index + 1}`}
                </p>
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 text-destructive hover:text-destructive"
                        onClick={() => onRemove(index)}
                    >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Remove
                    </Button>
                )}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        Grade level
                    </Label>
                    <Select
                        value={slot.gradeFilter || 'all'}
                        onValueChange={(value) => updateSlot({ gradeFilter: value === 'all' ? '' : value, sect_id: '' })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All grade levels" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All grade levels</SelectItem>
                            {gradeLevels.map((g) => (
                                <SelectItem key={g} value={g}>
                                    {g}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        Section <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={slot.sect_id === '' ? '' : String(slot.sect_id)}
                        onValueChange={(v) => updateSlot({ sect_id: Number(v) })}
                    >
                        <SelectTrigger className={sectError ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select section" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredSections.map((s) => (
                                <SelectItem key={s.sect_id} value={String(s.sect_id)}>
                                    {slot.gradeFilter && slot.gradeFilter !== 'all' ? s.sect_name : `${s.gr_level} — ${s.sect_name}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormFieldError label="Section" message={sectError} />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        Building
                    </Label>
                    <Select
                        value={slot.buildingFilter || 'all'}
                        onValueChange={(value) => updateSlot({ buildingFilter: value === 'all' ? '' : value, room_id: '' })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All buildings" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All buildings</SelectItem>
                            {buildings.map((b) => (
                                <SelectItem key={b.building_id} value={String(b.building_id)}>
                                    {b.building_name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        Room number <span className="text-destructive">*</span>
                    </Label>
                    <Select
                        value={slot.room_id === '' ? '' : String(slot.room_id)}
                        onValueChange={(v) => updateSlot({ room_id: Number(v) })}
                    >
                        <SelectTrigger className={roomError ? 'border-red-500' : ''}>
                            <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                            {filteredRooms.map((r) => (
                                <SelectItem key={r.room_id} value={String(r.room_id)}>
                                    {slot.buildingFilter && slot.buildingFilter !== 'all' ? r.room_no : `${r.building?.building_name ?? '—'} — ${r.room_no}`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormFieldError label="Room" message={roomError} />
                </div>
            </div>

            <div>
                <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                    Subject <span className="text-destructive">*</span>
                </Label>
                <Select
                    value={slot.subj_id === '' ? '' : String(slot.subj_id)}
                    onValueChange={(v) => updateSlot({ subj_id: Number(v) })}
                >
                    <SelectTrigger className={subjError ? 'border-red-500' : ''}>
                        <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                        {subjects.map((s) => (
                            <SelectItem key={s.subj_id} value={String(s.subj_id)}>
                                {s.subj_code} — {s.subj_name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <FormFieldError label="Subject" message={subjError} />
            </div>

            <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                        Days <span className="text-destructive">*</span>
                    </Label>
                    {!singleDayOnly && (
                        <div className="flex flex-wrap gap-1">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectDays(WEEKDAYS)}>
                                Weekdays
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectDays(DAYS_OF_WEEK)}>
                                All days
                            </Button>
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectDays([])}>
                                Clear
                            </Button>
                        </div>
                    )}
                </div>

                <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                        <label
                            key={day}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                                slot.days.includes(day)
                                    ? 'border-emerald-500 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                                    : 'border-input hover:bg-muted/50'
                            }`}
                        >
                            <Checkbox
                                checked={slot.days.includes(day)}
                                onCheckedChange={() => toggleDay(day)}
                            />
                            <span>{day.slice(0, 3)}</span>
                        </label>
                    ))}
                </div>
                <FormFieldError label="Days" message={dayError} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div>
                    <Label htmlFor={`start_time_${index}`} className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        Start time <span className="text-destructive">*</span>
                    </Label>
                    <input
                        id={`start_time_${index}`}
                        type="time"
                        value={slot.start_time}
                        onChange={(e) => updateSlot({ start_time: e.target.value })}
                        className={`flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                            startTimeError ? 'border-red-500' : 'border-input'
                        }`}
                    />
                    <FormFieldError label="Start time" message={startTimeError} />
                </div>

                <div>
                    <Label htmlFor={`end_time_${index}`} className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        End time <span className="text-destructive">*</span>
                    </Label>
                    <input
                        id={`end_time_${index}`}
                        type="time"
                        value={slot.end_time}
                        onChange={(e) => updateSlot({ end_time: e.target.value })}
                        className={`flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
                            endTimeError ? 'border-red-500' : 'border-input'
                        }`}
                    />
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
    const [slots, setSlots] = useState<ScheduleSlotState[]>([createEmptySlot()]);
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
        () => [...new Set(sections.map((s) => s.gr_level).filter(Boolean))].sort(),
        [sections],
    );

    const buildings = useMemo(
        () =>
            [...new Map(
                rooms
                    .filter((r) => r.building)
                    .map((r) => [r.building!.building_id, r.building!]),
            ).values()].sort((a, b) => a.building_name.localeCompare(b.building_name)),
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
                buildingFilter: room?.building_id != null ? String(room.building_id) : '',
                sect_id: schedule.sect_id,
                room_id: schedule.room_id,
                subj_id: schedule.subj_id,
                days: schedule.day_of_week ? [schedule.day_of_week] : [],
                start_time: schedule.start_time ? schedule.start_time.slice(0, 5) : '',
                end_time: schedule.end_time ? schedule.end_time.slice(0, 5) : '',
            },
        ]);

        adviserForm.setData({
            is_adviser: schedule.is_adviser ?? false,
            adviser_sect_id: schedule.adviser_sect_id ?? '',
        });

        if (schedule.adviser_sect_id) {
            const adviserSect = sections.find((s) => s.sect_id === schedule.adviser_sect_id);
            if (adviserSect) {
                setAdviserGradeFilter(adviserSect.gr_level);
            }
        }
    }, [schedule, mode, open]);

    useEffect(() => {
        if (!open) {
            setSlots([createEmptySlot()]);
            setAdviserGradeFilter('');
            adviserForm.reset();
            submitForm.clearErrors();
        }
    }, [open]);

    const updateSlot = (index: number, slot: ScheduleSlotState) => {
        setSlots((current) => current.map((item, i) => (i === index ? slot : item)));
    };

    const addSlot = () => {
        setSlots((current) => [...current, createEmptySlot()]);
    };

    const removeSlot = (index: number) => {
        setSlots((current) => current.filter((_, i) => i !== index));
    };

    const buildSchedulePayload = (): ScheduleSlotPayload[] => slots.map(slotToPayload);

    const handleSkip = () => {
        if (!teacherData) {
            return;
        }

        setIsSkipping(true);
        router.post(route('admin.teacher.storeWithAddress'), teacherData as unknown as Record<string, string>, {
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onFinish: () => setIsSkipping(false),
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const schedulePayload = buildSchedulePayload();
        const adviserFields = {
            is_adviser: adviserForm.data.is_adviser,
            adviser_sect_id: adviserForm.data.is_adviser ? adviserForm.data.adviser_sect_id : '',
        };

        if (teacherData) {
            submitForm.transform(() => ({
                ...teacherData,
                schedules: schedulePayload,
                ...adviserFields,
            }));
            submitForm.post(route('admin.teacher.storeWithAddress'), {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
            });
            return;
        }

        if (isEditMode && schedule?.schedule_id) {
            const slot = schedulePayload[0];
            submitForm.transform(() => ({
                sect_id: slot.sect_id,
                room_id: slot.room_id,
                subj_id: slot.subj_id,
                day_of_week: slot.days[0] ?? '',
                start_time: slot.start_time ? slot.start_time.slice(0, 5) : '',
                end_time: slot.end_time ? slot.end_time.slice(0, 5) : '',
            }));
            submitForm.put(route('admin.schedule.update', schedule.schedule_id), {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
            });
            return;
        }

        if (!teacherId) {
            return;
        }

        submitForm.transform(() => ({
            tch_id: teacherId,
            schedules: schedulePayload,
            ...adviserFields,
        }));
        submitForm.post(route('admin.schedule.store'), {
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
        });
    };

    const errors = submitForm.errors as Record<string, string>;
    const isProcessing = submitForm.processing || adviserForm.processing;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-2xl">
                <ModalAccentBar />
                <div className="space-y-4 p-6 pt-4">
                <ModalHeader
                    icon={CalendarDays}
                    tone="indigo"
                    title={mode === 'edit' ? 'Edit Schedule' : 'Add Schedule'}
                    description={
                        mode === 'edit'
                            ? 'Update schedule slot details, room, and time'
                            : 'Add one or more slots — select multiple days when the same class repeats'
                    }
                />

                <form onSubmit={handleSubmit} className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
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
                        <Button type="button" variant="outline" size="sm" onClick={addSlot} className="w-full">
                            <Plus className="mr-2 h-4 w-4" />
                            Add another slot
                        </Button>
                    )}

                    {showAdviser && (
                        <div className="rounded-md border px-4 py-3">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="is_adviser"
                                    checked={adviserForm.data.is_adviser}
                                    onCheckedChange={(checked) => {
                                        adviserForm.setData('is_adviser', Boolean(checked));
                                        if (!checked) {
                                            adviserForm.setData('adviser_sect_id', '');
                                            setAdviserGradeFilter('');
                                        }
                                    }}
                                    className="mt-0.5"
                                />
                                <div>
                                    <Label htmlFor="is_adviser" className="cursor-pointer text-sm font-medium">
                                        This teacher is an adviser
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Assign an advisory section separate from the teaching slots above.
                                    </p>
                                </div>
                            </div>

                            {adviserForm.data.is_adviser && (
                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <div>
                                        <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                                            Advisory grade level
                                        </Label>
                                        <Select
                                            value={adviserGradeFilter || 'all'}
                                            onValueChange={(value) => {
                                                setAdviserGradeFilter(value === 'all' ? '' : value);
                                                adviserForm.setData('adviser_sect_id', '');
                                            }}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="All grade levels" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All grade levels</SelectItem>
                                                {gradeLevels.map((g) => (
                                                    <SelectItem key={g} value={g}>
                                                        {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                                            Advisory section <span className="text-destructive">*</span>
                                        </Label>
                                        <Select
                                            value={
                                                adviserForm.data.adviser_sect_id === ''
                                                    ? ''
                                                    : String(adviserForm.data.adviser_sect_id)
                                            }
                                            onValueChange={(v) => {
                                                adviserForm.setData('adviser_sect_id', Number(v));
                                            }}
                                        >
                                            <SelectTrigger className={errors.adviser_sect_id ? 'border-red-500' : ''}>
                                                <SelectValue placeholder="Select section" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {adviserSections.map((s) => (
                                                    <SelectItem key={s.sect_id} value={String(s.sect_id)}>
                                                        {adviserGradeFilter
                                                            ? s.sect_name
                                                            : `${s.gr_level} — ${s.sect_name}`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormFieldError label="Advisory section" message={errors.adviser_sect_id} />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </form>

                <DialogFooter className="flex justify-end gap-2">
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
                                {isSkipping ? 'Saving…' : 'Skip (no schedule)'}
                            </Button>
                            <Button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isProcessing || isSkipping}
                                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                <Check className="mr-1 size-4" />
                                {isProcessing ? 'Saving…' : 'Save with schedule'}
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
                                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {isProcessing ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add schedule'}
                            </Button>
                        </>
                    )}
                </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}
