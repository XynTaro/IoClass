import { useForm } from '@inertiajs/react';
import { DoorOpen } from 'lucide-react';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export interface BuildingOption {
    building_id: number;
    building_name: string;
}

export interface Room {
    room_id?: number;
    room_no: string | null;
    building_id: number | null;
    building?: BuildingOption | null;
}

interface RoomFormData {
    room_id: number | '';
    room_no: string;
    building_id: number | null;
}

interface RoomModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    room?: Room;
    mode: 'edit' | 'create';
    buildings: BuildingOption[];
}

export default function RoomModal({
    open,
    onClose,
    onSuccess,
    room,
    mode,
    buildings,
}: RoomModalProps) {
    const form = useForm<RoomFormData>({
        room_id: '',
        room_no: '',
        building_id: null,
    });

    useEffect(() => {
        if (room && mode === 'edit') {
            form.setData({
                room_id: room.room_id ?? '',
                room_no: room.room_no ?? '',
                building_id: room.building_id ?? null,
            });
        }
    }, [room, mode, open]);

    useEffect(() => {
        if (!open) {
            form.reset();
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'edit') {
            const roomId = form.data.room_id;
            if (!roomId) return;
            form.put(route('admin.room.update', { id: roomId }), {
                onSuccess: () => { onSuccess?.(); onClose(); },
            });
        } else {
            form.post(route('admin.room.store'), {
                onSuccess: () => { onSuccess?.(); onClose(); },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg sm:max-w-xl">
                <ModalHeader
                    icon={DoorOpen}
                    tone="orange"
                    title={mode === 'edit' ? 'Edit Room' : 'Add Room'}
                    description="Room number and building location"
                />

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
                >
                    <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                        <Label
                            htmlFor="room_no"
                            className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                        >
                            Room Number <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="room_no"
                            placeholder="e.g. 101"
                            value={form.data.room_no}
                            onChange={(e) => {
                                form.setData('room_no', e.target.value);
                                form.clearErrors('room_no');
                            }}
                            required
                            aria-invalid={Boolean(form.errors.room_no)}
                            className={inputErrorClass(Boolean(form.errors.room_no))}
                        />
                        <FormFieldError label="Room number" message={form.errors.room_no} />
                    </div>

                    <div>
                        <Label
                            htmlFor="building_id"
                            className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                        >
                            Building <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={form.data.building_id != null ? String(form.data.building_id) : ''}
                            onValueChange={(val) => {
                                form.setData('building_id', val ? Number(val) : null);
                                form.clearErrors('building_id');
                            }}
                        >
                            <SelectTrigger
                                id="building_id"
                                className={inputErrorClass(Boolean(form.errors.building_id))}
                            >
                                <SelectValue placeholder="Select a building" />
                            </SelectTrigger>
                            <SelectContent>
                                {buildings.map((b) => (
                                    <SelectItem key={b.building_id} value={String(b.building_id)}>
                                        {b.building_name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormFieldError label="Building" message={form.errors.building_id} />
                    </div>
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
                                  : 'Add Room'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
