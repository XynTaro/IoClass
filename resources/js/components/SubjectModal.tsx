import { useForm } from '@inertiajs/react';
import { AlertCircle, BookOpen } from 'lucide-react';
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

interface Subject {
    subj_id?: number;
    subj_code: string | null;
    subj_name: string | null;
    gr_level: string | null;
}

interface SubjectFormData {
    subj_id: number | '';
    subj_code: string | null;
    subj_name: string | null;
    gr_level: string | null;
}

interface SubjectModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    subject?: Subject;
    mode: 'edit' | 'create';
    storeRoute?: string;
    updateRoute?: string;
    gradeLevels?: string[];
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
    );
}

const DEFAULT_GRADE_LEVELS = [
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
];

export default function SubjectModal({
    open,
    onClose,
    onSuccess,
    subject,
    mode,
    storeRoute = 'admin.subject.store',
    updateRoute = 'admin.subject.update',
    gradeLevels = [],
}: SubjectModalProps) {
    const form = useForm<SubjectFormData>({
        subj_id: '',
        subj_code: '',
        subj_name: '',
        gr_level: '',
    });
    const [submitError, setSubmitError] = useState<string | null>(null);

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
        if (subject && mode === 'edit') {
            form.setData({
                subj_id: subject.subj_id ?? '',
                subj_code: subject.subj_code ?? '',
                subj_name: subject.subj_name ?? '',
                gr_level: subject.gr_level ?? '',
            });
        }
    }, [subject, mode, open]);

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
            setSubmitError(null);
        }
    }, [open]);

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!String(form.data.subj_code ?? '').trim()) {
            errors.subj_code = 'Subject code is required.';
        }
        if (!String(form.data.gr_level ?? '').trim()) {
            errors.gr_level = 'Grade level is required.';
        }
        if (!String(form.data.subj_name ?? '').trim()) {
            errors.subj_name = 'Subject name is required.';
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
            const subjectId = form.data.subj_id;
            if (!subjectId) return;
            form.put(route(updateRoute, { id: subjectId }), {
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
                            : 'Failed to update subject. Please check the fields and try again.',
                    );
                },
            });
        } else {
            form.post(route(storeRoute), {
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
                            : 'Failed to add subject. Please check the fields and try again.',
                    );
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg sm:max-w-xl">
                <ModalHeader
                    icon={BookOpen}
                    tone="amber"
                    title={mode === 'edit' ? 'Edit Subject' : 'Add Subject'}
                    description="Code and name used for classes and records"
                />

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label
                                htmlFor="subj_code"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                Subject code{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="subj_code"
                                placeholder="e.g. MATH101"
                                value={form.data.subj_code ?? ''}
                                onChange={(e) => {
                                    form.setData('subj_code', e.target.value);
                                    form.clearErrors('subj_code');
                                }}
                                required
                                aria-invalid={Boolean(form.errors.subj_code)}
                                className={inputErrorClass(
                                    Boolean(form.errors.subj_code),
                                )}
                            />
                            <FormFieldError
                                label="Subject code"
                                message={form.errors.subj_code}
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
                                }}
                            >
                                <SelectTrigger
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
                    </div>

                    <div>
                        <Label
                            htmlFor="subj_name"
                            className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                        >
                            Subject name{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="subj_name"
                            placeholder="e.g. Mathematics"
                            value={form.data.subj_name ?? ''}
                            onChange={(e) => {
                                form.setData('subj_name', e.target.value);
                                form.clearErrors('subj_name');
                            }}
                            required
                            aria-invalid={Boolean(form.errors.subj_name)}
                            className={inputErrorClass(
                                Boolean(form.errors.subj_name),
                            )}
                        />
                        <FormFieldError
                            label="Subject name"
                            message={form.errors.subj_name}
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
                                  : 'Add Subject'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
