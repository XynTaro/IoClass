import { useForm } from '@inertiajs/react';
import {
    AlertCircle,
    Camera,
    Check,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    HeartHandshake,
    Image as ImageIcon,
    MapPin,
    Trash2,
    Upload,
    User,
    UserRound,
    UsersRound,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { route } from 'ziggy-js';
import { AddressSection, useCascade } from '@/components/Address';
import RfidUidInput from '@/components/RfidUidInput';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    cn,
    formatContactNumberInput,
    formatEmailInput,
    formatLrnInput,
    formatNameInput,
} from '@/lib/utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function inputErrorClass(hasError: boolean): string {
    return hasError
        ? 'border-red-500 bg-neutral-50 text-foreground focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:bg-neutral-950/40'
        : '';
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
            {message}
        </p>
    );
}

// ---------------------------------------------------------------------------
// Step indicator (create mode)
// ---------------------------------------------------------------------------
const STEPS = [
    { num: 1, label: 'Student', icon: GraduationCap },
    { num: 2, label: 'Address', icon: MapPin },
    { num: 3, label: 'Family', icon: UsersRound },
] as const;

function StepIndicator({ current }: { current: 1 | 2 | 3 }) {
    return (
        <div className="flex items-center justify-center gap-0 py-1">
            {STEPS.map(({ num, label, icon: Icon }, i) => {
                const done = num < current;
                const active = num === current;
                return (
                    <div key={num} className="flex items-center">
                        {i > 0 && (
                            <div
                                className={cn(
                                    'mx-2 h-0.5 w-8 rounded-full sm:w-14',
                                    num <= current
                                        ? 'bg-emerald-500'
                                        : 'bg-muted',
                                )}
                            />
                        )}
                        <div className="flex flex-col items-center gap-1">
                            <div
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full border-2 transition-colors',
                                    done &&
                                        'border-emerald-500 bg-emerald-500 text-white',
                                    active &&
                                        'border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40',
                                    !done &&
                                        !active &&
                                        'border-muted bg-muted/30 text-muted-foreground',
                                )}
                            >
                                {done ? (
                                    <Check className="size-4" />
                                ) : (
                                    <Icon className="size-4" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    'text-[10px] font-medium',
                                    active
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-muted-foreground',
                                )}
                            >
                                {label}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Error banner
// ---------------------------------------------------------------------------
function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-400">{message}</p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SectionOption {
    sect_id: number;
    sect_name: string;
    gr_level: string;
}

type Status = 'active' | 'inactive';

export interface Student {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_mname?: string | null;
    stu_lname: string;
    gender?: 'male' | 'female' | null;
    photo?: string | null;
    stu_address?: string | null;
    gr_level?: string | null;
    sect?: string | null;
    rfid_uid: string;
    status: Status | null;
}

interface StudentFormData {
    stu_id: number | '';
    lrn: string;
    stu_fname: string;
    stu_mname: string;
    stu_lname: string;
    gender: 'male' | 'female' | '';
    photo: File | null;
    remove_photo?: boolean;
    sect_id: number | '';
    gr_level: string;
    sect: string;
    rfid_uid: string;
    status: string;
    region: string;
    province: string;
    municipality: string;
    barangay: string;
    father_name: string;
    father_mname: string;
    father_lname: string;
    father_email: string;
    father_contact_number: string;
    father_is_deceased: boolean;
    mother_name: string;
    mother_mname: string;
    mother_lname: string;
    mother_email: string;
    mother_contact_number: string;
    mother_is_deceased: boolean;
    guardian_name: string;
    guardian_mname: string;
    guardian_lname: string;
    guardian_email: string;
    guardian_contact_number: string;
}

interface StudentModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    student?: Student;
    mode: 'create' | 'edit';
    sections?: SectionOption[];
}

const emptyForm: StudentFormData = {
    stu_id: '',
    lrn: '',
    stu_fname: '',
    stu_mname: '',
    stu_lname: '',
    gender: 'male',
    photo: null,
    remove_photo: false,
    sect_id: '',
    gr_level: '',
    sect: '',
    rfid_uid: '',
    status: 'active',
    region: '',
    province: '',
    municipality: '',
    barangay: '',
    father_name: '',
    father_mname: '',
    father_lname: '',
    father_email: '',
    father_contact_number: '',
    father_is_deceased: false,
    mother_name: '',
    mother_mname: '',
    mother_lname: '',
    mother_email: '',
    mother_contact_number: '',
    mother_is_deceased: false,
    guardian_name: '',
    guardian_mname: '',
    guardian_lname: '',
    guardian_email: '',
    guardian_contact_number: '',
};

// ---------------------------------------------------------------------------
// Step-1 local validation (required fields only)
// ---------------------------------------------------------------------------
type LocalErrors = Partial<Record<keyof StudentFormData, string>>;

function validateStep1(data: StudentFormData): LocalErrors {
    const errors: LocalErrors = {};
    if (!data.lrn.trim()) errors.lrn = 'LRN is required.';
    if (!data.stu_fname.trim()) errors.stu_fname = 'First name is required.';
    if (!data.stu_mname.trim()) errors.stu_mname = 'Middle name is required.';
    if (!data.stu_lname.trim()) errors.stu_lname = 'Last name is required.';
    if (!data.gender) errors.gender = 'Gender is required.';
    if (!data.gr_level.trim()) errors.gr_level = 'Grade level is required.';
    if (!data.sect_id) errors.sect = 'Section is required.';
    if (!data.rfid_uid.trim()) errors.rfid_uid = 'RFID UID is required.';
    return errors;
}

// ---------------------------------------------------------------------------
// Reusable field row used in all steps
// ---------------------------------------------------------------------------
interface FieldProps {
    id: keyof StudentFormData;
    label: string;
    value: string;
    onChange: (val: string) => void;
    error?: string;
    localError?: string;
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

function Field({
    id,
    label,
    value,
    onChange,
    error,
    localError,
    inputProps,
}: FieldProps) {
    const hasError = Boolean(error || localError);
    return (
        <div>
            <Label
                htmlFor={id}
                className="mb-1 inline-block text-xs font-medium text-muted-foreground"
            >
                {label}
            </Label>
            <Input
                id={id}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                aria-invalid={hasError}
                className={inputErrorClass(hasError)}
                {...inputProps}
            />
            <FieldError message={error ?? localError} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Parent / Guardian section used inside step 3
// ---------------------------------------------------------------------------
interface ParentSectionProps {
    title: string;
    prefix: 'father' | 'mother' | 'guardian';
    data: StudentFormData;
    errors: Partial<Record<keyof StudentFormData, string>>;
    onChange: (field: keyof StudentFormData, val: string) => void;
    onDeceasedChange?: (deceased: boolean) => void;
}

const FIRST_NAME_KEY: Record<
    'father' | 'mother' | 'guardian',
    keyof StudentFormData
> = {
    father: 'father_name',
    mother: 'mother_name',
    guardian: 'guardian_name',
};

const DECEASED_KEY: Partial<
    Record<'father' | 'mother' | 'guardian', keyof StudentFormData>
> = {
    father: 'father_is_deceased',
    mother: 'mother_is_deceased',
};

const PARENT_STYLE: Record<
    'father' | 'mother' | 'guardian',
    {
        icon: React.ElementType;
        iconBg: string;
        iconColor: string;
        border: string;
    }
> = {
    father: {
        icon: User,
        iconBg: 'bg-blue-100 dark:bg-blue-950/50',
        iconColor: 'text-blue-600 dark:text-blue-400',
        border: 'border-l-blue-400',
    },
    mother: {
        icon: UserRound,
        iconBg: 'bg-rose-100 dark:bg-rose-950/50',
        iconColor: 'text-rose-600 dark:text-rose-400',
        border: 'border-l-rose-400',
    },
    guardian: {
        icon: HeartHandshake,
        iconBg: 'bg-violet-100 dark:bg-violet-950/50',
        iconColor: 'text-violet-600 dark:text-violet-400',
        border: 'border-l-violet-400',
    },
};

function ParentSection({
    title,
    prefix,
    data,
    errors,
    onChange,
    onDeceasedChange,
}: ParentSectionProps) {
    const fnameKey = FIRST_NAME_KEY[prefix];
    const mnameKey = `${prefix}_mname` as keyof StudentFormData;
    const lnameKey = `${prefix}_lname` as keyof StudentFormData;
    const emailKey = `${prefix}_email` as keyof StudentFormData;
    const phoneKey = `${prefix}_contact_number` as keyof StudentFormData;
    const deceasedKey = DECEASED_KEY[prefix];
    const isDeceased = deceasedKey ? Boolean(data[deceasedKey]) : false;
    const { icon: Icon, iconBg, iconColor, border } = PARENT_STYLE[prefix];

    return (
        <div
            className={cn(
                'space-y-3 rounded-xl border border-l-4 bg-card p-4 shadow-sm',
                border,
            )}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div
                        className={cn(
                            'flex size-8 items-center justify-center rounded-lg',
                            iconBg,
                        )}
                    >
                        <Icon className={cn('size-4', iconColor)} />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                        {title}
                    </p>
                </div>
                {deceasedKey && onDeceasedChange && (
                    <div
                        className={cn(
                            'flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors',
                            isDeceased ? 'bg-muted' : 'hover:bg-muted/50',
                        )}
                    >
                        <Checkbox
                            id={`${prefix}_is_deceased`}
                            checked={isDeceased}
                            onCheckedChange={(checked) =>
                                onDeceasedChange(Boolean(checked))
                            }
                        />
                        <Label
                            htmlFor={`${prefix}_is_deceased`}
                            className="cursor-pointer text-xs text-muted-foreground"
                        >
                            Deceased
                        </Label>
                    </div>
                )}
            </div>
            <div className={isDeceased ? 'pointer-events-none opacity-40' : ''}>
                <div className="grid gap-3 sm:grid-cols-3">
                    <Field
                        id={fnameKey}
                        label="First name"
                        value={data[fnameKey] as string}
                        onChange={(v) => onChange(fnameKey, formatNameInput(v))}
                        error={errors[fnameKey]}
                        inputProps={{
                            placeholder: 'First name',
                            disabled: isDeceased,
                        }}
                    />
                    <Field
                        id={mnameKey}
                        label="Middle name"
                        value={data[mnameKey] as string}
                        onChange={(v) => onChange(mnameKey, formatNameInput(v))}
                        error={errors[mnameKey]}
                        inputProps={{
                            placeholder: 'Middle name',
                            disabled: isDeceased,
                        }}
                    />
                    <Field
                        id={lnameKey}
                        label="Last name"
                        value={data[lnameKey] as string}
                        onChange={(v) => onChange(lnameKey, formatNameInput(v))}
                        error={errors[lnameKey]}
                        inputProps={{
                            placeholder: 'Last name',
                            disabled: isDeceased,
                        }}
                    />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <Field
                        id={emailKey}
                        label="Email"
                        value={data[emailKey] as string}
                        onChange={(v) =>
                            onChange(emailKey, formatEmailInput(v))
                        }
                        error={errors[emailKey]}
                        inputProps={{
                            placeholder: 'Email address',
                            type: 'email',
                            disabled: isDeceased,
                        }}
                    />
                    <Field
                        id={phoneKey}
                        label="Contact number"
                        value={data[phoneKey] as string}
                        onChange={(v) =>
                            onChange(phoneKey, formatContactNumberInput(v))
                        }
                        error={errors[phoneKey]}
                        inputProps={{
                            placeholder: 'Contact number',
                            disabled: isDeceased,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function StudentModal({
    open,
    onClose,
    onSuccess,
    student,
    mode,
    sections = [],
}: StudentModalProps) {
    const form = useForm<StudentFormData>(emptyForm);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [localErrors, setLocalErrors] = useState<LocalErrors>({});
    const [rfidRegistryConflict, setRfidRegistryConflict] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // ---- Address state (step 2) ----
    const permCascade = useCascade();
    const currCascade = useCascade();
    const [permAddress, setPermAddress] = useState({
        region: '',
        province: '',
        municipality: '',
        barangay: '',
    });
    const [currAddress, setCurrAddress] = useState({
        region: '',
        province: '',
        municipality: '',
        barangay: '',
    });
    const [sameAsPermanent, setSameAsPermanent] = useState(true);

    // Derived grade levels (unique, sorted)
    const gradeOptions = Array.from(
        new Set(sections.map((s) => s.gr_level)),
    ).sort();

    // Sections filtered by the currently selected grade level
    const sectionOptions = sections.filter(
        (s) => s.gr_level === form.data.gr_level,
    );

    // Populate form when editing
    useEffect(() => {
        if (student && mode === 'edit') {
            form.setData({
                ...emptyForm,
                stu_id: student.stu_id,
                lrn: student.lrn ?? '',
                stu_fname: student.stu_fname ?? '',
                stu_mname: student.stu_mname ?? '',
                stu_lname: student.stu_lname ?? '',
                gender: (student.gender as 'male' | 'female') ?? 'male',
                photo: null,
                remove_photo: false,
                rfid_uid: student.rfid_uid ?? '',
                status: student.status ?? 'active',
            });
            setPhotoPreview(student.photo ? `/storage/${student.photo}` : null);
        } else if (mode === 'create') {
            setPhotoPreview(null);
        }
    }, [student, mode, open]);

    // Reset when modal closes
    useEffect(() => {
        if (!open) {
            form.reset();
            setStep(1);
            setLocalErrors({});
            setPhotoPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            permCascade.reset();
            currCascade.reset();
            setPermAddress({
                region: '',
                province: '',
                municipality: '',
                barangay: '',
            });
            setCurrAddress({
                region: '',
                province: '',
                municipality: '',
                barangay: '',
            });
            setSameAsPermanent(true);
            setRfidRegistryConflict(false);
            setSubmitError(null);
        }
    }, [open]);

    const setField = (key: keyof StudentFormData, val: string) => {
        form.setData(key, val as never);
        form.clearErrors(key);
        setLocalErrors((prev) => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            form.setData('photo', file);
            form.setData('remove_photo', false);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemovePhoto = () => {
        form.setData('photo', null);
        form.setData('remove_photo', true);
        setPhotoPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // -------------------------------------------------------------------------
    // Step navigation
    // -------------------------------------------------------------------------
    const handleNextFromStep1 = () => {
        const errors = validateStep1(form.data);
        if (Object.keys(errors).length > 0) {
            setLocalErrors(errors);
            return;
        }
        if (rfidRegistryConflict) {
            setLocalErrors({
                rfid_uid:
                    'This RFID card is already registered to another person.',
            });
            return;
        }
        setLocalErrors({});
        setStep(2);
    };

    /** Store individual address fields and advance */
    const handleNextFromStep2 = () => {
        const addr = sameAsPermanent ? permAddress : currAddress;
        form.setData({
            ...form.data,
            region: addr.region,
            province: addr.province,
            municipality: addr.municipality,
            barangay: addr.barangay,
        });
        setStep(3);
    };

    // -------------------------------------------------------------------------
    // Submissions
    // -------------------------------------------------------------------------
    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rfidRegistryConflict) {
            setLocalErrors({
                rfid_uid:
                    'This RFID card is already registered to another person.',
            });
            return;
        }
        setSubmitError(null);

        // Submit via POST with method spoofing for file uploads
        form.transform((data) => ({
            ...data,
            _method: 'put',
        }));
        form.post(route('admin.student.update', { id: form.data.stu_id }), {
            forceFormData: true,
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onError: () => {
                setSubmitError(
                    'Failed to save student. Please check the fields and try again.',
                );
            },
        });
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (rfidRegistryConflict) {
            setLocalErrors({
                rfid_uid:
                    'This RFID card is already registered to another person.',
            });
            setStep(1);
            return;
        }

        form.clearErrors();
        const errors: Record<string, string> = {};
        if (form.data.father_contact_number && !form.data.father_is_deceased) {
            const cleanNum = form.data.father_contact_number.replace(/\D/g, '');
            if (cleanNum.length !== 11) {
                errors.father_contact_number = 'Contact number must be exactly 11 digits.';
            }
        }
        if (form.data.mother_contact_number && !form.data.mother_is_deceased) {
            const cleanNum = form.data.mother_contact_number.replace(/\D/g, '');
            if (cleanNum.length !== 11) {
                errors.mother_contact_number = 'Contact number must be exactly 11 digits.';
            }
        }
        if (form.data.guardian_contact_number) {
            const cleanNum = form.data.guardian_contact_number.replace(/\D/g, '');
            if (cleanNum.length !== 11) {
                errors.guardian_contact_number = 'Contact number must be exactly 11 digits.';
            }
        }

        if (Object.keys(errors).length > 0) {
            form.setError(errors);
            return;
        }

        setSubmitError(null);
        form.post(route('admin.student.store'), {
            forceFormData: true,
            onSuccess: () => {
                onSuccess?.();
                onClose();
            },
            onError: (errors) => {
                const step1Fields = [
                    'lrn',
                    'stu_fname',
                    'stu_mname',
                    'stu_lname',
                    'gender',
                    'photo',
                    'rfid_uid',
                    'status',
                ];
                if (step1Fields.some((f) => f in errors)) {
                    setStep(1);
                }
                setSubmitError(
                    'Failed to add student. Please review the highlighted fields and try again.',
                );
            },
        });
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <>
            {/* ----------------------------------------------------------------
                Step 1 — Basic student info
                (also used as the only dialog in edit mode, includes address)
            ---------------------------------------------------------------- */}
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
                    <div className="h-1 w-full bg-emerald-500" />
                    <div className="space-y-4 p-6 pt-4">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                                    <GraduationCap className="size-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold">
                                        {mode === 'edit'
                                            ? 'Edit Student'
                                            : 'Add Student'}
                                    </DialogTitle>
                                    <p className="text-xs text-muted-foreground">
                                        {mode === 'edit'
                                            ? 'Update the student information below'
                                            : 'Basic information about the student'}
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        {mode === 'create' && <StepIndicator current={1} />}

                        <form
                            onSubmit={
                                mode === 'edit'
                                    ? handleEditSubmit
                                    : (e) => {
                                          e.preventDefault();
                                          handleNextFromStep1();
                                      }
                            }
                            className="max-h-[72vh] space-y-4 overflow-y-auto pr-1"
                        >
                            {/* Student Photo */}
                            <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/80 bg-muted/20 p-3.5 transition-colors hover:bg-muted/30 sm:flex-row sm:justify-start">
                                <div className="relative group flex size-18 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-muted-foreground/25 bg-background shadow-xs">
                                    {photoPreview ? (
                                        <img
                                            src={photoPreview}
                                            alt="Student preview"
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground/50">
                                            <User className="size-8" />
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
                                        title="Upload photo"
                                    >
                                        <Camera className="size-5" />
                                    </button>
                                </div>

                                <div className="flex-1 space-y-1 text-center sm:text-left">
                                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="h-8 gap-1.5 text-xs font-semibold cursor-pointer"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            <Upload className="size-3.5" />
                                            {photoPreview ? 'Change Photo' : 'Upload Photo'}
                                        </Button>
                                        {photoPreview && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/40 cursor-pointer"
                                                onClick={handleRemovePhoto}
                                            >
                                                <Trash2 className="size-3.5" />
                                                Remove
                                            </Button>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground">
                                        PNG, JPG, or WEBP up to 2MB. Optional.
                                    </p>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/png,image/jpeg,image/jpg,image/webp"
                                        className="hidden"
                                        onChange={handlePhotoChange}
                                    />
                                    {form.errors.photo && <FieldError message={form.errors.photo} />}
                                </div>
                            </div>

                            <Field
                                id="lrn"
                                label="LRN *"
                                value={form.data.lrn}
                                onChange={(v) =>
                                    setField('lrn', formatLrnInput(v))
                                }
                                error={form.errors.lrn}
                                localError={localErrors.lrn}
                                inputProps={{
                                    placeholder: 'Learner Reference Number',
                                    inputMode: 'numeric',
                                    pattern: '[0-9]*',
                                    required: true,
                                }}
                            />

                            {/* Gender / Sex */}
                            <div>
                                <Label className="mb-1.5 inline-block text-xs font-medium text-muted-foreground">
                                    Gender / Sex *
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setField('gender', 'male')}
                                        className={cn(
                                            'flex items-center justify-center gap-2.5 rounded-xl border p-2.5 text-sm font-semibold transition-all cursor-pointer',
                                            form.data.gender === 'male'
                                                ? 'border-blue-500 bg-blue-500/10 text-blue-700 ring-2 ring-blue-500/20 dark:text-blue-400 dark:bg-blue-500/15'
                                                : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                                                form.data.gender === 'male'
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            M
                                        </div>
                                        <span>Male</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setField('gender', 'female')}
                                        className={cn(
                                            'flex items-center justify-center gap-2.5 rounded-xl border p-2.5 text-sm font-semibold transition-all cursor-pointer',
                                            form.data.gender === 'female'
                                                ? 'border-rose-500 bg-rose-500/10 text-rose-700 ring-2 ring-rose-500/20 dark:text-rose-400 dark:bg-rose-500/15'
                                                : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                                                form.data.gender === 'female'
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            F
                                        </div>
                                        <span>Female</span>
                                    </button>
                                </div>
                                <FieldError message={form.errors.gender ?? localErrors.gender} />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3">
                                <Field
                                    id="stu_fname"
                                    label="First name *"
                                    value={form.data.stu_fname}
                                    onChange={(v) =>
                                        setField(
                                            'stu_fname',
                                            formatNameInput(v),
                                        )
                                    }
                                    error={form.errors.stu_fname}
                                    localError={localErrors.stu_fname}
                                    inputProps={{
                                        placeholder: 'First name',
                                        required: true,
                                    }}
                                />
                                <Field
                                    id="stu_mname"
                                    label="Middle name *"
                                    value={form.data.stu_mname}
                                    onChange={(v) =>
                                        setField(
                                            'stu_mname',
                                            formatNameInput(v),
                                        )
                                    }
                                    error={form.errors.stu_mname}
                                    localError={localErrors.stu_mname}
                                    inputProps={{
                                        placeholder: 'Middle name',
                                        required: true,
                                    }}
                                />
                                <Field
                                    id="stu_lname"
                                    label="Last name *"
                                    value={form.data.stu_lname}
                                    onChange={(v) =>
                                        setField(
                                            'stu_lname',
                                            formatNameInput(v),
                                        )
                                    }
                                    error={form.errors.stu_lname}
                                    localError={localErrors.stu_lname}
                                    inputProps={{
                                        placeholder: 'Last name',
                                        required: true,
                                    }}
                                />
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {/* Grade level dropdown */}
                                <div>
                                    <Label
                                        htmlFor="gr_level"
                                        className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                    >
                                        Grade level *
                                    </Label>
                                    <select
                                        id="gr_level"
                                        value={form.data.gr_level}
                                        onChange={(e) => {
                                            setField(
                                                'gr_level',
                                                e.target.value,
                                            );
                                            setField('sect', '');
                                        }}
                                        className={`h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm ${inputErrorClass(Boolean(form.errors.gr_level || localErrors.gr_level))}`}
                                    >
                                        <option value="">
                                            Select grade level
                                        </option>
                                        {gradeOptions.map((g) => (
                                            <option key={g} value={g}>
                                                {g}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={
                                            form.errors.gr_level ??
                                            localErrors.gr_level
                                        }
                                    />
                                </div>

                                {/* Section dropdown — filtered by selected grade */}
                                <div>
                                    <Label
                                        htmlFor="sect"
                                        className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                    >
                                        Section *
                                    </Label>
                                    <select
                                        id="sect"
                                        value={form.data.sect_id}
                                        onChange={(e) => {
                                            const selected =
                                                sectionOptions.find(
                                                    (s) =>
                                                        s.sect_id ===
                                                        Number(e.target.value),
                                                );
                                            form.setData({
                                                ...form.data,
                                                sect_id: selected
                                                    ? selected.sect_id
                                                    : '',
                                                sect: selected
                                                    ? selected.sect_name
                                                    : '',
                                            });
                                        }}
                                        disabled={!form.data.gr_level}
                                        className={`h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50 ${inputErrorClass(Boolean(form.errors.sect || localErrors.sect))}`}
                                    >
                                        <option value="">
                                            {form.data.gr_level
                                                ? 'Select section'
                                                : 'Select grade first'}
                                        </option>
                                        {sectionOptions.map((s) => (
                                            <option
                                                key={s.sect_id}
                                                value={s.sect_id}
                                            >
                                                {s.sect_name}
                                            </option>
                                        ))}
                                    </select>
                                    <FieldError
                                        message={
                                            form.errors.sect ?? localErrors.sect
                                        }
                                    />
                                </div>
                            </div>

                            <RfidUidInput
                                id="rfid_uid"
                                label="RFID UID"
                                value={form.data.rfid_uid}
                                onChange={(v) => setField('rfid_uid', v)}
                                error={
                                    form.errors.rfid_uid ?? localErrors.rfid_uid
                                }
                                excludeUid={
                                    mode === 'edit'
                                        ? (student?.rfid_uid ?? '')
                                        : ''
                                }
                                required
                                enabled={
                                    open && (mode === 'edit' || step === 1)
                                }
                                captureGlobalScan={
                                    open && (mode === 'edit' || step === 1)
                                }
                                wirelessCapture={
                                    open && (mode === 'edit' || step === 1)
                                }
                                onConflictChange={setRfidRegistryConflict}
                            />

                            {/* Status shown inline in edit mode only */}
                            {mode === 'edit' && (
                                <div>
                                    <Label
                                        htmlFor="status"
                                        className="mb-1 inline-block text-xs font-medium text-muted-foreground"
                                    >
                                        Status
                                    </Label>
                                    <select
                                        id="status"
                                        value={form.data.status}
                                        onChange={(e) =>
                                            form.setData(
                                                'status',
                                                e.target.value,
                                            )
                                        }
                                        className="h-9 w-full rounded-md border bg-background px-3 text-sm shadow-sm"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">
                                            Inactive
                                        </option>
                                    </select>
                                    <FieldError message={form.errors.status} />
                                </div>
                            )}
                        </form>

                        {submitError && mode === 'edit' && (
                            <ErrorBanner message={submitError} />
                        )}

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
                                    {form.processing
                                        ? 'Saving…'
                                        : 'Save changes'}
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    onClick={handleNextFromStep1}
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

            {/* ----------------------------------------------------------------
                Step 2 — Address (create mode only, PSGC cascade picker)
            ---------------------------------------------------------------- */}
            <Dialog
                open={open && step === 2}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        onClose();
                        setStep(1);
                    }
                }}
            >
                <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-xl">
                    <div className="h-1 w-full bg-emerald-500" />
                    <div className="space-y-4 p-6 pt-4">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-950/50">
                                    <MapPin className="size-5 text-sky-600 dark:text-sky-400" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold">
                                        Student Address
                                    </DialogTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Home address — optional
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        <StepIndicator current={2} />

                        <div className="max-h-[68vh] space-y-5 overflow-y-auto pr-1">
                            {/* Permanent address */}
                            <AddressSection
                                title="Permanent Address"
                                cascade={permCascade}
                                barangayValue={permAddress.barangay}
                                onRegionChange={(_code, name) =>
                                    setPermAddress((p) => ({
                                        ...p,
                                        region: name,
                                        province: '',
                                        municipality: '',
                                        barangay: '',
                                    }))
                                }
                                onProvinceChange={(_code, name) =>
                                    setPermAddress((p) => ({
                                        ...p,
                                        province: name,
                                        municipality: '',
                                        barangay: '',
                                    }))
                                }
                                onMunicipalityChange={(_code, name) =>
                                    setPermAddress((p) => ({
                                        ...p,
                                        municipality: name,
                                        barangay: '',
                                    }))
                                }
                                onBarangayChange={(name) =>
                                    setPermAddress((p) => ({
                                        ...p,
                                        barangay: name,
                                    }))
                                }
                            />

                            {/* Same-address checkbox */}
                            <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
                                <Checkbox
                                    id="same_as_permanent_stu"
                                    checked={sameAsPermanent}
                                    onCheckedChange={(checked) => {
                                        setSameAsPermanent(Boolean(checked));
                                        if (checked) {
                                            currCascade.reset();
                                            setCurrAddress({
                                                region: '',
                                                province: '',
                                                municipality: '',
                                                barangay: '',
                                            });
                                        }
                                    }}
                                />
                                <Label
                                    htmlFor="same_as_permanent_stu"
                                    className="cursor-pointer text-sm"
                                >
                                    Current address is the same as permanent
                                    address
                                </Label>
                            </div>

                            {/* Current address — shown only when not same */}
                            {!sameAsPermanent && (
                                <div className="space-y-3 rounded-md border p-3">
                                    <AddressSection
                                        title="Current Address"
                                        cascade={currCascade}
                                        barangayValue={currAddress.barangay}
                                        onRegionChange={(_code, name) =>
                                            setCurrAddress((p) => ({
                                                ...p,
                                                region: name,
                                                province: '',
                                                municipality: '',
                                                barangay: '',
                                            }))
                                        }
                                        onProvinceChange={(_code, name) =>
                                            setCurrAddress((p) => ({
                                                ...p,
                                                province: name,
                                                municipality: '',
                                                barangay: '',
                                            }))
                                        }
                                        onMunicipalityChange={(_code, name) =>
                                            setCurrAddress((p) => ({
                                                ...p,
                                                municipality: name,
                                                barangay: '',
                                            }))
                                        }
                                        onBarangayChange={(name) =>
                                            setCurrAddress((p) => ({
                                                ...p,
                                                barangay: name,
                                            }))
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-1 rounded-xl"
                                onClick={() => setStep(1)}
                            >
                                <ChevronLeft className="size-4" />
                                Back
                            </Button>
                            <Button
                                type="button"
                                onClick={handleNextFromStep2}
                                className="gap-1 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                Next
                                <ChevronRight className="size-4" />
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ----------------------------------------------------------------
                Step 3 — Parent / Guardian (create mode only)
            ---------------------------------------------------------------- */}
            <Dialog
                open={open && step === 3}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        onClose();
                        setStep(1);
                    }
                }}
            >
                <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-2xl">
                    <div className="h-1 w-full bg-emerald-500" />
                    <div className="space-y-4 p-6 pt-4">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/50">
                                    <UsersRound className="size-5 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-semibold">
                                        Parent / Guardian
                                    </DialogTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Family contact details — all fields
                                        optional
                                    </p>
                                </div>
                            </div>
                        </DialogHeader>

                        <StepIndicator current={3} />

                        <form
                            onSubmit={handleCreateSubmit}
                            className="max-h-[68vh] space-y-4 overflow-y-auto pr-1"
                        >
                            <ParentSection
                                title="Father"
                                prefix="father"
                                data={form.data}
                                errors={form.errors}
                                onChange={setField}
                                onDeceasedChange={(deceased) =>
                                    form.setData('father_is_deceased', deceased)
                                }
                            />
                            <ParentSection
                                title="Mother"
                                prefix="mother"
                                data={form.data}
                                errors={form.errors}
                                onChange={setField}
                                onDeceasedChange={(deceased) =>
                                    form.setData('mother_is_deceased', deceased)
                                }
                            />
                            <ParentSection
                                title="Guardian"
                                prefix="guardian"
                                data={form.data}
                                errors={form.errors}
                                onChange={setField}
                            />
                        </form>

                        {submitError && mode === 'create' && (
                            <ErrorBanner message={submitError} />
                        )}

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="gap-1 rounded-xl"
                                onClick={() => setStep(2)}
                                disabled={form.processing}
                            >
                                <ChevronLeft className="size-4" />
                                Back
                            </Button>
                            <Button
                                type="submit"
                                disabled={form.processing}
                                onClick={handleCreateSubmit}
                                className="gap-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                                {form.processing ? (
                                    'Adding…'
                                ) : (
                                    <>
                                        <Check className="size-4" />
                                        Add student
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
