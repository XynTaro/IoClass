import { useForm } from '@inertiajs/react';
import { AlertCircle, Building2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { FormFieldError, inputErrorClass } from '@/components/form-field-error';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
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

export interface Building {
    building_id?: number;
    building_name: string;
    rooms_count?: number;
}

interface BuildingModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    building?: Building;
    mode: 'create' | 'edit';
}

export default function BuildingModal({
    open,
    onClose,
    onSuccess,
    building,
    mode,
}: BuildingModalProps) {
    const [submitError, setSubmitError] = useState<string | null>(null);

    const form = useForm({
        building_id: '' as number | '',
        building_name: '',
    });

    useEffect(() => {
        if (building && mode === 'edit') {
            form.setData({
                building_id: building.building_id ?? '',
                building_name: building.building_name ?? '',
            });
        }
    }, [building, mode, open]);

    useEffect(() => {
        if (!open) {
            form.reset();
            form.clearErrors();
            setSubmitError(null);
        }
    }, [open]);

    const validate = (): boolean => {
        const errors: Record<string, string> = {};
        if (!String(form.data.building_name ?? '').trim()) {
            errors.building_name = 'Building name is required.';
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
            const id = form.data.building_id;
            if (!id) return;
            form.put(route('admin.building.update', { id }), {
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
                            : 'Failed to update building. Please check the fields and try again.',
                    );
                },
            });
        } else {
            form.post(route('admin.building.store'), {
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
                            : 'Failed to add building. Please check the fields and try again.',
                    );
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <ModalHeader
                    icon={Building2}
                    tone="violet"
                    title={mode === 'edit' ? 'Edit Building' : 'Add Building'}
                    description="Name used to group rooms by location"
                />

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label
                            htmlFor="building_name"
                            className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                        >
                            Building Name{' '}
                            <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="building_name"
                            placeholder="e.g. Main Building"
                            value={form.data.building_name}
                            onChange={(e) => {
                                form.setData('building_name', e.target.value);
                                form.clearErrors('building_name');
                                setSubmitError(null);
                            }}
                            required
                            aria-invalid={Boolean(form.errors.building_name)}
                            className={inputErrorClass(
                                Boolean(form.errors.building_name),
                            )}
                        />
                        <FormFieldError
                            label="Building name"
                            message={form.errors.building_name}
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
                                  : 'Add Building'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
