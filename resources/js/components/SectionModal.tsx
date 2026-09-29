import { useForm } from '@inertiajs/react';
import { AlertCircle, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { FormFieldError, inputErrorClass } from '@/components/form-field-error';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
    );
}

export interface Section {
    sect_id?: number;
    sect_name: string | null;
    gr_level: string | null;
}

interface SectionFormData {
    sect_id: number | '';
    sect_name: string | null;
    gr_level: string | null;
}

const DEFAULT_GRADE_LEVELS = [
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
];

interface SectionModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    section?: Section;
    mode: 'edit' | 'create';
    gradeLevels?: string[];
}

export default function SectionModal({
    open,
    onClose,
    onSuccess,
    section,
    mode,
    gradeLevels = [],
}: SectionModalProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useForm<SectionFormData>({
        sect_id: '',
        sect_name: '',
        gr_level: '',
    });

    const availableGradeLevels = Array.from(
        new Set([
            ...(gradeLevels && gradeLevels.length > 0
                ? gradeLevels
                : DEFAULT_GRADE_LEVELS),
            ...(form.data.gr_level ? [form.data.gr_level] : []),
        ]),
    )
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    useEffect(() => {
        if (section && mode === 'edit') {
            form.setData({
                sect_id: section.sect_id ?? '',
                sect_name: section.sect_name ?? '',
                gr_level: section.gr_level ?? '',
            });
        }
    }, [section, mode, open]);

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
            setSubmitError(null);
        }
    }, [open]);

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!String(form.data.sect_name ?? '').trim()) {
            errors.sect_name = 'Section name is required.';
        }
        if (!String(form.data.gr_level ?? '').trim()) {
            errors.gr_level = 'Grade level is required.';
        }
        form.setError(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            setSubmitError('Please fix the validation errors before saving.');
            return;
        }
        setSubmitError(null);

        if (mode === 'edit') {
            const sectionId = form.data.sect_id;
            if (!sectionId) return;
            form.put(route('admin.section.update', { id: sectionId }), {
                onSuccess: () => {
                    setSubmitError(null);
                    onSuccess?.();
                    onClose();
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    setSubmitError(
                        typeof first === 'string'
                            ? first
                            : 'Failed to update section. Please check the fields and try again.',
                    );
                },
            });
        } else {
            form.post(route('admin.section.store'), {
                onSuccess: () => {
                    setSubmitError(null);
                    onSuccess?.();
                    onClose();
                },
                onError: (errors) => {
                    const first = Object.values(errors)[0];
                    setSubmitError(
                        typeof first === 'string'
                            ? first
                            : 'Failed to add section. Please check the fields and try again.',
                    );
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg sm:max-w-xl">
                <ModalHeader
                    icon={Users}
                    tone="sky"
                    title={mode === 'edit' ? 'Edit Section' : 'Add Section'}
                    description="Name and grade level for this section"
                />

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
                >
                    <div>
                        <Label
                            htmlFor="sect_name"
                            className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                        >
                            Section name{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="sect_name"
                            placeholder="e.g. Rizal"
                            value={form.data.sect_name ?? ''}
                            onChange={(e) => {
                                form.setData('sect_name', e.target.value);
                                form.clearErrors('sect_name');
                                setSubmitError(null);
                            }}
                            required
                            aria-invalid={Boolean(form.errors.sect_name)}
                            className={inputErrorClass(
                                Boolean(form.errors.sect_name),
                            )}
                        />
                        <FormFieldError
                            label="Section name"
                            message={form.errors.sect_name}
                        />
                    </div>

                    <div>
                        <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                            Grade level{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.data.gr_level ?? ''}
                            onValueChange={(v) => {
                                form.setData('gr_level', v);
                                form.clearErrors('gr_level');
                                setSubmitError(null);
                            }}
                        >
                            <SelectTrigger
                                id="gr_level"
                                className={inputErrorClass(
                                    Boolean(form.errors.gr_level),
                                )}
                            >
                                <SelectValue placeholder="Select grade level" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableGradeLevels.map((level) => (
                                    <SelectItem key={level} value={level}>
                                        {level}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormFieldError
                            label="Grade level"
                            message={form.errors.gr_level}
                        />
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
                                  : 'Add Section'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
