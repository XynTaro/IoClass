import { useForm } from '@inertiajs/react';
import { CalendarRange } from 'lucide-react';
import { useEffect } from 'react';
import { route } from 'ziggy-js';
import { FormFieldError, inputErrorClass } from '@/components/form-field-error';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface SchoolYear {
    sy_id?: number;
    sy_label: string | null;
    start_date: string | null;
    end_date: string | null;
    is_active: boolean;
}

interface SchoolYearFormData {
    sy_id: number | '';
    sy_label: string | null;
    start_date: string | null;
    end_date: string | null;
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

export default function SchoolYearModal({
    open,
    onClose,
    onSuccess,
    schoolYear,
    mode,
}: SchoolYearModalProps) {
    const form = useForm<SchoolYearFormData>({
        sy_id: '',
        sy_label: '',
        start_date: '',
        end_date: '',
        is_active: false,
    });

    useEffect(() => {
        if (schoolYear && mode === 'edit') {
            form.setData({
                sy_id: schoolYear.sy_id ?? '',
                sy_label: schoolYear.sy_label ?? '',
                start_date: formatDateForInput(schoolYear.start_date),
                end_date: formatDateForInput(schoolYear.end_date),
                is_active: schoolYear.is_active ?? false,
            });
        }
    }, [schoolYear, mode, open]);

    useEffect(() => {
        if (!open) {
            form.reset();
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'edit') {
            const syId = form.data.sy_id;
            if (!syId) return;
            form.put(route('admin.school-year.update', { id: syId }), {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
                onError: () => {},
            });
        } else {
            form.post(route('admin.school-year.store'), {
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
                onError: () => {},
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg sm:max-w-xl">
                <ModalHeader
                    icon={CalendarRange}
                    tone="emerald"
                    title={mode === 'edit' ? 'Edit School Year' : 'Add School Year'}
                    description="Label, date range, and active status"
                />

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
                >
                    <div>
                        <Label
                            htmlFor="sy_label"
                            className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                        >
                            Label <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="sy_label"
                            placeholder="e.g. 2025-2026"
                            value={form.data.sy_label ?? ''}
                            onChange={(e) => {
                                form.setData('sy_label', e.target.value);
                                form.clearErrors('sy_label');
                            }}
                            required
                            aria-invalid={Boolean(form.errors.sy_label)}
                            className={inputErrorClass(Boolean(form.errors.sy_label))}
                        />
                        <FormFieldError label="Label" message={form.errors.sy_label} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label
                                htmlFor="start_date"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                Start date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={form.data.start_date ?? ''}
                                onChange={(e) => {
                                    form.setData('start_date', e.target.value);
                                    form.clearErrors('start_date');
                                }}
                                required
                                aria-invalid={Boolean(form.errors.start_date)}
                                className={inputErrorClass(Boolean(form.errors.start_date))}
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
                                End date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="end_date"
                                type="date"
                                value={form.data.end_date ?? ''}
                                onChange={(e) => {
                                    form.setData('end_date', e.target.value);
                                    form.clearErrors('end_date');
                                }}
                                required
                                aria-invalid={Boolean(form.errors.end_date)}
                                className={inputErrorClass(Boolean(form.errors.end_date))}
                            />
                            <FormFieldError
                                label="End date"
                                message={form.errors.end_date}
                            />
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
                                onCheckedChange={(checked) =>
                                    form.setData('is_active', Boolean(checked))
                                }
                            />
                            <Label
                                htmlFor="is_active"
                                className="text-sm font-medium cursor-pointer"
                            >
                                Set as active school year
                            </Label>
                        </div>
                        {form.data.is_active && (
                            <p className="mt-1.5 pl-6 text-xs text-amber-600 dark:text-amber-400">
                                This will deactivate any currently active school year.
                            </p>
                        )}
                    </div>

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
