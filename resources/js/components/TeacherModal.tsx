import { useForm } from '@inertiajs/react';
import {
    CalendarDays,
    Check,
    ChevronRight,
    Copy,
    CreditCard,
    Eye,
    EyeOff,
    KeyRound,
    MapPin,
    RefreshCw,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import AddressModal, { type AddressFormData, type PendingTeacherData } from '@/components/Address';
import { ModalAccentBar, ModalHeader, ModalStepIndicator } from '@/components/modal-header';
import RfidUidInput from '@/components/RfidUidInput';
import ScheduleModal, {
    type PendingTeacherWithAddressData,
    type ScheduleRoom,
    type ScheduleSection,
    type ScheduleSubject,
} from '@/components/ScheduleModal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWirelessRfidCapture } from '@/hooks/use-wireless-rfid-capture';
import { normalizeRfidUid } from '@/lib/rfid';
import { cn, formatContactNumberInput, formatEmailInput, formatNameInput } from '@/lib/utils';

function inputErrorClass(hasError: boolean): string {
    return hasError
        ? 'border-red-500 bg-neutral-50 text-foreground focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:bg-neutral-950/40'
        : '';
}

function FormFieldError({ label, message }: { label: string; message?: string }) {
    if (!message) return null;
    return (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            <strong className="font-semibold">{label}</strong>{' '}
            <span className="font-normal">{message}</span>
        </p>
    );
}

const CREATE_STEPS = [
    { label: 'Teacher', icon: UserRound },
    { label: 'Address', icon: MapPin },
    { label: 'Schedule', icon: CalendarDays },
];

type Status = 'active' | 'inactive';

interface Teacher {
    tch_id?: number;
    tch_rfid_uid?: string | null;
    master_card?: string | null;
    tch_fname: string;
    tch_mname?: string | null;
    tch_lname: string;
    tch_email: string;
    status: Status | null;
    avatar?: string | null;
}

interface TeacherFormData {
    tch_id: number | '';
    tch_rfid_uid: string;
    master_card: string;
    tch_fname: string;
    tch_mname: string;
    tch_lname: string;
    tch_email: string;
    contact_number: string;
    tch_pw: string;
    tch_pw_confirmation: string;
    auto_password: boolean;
    reset_password: boolean;
}

interface TeacherModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    teacher?: Teacher;
    mode: 'edit' | 'create';
    sections?: ScheduleSection[];
    rooms?: ScheduleRoom[];
    subjects?: ScheduleSubject[];
}

export default function TeacherModal({
    open,
    onClose,
    onSuccess,
    teacher,
    mode,
    sections = [],
    rooms = [],
    subjects = [],
}: TeacherModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [copied, setCopied] = useState<'pw' | 'confirm' | null>(null);

    // Wizard state (create mode only)
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [pendingTeacherData, setPendingTeacherData] = useState<PendingTeacherData | null>(null);
    const [pendingAddressData, setPendingAddressData] = useState<AddressFormData | null>(null);
    const [localErrors, setLocalErrors] = useState<Partial<Record<keyof TeacherFormData, string>>>({});
    const [rfidUidConflict, setRfidUidConflict] = useState(false);
    const [masterCardConflict, setMasterCardConflict] = useState(false);
    const [scanTarget, setScanTarget] = useState<'rfid' | 'master'>('rfid');

    const isStep1Active = open && (mode === 'edit' || step === 1);

    // Single wireless capture — routes to the active scan target automatically.
    useWirelessRfidCapture(isStep1Active, (uid) => {
        if (scanTarget === 'rfid') {
            form.setData('tch_rfid_uid', uid);
            form.clearErrors('tch_rfid_uid');
            setLocalErrors((prev) => {
                const { tch_rfid_uid, master_card, ...rest } = prev;
                return rest;
            });
            setScanTarget('master');
        } else {
            form.setData('master_card', uid);
            form.clearErrors('master_card');
            setLocalErrors((prev) => {
                const { tch_rfid_uid, master_card, ...rest } = prev;
                return rest;
            });
        }
    });

    const form = useForm<TeacherFormData>({
        tch_id: '',
        tch_rfid_uid: '',
        master_card: '',
        tch_fname: '',
        tch_mname: '',
        tch_lname: '',
        tch_email: '',
        contact_number: '',
        tch_pw: '',
        tch_pw_confirmation: '',
        auto_password: true,
        reset_password: false,
    });

    const generatePassword = (length = 10) => {
        const chars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    const copyToClipboard = async (text: string, which: 'pw' | 'confirm') => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(which);
            window.setTimeout(() => setCopied(null), 1200);
        } catch {
            // Ignore clipboard errors (e.g., non-secure context)
        }
    };

    // Populate form when editing or when teacher changes
    useEffect(() => {
        if (teacher && mode === 'edit') {
            form.setData({
                tch_id: teacher.tch_id ?? '',
                tch_rfid_uid: (teacher.tch_rfid_uid as string | null) ?? '',
                master_card: (teacher.master_card as string | null) ?? '',
                tch_fname: teacher.tch_fname ?? '',
                tch_mname: (teacher.tch_mname as string | null) ?? '',
                tch_lname: teacher.tch_lname ?? '',
                tch_email: teacher.tch_email ?? '',
                contact_number: '',
                tch_pw: '',
                tch_pw_confirmation: '',
                auto_password: true,
                reset_password: false,
            });
        }
    }, [teacher, mode, open]);

    // Force auto-generate passwords in create/reset flows (no manual entry).
    useEffect(() => {
        if (mode === 'create' || form.data.reset_password) {
            if (!form.data.auto_password) form.setData('auto_password', true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, form.data.reset_password]);

    // Auto-generate password if needed
    useEffect(() => {
        if (
            form.data.auto_password &&
            (mode === 'create' || form.data.reset_password)
        ) {
            const pwd = generatePassword(10);
            form.setData('tch_pw', pwd);
            form.setData('tch_pw_confirmation', pwd);
        } else if (!form.data.auto_password && form.data.reset_password) {
            form.setData('tch_pw', '');
            form.setData('tch_pw_confirmation', '');
        }
    }, [form.data.auto_password, form.data.reset_password, mode]);

    // Reset form when modal closes
    useEffect(() => {
        if (!open) {
            form.reset();
            setShowPassword(false);
            setShowConfirmPassword(false);
            setStep(1);
            setPendingTeacherData(null);
            setPendingAddressData(null);
            setLocalErrors({});
            setRfidUidConflict(false);
            setMasterCardConflict(false);
            setScanTarget('rfid');
        }
    }, [open]);

    const clearLocalError = (field: keyof TeacherFormData) => {
        setLocalErrors((prev) => {
            const { [field]: _removed, ...rest } = prev;
            return rest;
        });
    };

    const validateStep1 = (): boolean => {
        const errors: Partial<Record<keyof TeacherFormData, string>> = {};
        if (!form.data.tch_fname.trim()) errors.tch_fname = 'First name is required.';
        if (!form.data.tch_lname.trim()) errors.tch_lname = 'Last name is required.';
        if (!form.data.tch_email.trim()) errors.tch_email = 'Email is required.';

        if (!form.data.contact_number.trim()) {
            errors.contact_number = 'Contact number is required for SMS delivery.';
        } else {
            const cleanNum = form.data.contact_number.replace(/\D/g, '');
            if (cleanNum.length !== 11) {
                errors.contact_number = 'Contact number must be exactly 11 digits.';
            }
        }

        const rfidUid = normalizeRfidUid(form.data.tch_rfid_uid);
        const masterCard = normalizeRfidUid(form.data.master_card);

        if (rfidUid !== '' && masterCard !== '' && rfidUid === masterCard) {
            errors.tch_rfid_uid = 'RFID UID and master card must be different.';
            errors.master_card = 'RFID UID and master card must be different.';
        }

        if (rfidUidConflict) {
            errors.tch_rfid_uid = 'This RFID card is already registered to another person.';
        }

        if (masterCardConflict) {
            errors.master_card = 'This RFID card is already registered to another person.';
        }

        setLocalErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (!validateStep1()) return;
        setPendingTeacherData({
            tch_rfid_uid: form.data.tch_rfid_uid,
            master_card: form.data.master_card,
            tch_fname: form.data.tch_fname,
            tch_mname: form.data.tch_mname,
            tch_lname: form.data.tch_lname,
            tch_email: form.data.tch_email,
            contact_number: form.data.contact_number,
        });
        setStep(2);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const teacherId = form.data.tch_id;
        if (!teacherId) return;

        if (!validateStep1()) {
            return;
        }

        if (!form.data.reset_password) {
            form.transform((data) => {
                const { tch_pw, tch_pw_confirmation, auto_password, reset_password, ...cleanData } = data;
                return cleanData;
            });
        } else {
            form.transform((data) => {
                const { auto_password, reset_password, ...cleanData } = data;
                return cleanData;
            });
        }

        form.put(route('admin.teacher.update', { teacher: teacherId }), {
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onError: () => {},
        });
    };

    const showPasswordSection = mode === 'create' || form.data.reset_password;
    const clearPasswordErrors = () => {
        form.clearErrors('tch_pw');
        form.clearErrors('tch_pw_confirmation');
    };

    return (
        <>
            {/* Step 1 — teacher info (always shown in edit; shown in step 1 of create wizard) */}
            <Dialog
                open={open && (mode === 'edit' || step === 1)}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        onClose();
                        setStep(1);
                    }
                }}
            >
                <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-2xl">
                    <ModalAccentBar />
                    <div className="space-y-3 p-6 pt-4">
                    <ModalHeader
                        icon={UserRound}
                        tone="blue"
                        title={mode === 'edit' ? 'Edit Teacher' : 'Add Teacher'}
                        description={
                            mode === 'edit'
                                ? 'Update this teacher’s details and account'
                                : 'Basic info, RFID cards, and account'
                        }
                    />

                    {mode === 'create' && (
                        <ModalStepIndicator steps={CREATE_STEPS} current={1} />
                    )}

                    <form
                        onSubmit={
                            mode === 'edit'
                                ? handleEditSubmit
                                : (e) => {
                                      e.preventDefault();
                                      handleNext();
                                  }
                        }
                        className="max-h-[70vh] space-y-3 overflow-y-auto pr-1"
                    >
                        {/* Name */}
                        <div className="grid gap-3 md:grid-cols-3">
                            <div>
                                <Label
                                    htmlFor="tch_fname"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    First name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="tch_fname"
                                    placeholder="First name"
                                    value={form.data.tch_fname}
                                    onChange={(e) => {
                                        form.setData('tch_fname', formatNameInput(e.target.value));
                                        form.clearErrors('tch_fname');
                                        setLocalErrors((prev) => {
                                            const { tch_fname, ...rest } = prev;
                                            return rest;
                                        });
                                    }}
                                    aria-invalid={Boolean(form.errors.tch_fname || localErrors.tch_fname)}
                                    className={inputErrorClass(Boolean(form.errors.tch_fname || localErrors.tch_fname))}
                                />
                                <FormFieldError
                                    label="First name"
                                    message={form.errors.tch_fname ?? localErrors.tch_fname}
                                />
                            </div>

                            <div>
                                <Label
                                    htmlFor="tch_mname"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    Middle name
                                </Label>
                                <Input
                                    id="tch_mname"
                                    placeholder="Middle name (optional)"
                                    value={form.data.tch_mname}
                                    onChange={(e) => {
                                        form.setData('tch_mname', formatNameInput(e.target.value));
                                        form.clearErrors('tch_mname');
                                    }}
                                    aria-invalid={Boolean((form.errors as any).tch_mname)}
                                    className={inputErrorClass(Boolean((form.errors as any).tch_mname))}
                                />
                                <FormFieldError
                                    label="Middle name"
                                    message={(form.errors as any).tch_mname}
                                />
                            </div>

                            <div>
                                <Label
                                    htmlFor="tch_lname"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    Last name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="tch_lname"
                                    placeholder="Last name"
                                    value={form.data.tch_lname}
                                    onChange={(e) => {
                                        form.setData('tch_lname', formatNameInput(e.target.value));
                                        form.clearErrors('tch_lname');
                                        setLocalErrors((prev) => {
                                            const { tch_lname, ...rest } = prev;
                                            return rest;
                                        });
                                    }}
                                    aria-invalid={Boolean(form.errors.tch_lname || localErrors.tch_lname)}
                                    className={inputErrorClass(Boolean(form.errors.tch_lname || localErrors.tch_lname))}
                                />
                                <FormFieldError
                                    label="Last name"
                                    message={form.errors.tch_lname ?? localErrors.tch_lname}
                                />
                            </div>
                        </div>

                        {/* Email + contact */}
                        <div className="grid gap-3 md:grid-cols-2">
                            <div>
                                <Label
                                    htmlFor="tch_email"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    Email <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="tch_email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={form.data.tch_email}
                                    onChange={(e) => {
                                        form.setData('tch_email', formatEmailInput(e.target.value));
                                        form.clearErrors('tch_email');
                                        setLocalErrors((prev) => {
                                            const { tch_email, ...rest } = prev;
                                            return rest;
                                        });
                                    }}
                                    aria-invalid={Boolean(form.errors.tch_email || localErrors.tch_email)}
                                    className={inputErrorClass(Boolean(form.errors.tch_email || localErrors.tch_email))}
                                />
                                <FormFieldError
                                    label="Email"
                                    message={form.errors.tch_email ?? localErrors.tch_email}
                                />
                            </div>

                            <div>
                                <Label
                                    htmlFor="contact_number"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    Contact number <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="contact_number"
                                    placeholder="e.g. 09xxxxxxxxx"
                                    value={form.data.contact_number}
                                    onChange={(e) => {
                                        form.setData('contact_number', formatContactNumberInput(e.target.value));
                                        form.clearErrors('contact_number');
                                        clearLocalError('contact_number');
                                    }}
                                    aria-invalid={Boolean((form.errors as any).contact_number || localErrors.contact_number)}
                                    className={inputErrorClass(Boolean((form.errors as any).contact_number || localErrors.contact_number))}
                                />
                                <FormFieldError
                                    label="Contact number"
                                    message={(form.errors as any).contact_number ?? localErrors.contact_number}
                                />
                            </div>
                        </div>

                        {/* RFID / Card */}
                        <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="size-4 text-sky-600 dark:text-sky-400" />
                                    <p className="text-sm font-semibold text-foreground">RFID Cards</p>
                                </div>
                                <div className="flex items-center gap-1 rounded-md border p-0.5">
                                    <Button
                                        type="button"
                                        variant={scanTarget === 'rfid' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-6 px-2.5 text-xs"
                                        onClick={() => setScanTarget('rfid')}
                                    >
                                        RFID UID
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={scanTarget === 'master' ? 'default' : 'ghost'}
                                        size="sm"
                                        className="h-6 px-2.5 text-xs"
                                        onClick={() => setScanTarget('master')}
                                    >
                                        Master Card
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {scanTarget === 'rfid'
                                    ? 'Tap a card on the ESP32 — it will fill RFID UID, then auto-advance to Master Card.'
                                    : 'Tap a card on the ESP32 — it will fill Master Card.'}
                            </p>

                            <div className="grid gap-3 md:grid-cols-2">
                            <RfidUidInput
                                id="tch_rfid_uid"
                                label="RFID UID"
                                value={form.data.tch_rfid_uid}
                                onChange={(value) => {
                                    form.setData('tch_rfid_uid', value);
                                    form.clearErrors('tch_rfid_uid');
                                    setLocalErrors((prev) => {
                                        const { tch_rfid_uid, master_card, ...rest } = prev;
                                        return rest;
                                    });
                                    if (value) setScanTarget('master');
                                }}
                                error={
                                    (form.errors as Record<string, string | undefined>).tch_rfid_uid ??
                                    localErrors.tch_rfid_uid
                                }
                                excludeUid={
                                    mode === 'edit'
                                        ? (teacher?.tch_rfid_uid as string | null) ?? ''
                                        : ''
                                }
                                enabled={isStep1Active}
                                captureGlobalScan={isStep1Active && scanTarget === 'rfid'}
                                wirelessCapture={false}
                                onConflictChange={setRfidUidConflict}
                            />

                            <RfidUidInput
                                id="master_card"
                                label="Master card"
                                value={form.data.master_card}
                                onChange={(value) => {
                                    form.setData('master_card', value);
                                    form.clearErrors('master_card');
                                    setLocalErrors((prev) => {
                                        const { tch_rfid_uid, master_card, ...rest } = prev;
                                        return rest;
                                    });
                                }}
                                error={
                                    (form.errors as Record<string, string | undefined>).master_card ??
                                    localErrors.master_card
                                }
                                excludeUid={
                                    mode === 'edit'
                                        ? (teacher?.master_card as string | null) ?? ''
                                        : ''
                                }
                                helperText="Backup card for substitute access."
                                enabled={isStep1Active}
                                captureGlobalScan={isStep1Active && scanTarget === 'master'}
                                wirelessCapture={false}
                                onConflictChange={setMasterCardConflict}
                            />
                            </div>
                        </div>

                        {/* Security */}
                        <div className="space-y-2 rounded-xl border bg-card p-3 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="size-4 text-amber-600 dark:text-amber-400" />
                                    <p className="text-sm font-semibold text-foreground">Security</p>
                                </div>
                                {mode === 'edit' && form.data.reset_password && (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 gap-1.5 rounded-lg text-xs"
                                        onClick={() => {
                                            const pwd = generatePassword(10);
                                            form.setData('tch_pw', pwd);
                                            form.setData('tch_pw_confirmation', pwd);
                                            clearPasswordErrors();
                                        }}
                                    >
                                        <RefreshCw className="size-3.5" />
                                        Regenerate
                                    </Button>
                                )}
                            </div>

                            {mode === 'create' ? (
                                <div className="rounded-xl border border-sky-500/30 bg-sky-50/50 p-3.5 text-xs text-sky-950 dark:bg-sky-950/30 dark:text-sky-300">
                                    <p className="font-semibold text-sky-800 dark:text-sky-200">Temporary Password via SMS</p>
                                    <p className="mt-1 text-muted-foreground">
                                        A secure temporary password will be auto-generated and sent via SMS to the teacher's contact number. They will be required to change their password upon first login.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Reset password toggle — edit mode only */}
                                    <label
                                        htmlFor="reset_password"
                                        className={cn(
                                            'flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors',
                                            form.data.reset_password
                                                ? 'border-amber-500/40 bg-amber-50/50 dark:bg-amber-950/20'
                                                : 'border-border/60 hover:bg-muted/40',
                                        )}
                                    >
                                        <Checkbox
                                            id="reset_password"
                                            checked={form.data.reset_password}
                                            onCheckedChange={(v) => {
                                                const checked = Boolean(v);
                                                form.setData('reset_password', checked);
                                                if (!checked) {
                                                    form.setData('tch_pw', '');
                                                    form.setData('tch_pw_confirmation', '');
                                                }
                                                clearPasswordErrors();
                                            }}
                                        />
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">
                                                Reset password
                                            </span>
                                            <span className="block text-xs text-muted-foreground">
                                                Generate a new secure password for this teacher.
                                            </span>
                                        </span>
                                    </label>
                                </>
                            )}

                            {/* Password fields */}
                            {mode === 'edit' && form.data.reset_password ? (
                                <>
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <div>
                                            <Label
                                                htmlFor="tch_pw"
                                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                            >
                                                Password <span className="text-destructive">*</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="tch_pw"
                                                    type={showPassword ? 'text' : 'password'}
                                                    placeholder="Password"
                                                    value={form.data.tch_pw}
                                                    onChange={(e) => {
                                                        form.setData('tch_pw', e.target.value);
                                                        clearPasswordErrors();
                                                        setLocalErrors((prev) => {
                                                            const { tch_pw, ...rest } = prev;
                                                            return rest;
                                                        });
                                                    }}
                                                    className={cn(
                                                        'pr-16 font-mono text-sm',
                                                        inputErrorClass(Boolean(form.errors.tch_pw || localErrors.tch_pw)),
                                                    )}
                                                    aria-invalid={Boolean(form.errors.tch_pw || localErrors.tch_pw)}
                                                    readOnly
                                                    required
                                                />
                                                <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(form.data.tch_pw, 'pw')}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        aria-label="Copy password"
                                                    >
                                                        {copied === 'pw' ? (
                                                            <Check className="size-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="size-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword((p) => !p)}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                                                    </button>
                                                </div>
                                            </div>
                                            <FormFieldError
                                                label="Password"
                                                message={form.errors.tch_pw ?? localErrors.tch_pw}
                                            />
                                        </div>

                                        <div>
                                            <Label
                                                htmlFor="tch_pw_confirmation"
                                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                            >
                                                Confirm password <span className="text-destructive">*</span>
                                            </Label>
                                            <div className="relative">
                                                <Input
                                                    id="tch_pw_confirmation"
                                                    type={showConfirmPassword ? 'text' : 'password'}
                                                    placeholder="Confirm password"
                                                    value={form.data.tch_pw_confirmation}
                                                    onChange={(e) => {
                                                        form.setData('tch_pw_confirmation', e.target.value);
                                                        clearPasswordErrors();
                                                    }}
                                                    className={cn(
                                                        'pr-16 font-mono text-sm',
                                                        inputErrorClass(
                                                            Boolean(form.errors.tch_pw_confirmation),
                                                        ),
                                                    )}
                                                    aria-invalid={Boolean(form.errors.tch_pw_confirmation)}
                                                    readOnly
                                                    required
                                                />
                                                <div className="absolute top-1/2 right-1.5 flex -translate-y-1/2 items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            copyToClipboard(form.data.tch_pw_confirmation, 'confirm')
                                                        }
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        aria-label="Copy password"
                                                    >
                                                        {copied === 'confirm' ? (
                                                            <Check className="size-3.5 text-emerald-600" />
                                                        ) : (
                                                            <Copy className="size-3.5" />
                                                        )}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword((p) => !p)}
                                                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                                        aria-label={
                                                            showConfirmPassword ? 'Hide password' : 'Show password'
                                                        }
                                                    >
                                                        {showConfirmPassword ? (
                                                            <EyeOff className="size-3.5" />
                                                        ) : (
                                                            <Eye className="size-3.5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            <FormFieldError
                                                label="Confirm password"
                                                message={form.errors.tch_pw_confirmation}
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                        Auto-generated password — copy it before saving.
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    The current password stays unchanged unless you enable a reset.
                                </p>
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
                        {mode === 'edit' ? (
                            <Button
                                type="submit"
                                disabled={form.processing}
                                onClick={handleEditSubmit}
                                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {form.processing ? 'Saving…' : 'Save changes'}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Next
                                <ChevronRight className="ml-1 size-4" />
                            </Button>
                        )}
                    </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Step 2 — collect address only (no HTTP submit yet) */}
            <AddressModal
                open={open && step === 2}
                title="Set Up Teacher Address"
                onBack={() => setStep(1)}
                onNext={(data) => {
                    setPendingAddressData(data);
                    setStep(3);
                }}
                onClose={() => {
                    onClose();
                    setStep(1);
                    setPendingTeacherData(null);
                    setPendingAddressData(null);
                }}
            />

            {/* Step 3 — schedule (submits teacher + address + schedule together) */}
            <ScheduleModal
                open={open && step === 3}
                mode="create"
                sections={sections}
                rooms={rooms}
                subjects={subjects}
                teacherData={
                    pendingTeacherData && pendingAddressData
                        ? ({ ...pendingTeacherData, ...pendingAddressData } as PendingTeacherWithAddressData)
                        : undefined
                }
                onBack={() => setStep(2)}
                onClose={() => {
                    onClose();
                    setStep(1);
                    setPendingTeacherData(null);
                    setPendingAddressData(null);
                }}
                onSuccess={() => {
                    onSuccess?.();
                    onClose();
                    setStep(1);
                    setPendingTeacherData(null);
                    setPendingAddressData(null);
                }}
            />
        </>
    );
}
