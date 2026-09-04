import { useForm } from '@inertiajs/react';
import { Building2 } from 'lucide-react';
import { useEffect } from 'react';
import { route } from 'ziggy-js';
import { FormFieldError, inputErrorClass } from '@/components/form-field-error';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'edit') {
            const id = form.data.building_id;
            if (!id) return;
            form.put(route('admin.building.update', { id }), {
                onSuccess: () => { onSuccess?.(); onClose(); },
                onError: () => {},
            });
        } else {
            form.post(route('admin.building.store'), {
                onSuccess: () => { onSuccess?.(); onClose(); },
                onError: () => {},
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
                            Building Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="building_name"
                            placeholder="e.g. Main Building"
                            value={form.data.building_name}
                            onChange={(e) => {
                                form.setData('building_name', e.target.value);
                                form.clearErrors('building_name');
                            }}
                            required
                            aria-invalid={Boolean(form.errors.building_name)}
                            className={inputErrorClass(Boolean(form.errors.building_name))}
                        />
                        <FormFieldError
                            label="Building name"
                            message={form.errors.building_name}
                        />
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
                                  : 'Add Building'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
