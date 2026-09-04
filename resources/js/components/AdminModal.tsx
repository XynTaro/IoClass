import { useForm } from '@inertiajs/react';
import {
    ChevronRight,
    Eye,
    EyeOff,
    KeyRound,
    MapPin,
    ShieldCheck,
    UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import AddressModal, { type PendingAdminData } from '@/components/Address';
import { ModalAccentBar, ModalHeader, ModalStepIndicator } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn, formatContactNumberInput, formatEmailInput, formatNameInput } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inputErrorClass(hasError: boolean): string {
    return hasError
        ? 'border-red-500 bg-neutral-50 text-foreground focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:bg-neutral-950/40'
        : '';
}

function FormFieldError({
    label,
    message,
}: {
    label: string;
    message?: string;
}) {
    if (!message) return null;
    return (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            <strong className="font-semibold">{label}</strong>{' '}
            <span className="font-normal">{message}</span>
        </p>
    );
}

const CREATE_STEPS = [
    { label: 'Admin', icon: ShieldCheck },
    { label: 'Address', icon: MapPin },
];

// ---------------------------------------------------------------------------
// Types — must match AdminAdminController validation fields
// ---------------------------------------------------------------------------
export interface Admin {
    admin_id?: number;
    fname: string;
    mname?: string | null;
    lname: string;
    email: string;
    contact_number?: string | null;
}

interface AdminFormData {
    admin_id: number | '';
    fname: string;
    mname: string;
    lname: string;
    email: string;
    contact_number: string;
    pw: string;
    pw_confirmation: string;
    auto_password: boolean;
    reset_password: boolean;
}

interface AdminModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    admin?: Admin;
    mode: 'edit' | 'create';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AdminModal({
    open,
    onClose,
    onSuccess,
    admin,
    mode,
}: AdminModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [copied, setCopied] = useState<'pw' | 'confirm' | null>(null);
    // Wizard step state (create mode only)
    const [step, setStep] = useState<1 | 2>(1);
    const [pendingAdminData, setPendingAdminData] = useState<PendingAdminData | null>(null);
    const [localErrors, setLocalErrors] = useState<Partial<Record<keyof AdminFormData, string>>>({});

    const form = useForm<AdminFormData>({
        admin_id: '',
        fname: '',
        mname: '',
        lname: '',
        email: '',
        contact_number: '',
        pw: '',
        pw_confirmation: '',
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
            // non-secure context — ignore
        }
    };

    // Populate form when opening in edit mode
    useEffect(() => {
        if (admin && mode === 'edit') {
            form.setData({
                admin_id: admin.admin_id ?? '',
                fname: admin.fname ?? '',
                mname: admin.mname ?? '',
                lname: admin.lname ?? '',
                email: admin.email ?? '',
                contact_number: admin.contact_number ?? '',
                pw: '',
                pw_confirmation: '',
                auto_password: true,
                reset_password: false,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [admin, mode, open]);

    // Force auto-generate in create / reset-password flows
    useEffect(() => {
        if (mode === 'create' || form.data.reset_password) {
            if (!form.data.auto_password) form.setData('auto_password', true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, form.data.reset_password]);

    // Generate password whenever auto_password is on and the flow needs one
    useEffect(() => {
        if (
            form.data.auto_password &&
            (mode === 'create' || form.data.reset_password)
        ) {
            const pwd = generatePassword(10);
            form.setData('pw', pwd);
            form.setData('pw_confirmation', pwd);
        } else if (!form.data.auto_password && form.data.reset_password) {
            form.setData('pw', '');
            form.setData('pw_confirmation', '');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.data.auto_password, form.data.reset_password, mode]);

    // Reset everything when modal closes or re-opens
    useEffect(() => {
        if (!open) {
            form.reset();
            setShowPassword(false);
            setShowConfirmPassword(false);
            setStep(1);
            setPendingAdminData(null);
            setLocalErrors({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const clearPasswordErrors = () => {
        form.clearErrors('pw');
        form.clearErrors('pw_confirmation');
    };

    const clearLocalError = (field: keyof AdminFormData) => {
        setLocalErrors((prev) => {
            const { [field]: _removed, ...rest } = prev;
            return rest;
        });
    };

    /** Validate required fields client-side before advancing to step 2 */
    const validateStep1 = (): boolean => {
        const errors: Partial<Record<keyof AdminFormData, string>> = {};
        if (!form.data.fname.trim()) errors.fname = 'First name is required.';
        if (!form.data.lname.trim()) errors.lname = 'Last name is required.';
        if (!form.data.email.trim()) errors.email = 'Email is required.';

        if (!form.data.contact_number.trim()) {
            errors.contact_number = 'Contact number is required for SMS delivery.';
        } else {
            const cleanNum = form.data.contact_number.replace(/\D/g, '');
            if (cleanNum.length !== 11) {
                errors.contact_number = 'Contact number must be exactly 11 digits.';
            }
        }

        setLocalErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNext = () => {
        if (!validateStep1()) return;
        setPendingAdminData({
            fname: form.data.fname,
            mname: form.data.mname,
            lname: form.data.lname,
            email: form.data.email,
            contact_number: form.data.contact_number,
        });
        setStep(2);
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const adminId = form.data.admin_id;
        if (!adminId) return;

        if (!form.data.reset_password) {
            form.transform(({ admin_id, auto_password, reset_password, pw, pw_confirmation, ...data }) => data);
        } else {
            form.transform(({ admin_id, auto_password, reset_password, ...data }) => data);
        }

        form.put(route('admin.admin.update', { admin: adminId }), {
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onError: () => {},
        });
    };

    const showPasswordFields = mode === 'create' || form.data.reset_password;

    return (
        <>
        {/* Step 1 — Admin info (always shown in edit; shown in step 1 of create wizard) */}
        <Dialog open={open && (mode === 'edit' || step === 1)} onOpenChange={(isOpen) => { if (!isOpen) { onClose(); setStep(1); } }}>
            <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-xl">
                <ModalAccentBar />
                <div className="space-y-4 p-6 pt-4">
                <ModalHeader
                    icon={ShieldCheck}
                    tone="violet"
                    title={mode === 'edit' ? 'Edit Admin' : 'Add Admin'}
                    description={
                        mode === 'edit'
                            ? 'Update this administrator’s details and account'
                            : 'Basic information and account credentials'
                    }
                />

                {mode === 'create' && (
                    <ModalStepIndicator steps={CREATE_STEPS} current={1} />
                )}

                <form
                    onSubmit={mode === 'edit' ? handleEditSubmit : (e) => { e.preventDefault(); handleNext(); }}
                    className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
                >
                    <div className="flex items-center gap-2 border-b pb-2">
                        <UserRound className="size-4 text-violet-600 dark:text-violet-400" />
                        <p className="text-sm font-semibold text-foreground">Admin details</p>
                    </div>

                    {/* Name row */}
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                            <Label
                                htmlFor="fname"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                First name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="fname"
                                placeholder="First name"
                                value={form.data.fname}
                                onChange={(e) => {
                                    form.setData('fname', formatNameInput(e.target.value));
                                    form.clearErrors('fname');
                                    clearLocalError('fname');
                                }}
                                aria-invalid={Boolean(form.errors.fname || localErrors.fname)}
                                className={inputErrorClass(Boolean(form.errors.fname || localErrors.fname))}
                            />
                            <FormFieldError
                                label="First name"
                                message={form.errors.fname ?? localErrors.fname}
                            />
                        </div>

                        <div>
                            <Label
                                htmlFor="mname"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                Middle name
                            </Label>
                            <Input
                                id="mname"
                                placeholder="Middle name (optional)"
                                value={form.data.mname}
                                onChange={(e) => {
                                    form.setData('mname', formatNameInput(e.target.value));
                                    form.clearErrors('mname');
                                }}
                                aria-invalid={Boolean(form.errors.mname)}
                                className={inputErrorClass(Boolean(form.errors.mname))}
                            />
                            <FormFieldError
                                label="Middle name"
                                message={form.errors.mname}
                            />
                        </div>

                        <div>
                            <Label
                                htmlFor="lname"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                Last name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="lname"
                                placeholder="Last name"
                                value={form.data.lname}
                                onChange={(e) => {
                                    form.setData('lname', formatNameInput(e.target.value));
                                    form.clearErrors('lname');
                                    clearLocalError('lname');
                                }}
                                aria-invalid={Boolean(form.errors.lname || localErrors.lname)}
                                className={inputErrorClass(Boolean(form.errors.lname || localErrors.lname))}
                            />
                            <FormFieldError
                                label="Last name"
                                message={form.errors.lname ?? localErrors.lname}
                            />
                        </div>
                    </div>

                    {/* Email + contact */}
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                            <Label
                                htmlFor="email"
                                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                            >
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={form.data.email}
                                onChange={(e) => {
                                    form.setData('email', formatEmailInput(e.target.value));
                                    form.clearErrors('email');
                                    clearLocalError('email');
                                }}
                                aria-invalid={Boolean(form.errors.email || localErrors.email)}
                                className={inputErrorClass(Boolean(form.errors.email || localErrors.email))}
                            />
                            <FormFieldError label="Email" message={form.errors.email ?? localErrors.email} />
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
                                aria-invalid={Boolean(form.errors.contact_number || localErrors.contact_number)}
                                className={inputErrorClass(
                                    Boolean(form.errors.contact_number || localErrors.contact_number),
                                )}
                            />
                            <FormFieldError
                                label="Contact number"
                                message={form.errors.contact_number ?? localErrors.contact_number}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 border-b pt-2 pb-2">
                        <KeyRound className="size-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-sm font-semibold text-foreground">Security</p>
                    </div>

                    {mode === 'create' ? (
                        <div className="rounded-xl border border-purple-500/30 bg-purple-50/50 p-3.5 text-xs text-purple-950 dark:bg-purple-950/30 dark:text-purple-300">
                            <p className="font-semibold text-purple-800 dark:text-purple-200">Temporary Password via SMS</p>
                            <p className="mt-1 text-muted-foreground">
                                A secure temporary password will be auto-generated and sent via SMS to the admin's contact number. They will be required to change their password upon first login.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Reset password toggle (edit only) */}
                            <div className="flex items-center gap-2 pt-1">
                                <Checkbox
                                    id="reset_password"
                                    checked={form.data.reset_password}
                                    onCheckedChange={(v) => {
                                        const checked = Boolean(v);
                                        form.setData('reset_password', checked);
                                        if (!checked) {
                                            form.setData('pw', '');
                                            form.setData('pw_confirmation', '');
                                        }
                                        clearPasswordErrors();
                                    }}
                                />
                                <Label
                                    htmlFor="reset_password"
                                    className="cursor-pointer"
                                >
                                    Reset password
                                </Label>
                            </div>
                        </>
                    )}

                    {/* Password fields (edit mode when reset_password checked) */}
                    {mode === 'edit' && form.data.reset_password && (
                        <>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">
                                    Auto-generated secure password
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const pwd = generatePassword(10);
                                        form.setData('pw', pwd);
                                        form.setData('pw_confirmation', pwd);
                                        clearPasswordErrors();
                                    }}
                                >
                                    Regenerate
                                </Button>
                            </div>

                            {/* Password */}
                            <div>
                                <Label
                                    htmlFor="admin-pw"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    Password <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="admin-pw"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Password"
                                        value={form.data.pw}
                                        readOnly
                                        onChange={(e) => {
                                            form.setData('pw', e.target.value);
                                            clearPasswordErrors();
                                            clearLocalError('pw');
                                        }}
                                        className={cn(
                                            'pr-24',
                                            inputErrorClass(Boolean(form.errors.pw || localErrors.pw)),
                                        )}
                                        aria-invalid={Boolean(form.errors.pw || localErrors.pw)}
                                    />
                                    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                copyToClipboard(form.data.pw, 'pw')
                                            }
                                        >
                                            {copied === 'pw' ? 'Copied' : 'Copy'}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword((p) => !p)
                                            }
                                            className="px-1 text-muted-foreground hover:text-foreground"
                                            aria-label={
                                                showPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            {showPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <FormFieldError
                                    label="Password"
                                    message={form.errors.pw ?? localErrors.pw}
                                />
                            </div>

                            {/* Confirm password */}
                            <div>
                                <Label
                                    htmlFor="admin-pw-confirm"
                                    className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                >
                                    Confirm password{' '}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="admin-pw-confirm"
                                        type={
                                            showConfirmPassword ? 'text' : 'password'
                                        }
                                        placeholder="Confirm password"
                                        value={form.data.pw_confirmation}
                                        readOnly
                                        onChange={(e) => {
                                            form.setData(
                                                'pw_confirmation',
                                                e.target.value,
                                            );
                                            clearPasswordErrors();
                                        }}
                                        className={cn(
                                            'pr-24',
                                            inputErrorClass(
                                                Boolean(form.errors.pw_confirmation),
                                            ),
                                        )}
                                        aria-invalid={Boolean(
                                            form.errors.pw_confirmation,
                                        )}
                                    />
                                    <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                                            onClick={() =>
                                                copyToClipboard(
                                                    form.data.pw_confirmation,
                                                    'confirm',
                                                )
                                            }
                                        >
                                            {copied === 'confirm' ? 'Copied' : 'Copy'}
                                        </Button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword((p) => !p)
                                            }
                                            className="px-1 text-muted-foreground hover:text-foreground"
                                            aria-label={
                                                showConfirmPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff size={16} />
                                            ) : (
                                                <Eye size={16} />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <FormFieldError
                                    label="Confirm password"
                                    message={form.errors.pw_confirmation}
                                />
                            </div>

                            <p className="text-xs text-muted-foreground">
                                A secure random password has been generated
                                automatically. Copy it before saving.
                            </p>
                        </>
                    )}
                </form>

                <DialogFooter>
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
                            className="gap-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            Next
                            <ChevronRight className="size-4" />
                        </Button>
                    )}
                </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>

        {/* Step 2 — address (opens when create wizard advances, no DB write yet) */}
        <AddressModal
            open={open && step === 2}
            title="Set Up Admin Address"
            adminData={pendingAdminData ?? undefined}
            onBack={() => setStep(1)}
            onClose={() => {
                onClose();
                setStep(1);
                setPendingAdminData(null);
            }}
            onSuccess={() => {
                onSuccess?.();
                onClose();
                setStep(1);
                setPendingAdminData(null);
            }}
        />
        </>
    );
}
