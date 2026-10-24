import { useForm } from '@inertiajs/react';
import { AlertCircle, CalendarRange } from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { FormFieldError, inputErrorClass } from '@/components/form-field-error';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
    );
}

export interface SchoolYear {
    sy_id?: number;
    sy_label: string | null;
    start_date: string | null;
    end_date: string | null;
    sem1_start_date?: string | null;
    sem1_end_date?: string | null;
    sem2_start_date?: string | null;
    sem2_end_date?: string | null;
    is_active: boolean;
}

interface SchoolYearFormData {
    sy_id: number | '';
    sy_label: string | null;
    start_date: string | null;
    end_date: string | null;
    sem1_start_date: string | null;
    sem1_end_date: string | null;
    sem2_start_date: string | null;
    sem2_end_date: string | null;
    is_active: boolean;
}

const formatDateForInput = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
};

interface SchoolYearModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    schoolYear?: SchoolYear;
    mode: 'edit' | 'create';
}

const deriveSchoolYearLabel = (
    startDate: string | null | undefined,
    endDate: string | null | undefined,
): string => {
    if (!startDate) return '';
    const startMatch = startDate.match(/^(\d{4})/);
    if (!startMatch) return '';
    const startYear = parseInt(startMatch[1], 10);
    if (isNaN(startYear)) return '';

    if (endDate) {
        const endMatch = endDate.match(/^(\d{4})/);
        if (endMatch) {
            const endYear = parseInt(endMatch[1], 10);
            if (!isNaN(endYear) && endYear > startYear) {
                return `${startYear}-${endYear}`;
            }
        }
    }
    return `${startYear}-${startYear + 1}`;
};

export default function SchoolYearModal({
    open,
    onClose,
    onSuccess,
    schoolYear,
    mode,
}: SchoolYearModalProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useForm<SchoolYearFormData>({
        sy_id: '',
        sy_label: '',
        start_date: '',
        end_date: '',
        sem1_start_date: '',
        sem1_end_date: '',
        sem2_start_date: '',
        sem2_end_date: '',
        is_active: false,
    });

    useEffect(() => {
        if (schoolYear && mode === 'edit') {
            form.setData({
                sy_id: schoolYear.sy_id ?? '',
                sy_label: schoolYear.sy_label ?? '',
                start_date: formatDateForInput(schoolYear.start_date),
                end_date: formatDateForInput(schoolYear.end_date),
                sem1_start_date: formatDateForInput(schoolYear.sem1_start_date),
                sem1_end_date: formatDateForInput(schoolYear.sem1_end_date),
                sem2_start_date: formatDateForInput(schoolYear.sem2_start_date),
                sem2_end_date: formatDateForInput(schoolYear.sem2_end_date),
                is_active: schoolYear.is_active ?? false,
            });
        }
    }, [schoolYear, mode, open]);

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
            setSubmitError(null);
        }
    }, [open]);

    const handleStartDateChange = (val: string) => {
        const newLabel = deriveSchoolYearLabel(val, form.data.end_date);
        form.setData((prev) => ({
            ...prev,
            start_date: val,
            sy_label: newLabel || prev.sy_label,
        }));
        form.clearErrors('start_date');
        if (newLabel) {
            form.clearErrors('sy_label');
        }
        setSubmitError(null);
    };

    const handleEndDateChange = (val: string) => {
        const newLabel = deriveSchoolYearLabel(form.data.start_date, val);
        form.setData((prev) => ({
            ...prev,
            end_date: val,
            sy_label: newLabel || prev.sy_label,
        }));
        form.clearErrors('end_date');
        if (newLabel) {
            form.clearErrors('sy_label');
        }
        setSubmitError(null);
    };

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!form.data.start_date) {
            errors.start_date = 'Start date is required.';
        }
        if (!form.data.end_date) {
            errors.end_date = 'End date is required.';
        }
        if (
            form.data.start_date &&
            form.data.end_date &&
            form.data.start_date >= form.data.end_date
        ) {
            errors.end_date = 'End date must be after start date.';
        }
        if (!String(form.data.sy_label ?? '').trim()) {
            errors.sy_label = 'School year label is required.';
        }
        if (
            form.data.sem1_start_date &&
            form.data.sem1_end_date &&
            form.data.sem1_start_date > form.data.sem1_end_date
        ) {
            errors.sem1_end_date = '1st semester end date must be on or after 1st semester start date.';
        }
        if (
            form.data.sem2_start_date &&
            form.data.sem2_end_date &&
            form.data.sem2_start_date > form.data.sem2_end_date
        ) {
            errors.sem2_end_date = '2nd semester end date must be on or after 2nd semester start date.';
        }
        form.setError(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            setSubmitError(null);
            return;
        }
        setSubmitError(null);

        if (mode === 'edit') {
            const syId = form.data.sy_id;
            if (!syId) return;
            form.put(route('admin.school-year.update', { id: syId }), {
                onSuccess: () => {
                    setSubmitError(null);
                    onSuccess?.();
                    onClose();
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    const isRequired =
                        typeof first === 'string' && /required/i.test(first);
                    setSubmitError(
                        typeof first === 'string' && !isRequired
                            ? first
                            : null,
                    );
                },
            });
        } else {
            form.post(route('admin.school-year.store'), {
                onSuccess: () => {
                    setSubmitError(null);
                    onSuccess?.();
                    onClose();
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    const isRequired =
                        typeof first === 'string' && /required/i.test(first);
                    setSubmitError(
                        typeof first === 'string' && !isRequired
                            ? first
                            : null,
                    );
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg sm:max-w-xl">
                <ModalHeader
                    icon={CalendarRange}
                    tone="emerald"
                    title={
                        mode === 'edit' ? 'Edit School Year' : 'Add School Year'
                    }
                    description="Date range, label, and active status"
                />

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                            <Label
                                htmlFor="start_date"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                Start date{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={form.data.start_date ?? ''}
                                onChange={(e) =>
                                    handleStartDateChange(e.target.value)
                                }
                                required
                                aria-invalid={Boolean(form.errors.start_date)}
                                className={inputErrorClass(
                                    Boolean(form.errors.start_date),
                                )}
                            />
                            <FormFieldError
                                label="Start date"
                                message={form.errors.start_date}
                            />
                        </div>

                        <div>
                            <Label
                                htmlFor="end_date"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                End date{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="end_date"
                                type="date"
                                min={form.data.start_date ?? undefined}
                                value={form.data.end_date ?? ''}
                                onChange={(e) =>
                                    handleEndDateChange(e.target.value)
                                }
                                required
                                aria-invalid={Boolean(form.errors.end_date)}
                                className={inputErrorClass(
                                    Boolean(form.errors.end_date),
                                )}
                            />
                            <FormFieldError
                                label="End date"
                                message={form.errors.end_date}
                            />
                        </div>
                    </div>

                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <Label
                                htmlFor="sy_label"
                                className="inline-block text-xs font-medium text-muted-foreground"
                            >
                                School Year{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <span className="text-[11px] text-muted-foreground">
                                Auto-set from dates
                            </span>
                        </div>
                        <Input
                            id="sy_label"
                            placeholder="e.g. 2026-2027"
                            value={form.data.sy_label ?? ''}
                            onChange={(e) => {
                                form.setData('sy_label', e.target.value);
                                form.clearErrors('sy_label');
                                setSubmitError(null);
                            }}
                            required
                            aria-invalid={Boolean(form.errors.sy_label)}
                            className={inputErrorClass(
                                Boolean(form.errors.sy_label),
                            )}
                        />
                        <FormFieldError
                            label="Label"
                            message={form.errors.sy_label}
                        />
                    </div>

                    {/* ── Semester Date Ranges (Option B / DepEd) ── */}
                    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 dark:bg-muted/10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Semester Dates (Optional)
                            </span>
                            <span className="text-[11px] text-muted-foreground/80">
                                DepEd SF2 & Term Split
                            </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            Specify start and end dates for each semester. If left empty, the system automatically uses the midpoint of the school year.
                        </p>

                        {/* 1st Semester */}
                        <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-medium text-foreground">1st Semester</span>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="sem1_start_date" className="text-[11px] text-muted-foreground">
                                        Start Date
                                    </Label>
                                    <Input
                                        id="sem1_start_date"
                                        type="date"
                                        value={form.data.sem1_start_date ?? ''}
                                        onChange={(e) => {
                                            form.setData('sem1_start_date', e.target.value);
                                            form.clearErrors('sem1_start_date');
                                            setSubmitError(null);
                                        }}
                                        min={form.data.start_date ?? undefined}
                                        max={form.data.end_date ?? undefined}
                                    />
                                    <FormFieldError label="1st Semester start" message={form.errors.sem1_start_date} />
                                </div>
                                <div>
                                    <Label htmlFor="sem1_end_date" className="text-[11px] text-muted-foreground">
                                        End Date
                                    </Label>
                                    <Input
                                        id="sem1_end_date"
                                        type="date"
                                        value={form.data.sem1_end_date ?? ''}
                                        onChange={(e) => {
                                            form.setData('sem1_end_date', e.target.value);
                                            form.clearErrors('sem1_end_date');
                                            setSubmitError(null);
                                        }}
                                        min={form.data.sem1_start_date || form.data.start_date || undefined}
                                        max={form.data.end_date ?? undefined}
                                    />
                                    <FormFieldError label="1st Semester end" message={form.errors.sem1_end_date} />
                                </div>
                            </div>
                        </div>

                        {/* 2nd Semester */}
                        <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-medium text-foreground">2nd Semester</span>
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                                <div>
                                    <Label htmlFor="sem2_start_date" className="text-[11px] text-muted-foreground">
                                        Start Date
                                    </Label>
                                    <Input
                                        id="sem2_start_date"
                                        type="date"
                                        value={form.data.sem2_start_date ?? ''}
                                        onChange={(e) => {
                                            form.setData('sem2_start_date', e.target.value);
                                            form.clearErrors('sem2_start_date');
                                            setSubmitError(null);
                                        }}
                                        min={form.data.sem1_end_date || form.data.start_date || undefined}
                                        max={form.data.end_date ?? undefined}
                                    />
                                    <FormFieldError label="2nd Semester start" message={form.errors.sem2_start_date} />
                                </div>
                                <div>
                                    <Label htmlFor="sem2_end_date" className="text-[11px] text-muted-foreground">
                                        End Date
                                    </Label>
                                    <Input
                                        id="sem2_end_date"
                                        type="date"
                                        value={form.data.sem2_end_date ?? ''}
                                        onChange={(e) => {
                                            form.setData('sem2_end_date', e.target.value);
                                            form.clearErrors('sem2_end_date');
                                            setSubmitError(null);
                                        }}
                                        min={form.data.sem2_start_date || form.data.start_date || undefined}
                                        max={form.data.end_date ?? undefined}
                                    />
                                    <FormFieldError label="2nd Semester end" message={form.errors.sem2_end_date} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className={`rounded-xl border p-3 transition-colors ${
                            form.data.is_active
                                ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                                : 'border-input'
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="is_active"
                                checked={form.data.is_active}
                                onCheckedChange={(checked) => {
                                    form.setData('is_active', Boolean(checked));
                                    setSubmitError(null);
                                }}
                            />
                            <Label
                                htmlFor="is_active"
                                className="cursor-pointer text-sm font-medium"
                            >
                                Set as active school year
                            </Label>
                        </div>
                        {form.data.is_active && (
                            <p className="mt-1.5 pl-6 text-xs text-amber-600 dark:text-amber-400">
                                This will deactivate any currently active school
                                year.
                            </p>
                        )}
                    </div>

                    {submitError && <ErrorBanner message={submitError} />}

                    <DialogFooter className="flex justify-end gap-2 border-t pt-4">
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
                            type="submit"
                            disabled={form.processing}
                            className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {form.processing
                                ? 'Saving...'
                                : mode === 'edit'
                                  ? 'Save Changes'
                                  : 'Add School Year'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
