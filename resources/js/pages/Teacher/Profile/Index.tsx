import { Head, useForm, usePage, router } from '@inertiajs/react';
import {
    AtSign,
    Camera,
    Eye,
    EyeOff,
    KeyRound,
    Phone,
    Shield,
    User,
} from 'lucide-react';
import { useMemo, useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useInitials } from '@/hooks/use-initials';
import TeacherLayout from '@/layouts/teacher/teacher-layout';

import { cn, formatContactNumberInput, formatEmailInput, formatNameInput } from '@/lib/utils';
import teacher from '@/routes/teacher';
import type { SharedData } from '@/types';

type TeacherData = {
    fname: string;
    mname: string | null;
    lname: string;
    email: string;
    contact_number: string | null;
};

type PageProps = SharedData & {
    teacher: TeacherData;
    status?: string;
};

// ─── Password strength ────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
    label,
    error,
    hint,
    children,
}: {
    label: string;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {label}
            </Label>
            {children}
            {error && (
                <p className="flex items-center gap-1 text-xs text-red-500">
                    <span className="inline-block size-1 rounded-full bg-red-500" />
                    {error}
                </p>
            )}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function SectionHeader({
    icon: Icon,
    title,
    description,
}: {
    icon: React.ElementType;
    title: string;
    description: string;
}) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40">
                <Icon className="size-4 text-blue-600" />
            </div>
            <div>
                <p className="font-semibold text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

function PasswordInput({
    value,
    onChange,
    show,
    onToggle,
    placeholder,
    autoComplete,
}: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggle: () => void;
    placeholder?: string;
    autoComplete?: string;
}) {
    return (
        <div className="relative">
            <Input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="rounded-xl pr-10"
                placeholder={placeholder ?? '••••••••'}
                autoComplete={autoComplete}
            />
            <button
                type="button"
                onClick={onToggle}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                tabIndex={-1}
            >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeacherProfileIndex() {
    const { auth, teacher: teacherData, status } = usePage<PageProps>().props;
    const getInitials = useInitials();

    const fullName = auth.user.name;
    const initials = getInitials(fullName);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [avatarError, setAvatarError] = useState<string | null>(null);



    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setAvatarError('The avatar must not be greater than 2MB.');
            return;
        }

        setAvatarError(null);
        setIsUploading(true);

        router.post('/teacher/profile/avatar', {
            avatar: file,
        }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => setIsUploading(false),
            onError: (errors) => {
                if (errors.avatar) {
                    setAvatarError(errors.avatar);
                }
            },
            onSuccess: () => {
                setAvatarError(null);
            }
        });
    };

    const profileForm = useForm({
        fname: teacherData.fname ?? '',
        mname: teacherData.mname ?? '',
        lname: teacherData.lname ?? '',
        email: teacherData.email ?? '',
        contact_number: teacherData.contact_number ?? '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const pwStrength = useMemo(
        () => getPasswordStrength(passwordForm.data.password),
        [passwordForm.data.password],
    );

    function submitProfile(e: React.FormEvent) {
        e.preventDefault();
        profileForm.clearErrors();

        let hasError = false;
        if (!profileForm.data.fname.trim()) {
            profileForm.setError('fname', 'First name is required.');
            hasError = true;
        }
        if (!profileForm.data.lname.trim()) {
            profileForm.setError('lname', 'Last name is required.');
            hasError = true;
        }
        if (!profileForm.data.email.trim()) {
            profileForm.setError('email', 'Email address is required.');
            hasError = true;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.data.email)) {
            profileForm.setError('email', 'Invalid email address format.');
            hasError = true;
        }

        if (profileForm.data.contact_number) {
            const cleanNum = profileForm.data.contact_number.replace(/\D/g, '');
            if (cleanNum.length !== 11) {
                profileForm.setError('contact_number', 'Contact number must be exactly 11 digits.');
                hasError = true;
            }
        }

        if (hasError) {
            return;
        }

        profileForm.patch(teacher.profile.update.url(), { preserveScroll: true });
    }

    function submitPassword(e: React.FormEvent) {
        e.preventDefault();
        passwordForm.put(teacher.profile.password.update.url(), {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    }

    return (
        <TeacherLayout>
            <Head title="Teacher · Profile" />

            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* Page Header — matches My Schedule & My Attendance style */}
                <div className="relative overflow-hidden rounded-xl border bg-gradient-to-r from-blue-500/[0.06] via-indigo-500/[0.03] to-transparent p-5 dark:from-blue-500/[0.10] dark:via-indigo-500/[0.05]">
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h1 className="text-xl font-bold tracking-tight text-foreground md:text-2xl">
                                My Profile
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Manage your account information and security settings.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-xs backdrop-blur-sm">
                            <Shield className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                            <span className="font-medium text-foreground">
                                Teacher Account
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                    {/* ── Left: Identity card ── */}
                    <div className="space-y-4">
                        <Card className="overflow-hidden rounded-2xl border-border/60 shadow-sm">
                            {/* Cover */}
                            <div className="relative h-28 bg-blue-600">
                                <div
                                    className="absolute inset-0 opacity-20"
                                    style={{
                                        backgroundImage:
                                            'radial-gradient(circle, white 1px, transparent 1px)',
                                        backgroundSize: '18px 18px',
                                    }}
                                />
                            </div>

                            <CardContent className="pb-6">
                                {/* Avatar floated up */}
                                <div className="-mt-12 mb-4 flex justify-center">
                                    <div className="relative">
                                        <Avatar className="size-24 border-4 border-background bg-blue-600 text-2xl font-bold text-white shadow-lg">
                                            <AvatarImage
                                                src={auth.user.avatar || ''}
                                                alt={fullName}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-blue-600 text-white font-bold">
                                                {initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <button
                                            type="button"
                                            onClick={triggerFileInput}
                                            disabled={isUploading}
                                            className="absolute right-0 bottom-0.5 flex size-7 items-center justify-center rounded-full border border-border/60 bg-background shadow-sm transition-colors hover:bg-muted"
                                            title="Change photo"
                                        >
                                            <Camera className={cn("size-3.5 text-muted-foreground", isUploading && "animate-pulse")} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                            accept="image/*"
                                        />
                                    </div>
                                </div>

                                {/* Name + badge */}
                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-foreground">
                                        {fullName}
                                    </h2>
                                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                                        <Shield className="size-3" />
                                        Teacher
                                    </span>
                                    {avatarError && (
                                        <p className="mt-2 text-center text-xs text-red-500 font-medium">
                                            {avatarError}
                                        </p>
                                    )}

                                </div>

                                <Separator className="my-4" />

                                {/* Info rows */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2.5 text-sm">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                            <AtSign className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <span className="min-w-0 truncate text-muted-foreground">
                                            {teacherData.email}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2.5 text-sm">
                                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                            <Phone className="size-3.5 text-muted-foreground" />
                                        </div>
                                        <span className="text-muted-foreground">
                                            {teacherData.contact_number || (
                                                <span className="italic opacity-60">No number</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tips card */}
                        <Card className="rounded-2xl border-border/60 bg-blue-50/60 shadow-sm dark:bg-blue-950/20">
                            <CardContent className="p-4">
                                <p className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-300">
                                    Security tips
                                </p>
                                <ul className="space-y-1 text-xs text-blue-700/80 dark:text-blue-400/80">
                                    <li>• Use a unique, strong password</li>
                                    <li>• Keep your email up to date</li>
                                    <li>• Log out from shared devices</li>
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* ── Right: Forms ── */}
                    <div className="space-y-5">
                        {/* Personal information */}
                        <Card className="rounded-2xl border-border/60 shadow-sm">
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={User}
                                    title="Personal Information"
                                    description="Update your name, email, and contact details."
                                />
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-5">


                                <form onSubmit={submitProfile} className="space-y-5">
                                    {/* Name row */}
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <Field
                                            label="First Name"
                                            error={profileForm.errors.fname}
                                        >
                                            <Input
                                                value={profileForm.data.fname}
                                                onChange={(e) => {
                                                    profileForm.setData('fname', formatNameInput(e.target.value));
                                                    profileForm.clearErrors('fname');
                                                }}
                                                className="rounded-xl"
                                                placeholder="Juan"
                                            />
                                        </Field>
                                        <Field
                                            label="Middle Name"
                                            error={profileForm.errors.mname}
                                        >
                                            <Input
                                                value={profileForm.data.mname}
                                                onChange={(e) => {
                                                    profileForm.setData('mname', formatNameInput(e.target.value));
                                                    profileForm.clearErrors('mname');
                                                }}
                                                className="rounded-xl"
                                                placeholder="Optional"
                                            />
                                        </Field>
                                        <Field
                                            label="Last Name"
                                            error={profileForm.errors.lname}
                                        >
                                            <Input
                                                value={profileForm.data.lname}
                                                onChange={(e) => {
                                                    profileForm.setData('lname', formatNameInput(e.target.value));
                                                    profileForm.clearErrors('lname');
                                                }}
                                                className="rounded-xl"
                                                placeholder="Dela Cruz"
                                            />
                                        </Field>
                                    </div>

                                    {/* Contact row */}
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Email Address"
                                            error={profileForm.errors.email}
                                        >
                                            <div className="relative">
                                                <AtSign className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="email"
                                                    value={profileForm.data.email}
                                                    onChange={(e) => {
                                                        profileForm.setData('email', formatEmailInput(e.target.value));
                                                        profileForm.clearErrors('email');
                                                    }}
                                                    className="rounded-xl pl-8"
                                                    placeholder="teacher@school.edu.ph"
                                                />
                                            </div>
                                        </Field>
                                        <Field
                                            label="Contact Number"
                                            error={profileForm.errors.contact_number}
                                        >
                                            <div className="relative">
                                                <Phone className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    type="tel"
                                                    value={profileForm.data.contact_number}
                                                    onChange={(e) => {
                                                        profileForm.setData('contact_number', formatContactNumberInput(e.target.value));
                                                        profileForm.clearErrors('contact_number');
                                                    }}
                                                    className="rounded-xl pl-8"
                                                    placeholder="09XXXXXXXXX"
                                                />
                                            </div>
                                        </Field>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-border/40 pt-4">
                                        <p className="text-xs text-muted-foreground">
                                            Changes take effect immediately.
                                        </p>
                                        <Button
                                            type="submit"
                                            disabled={profileForm.processing}
                                            className="rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700"
                                        >
                                            {profileForm.processing ? 'Saving…' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Change password */}
                        <Card className="rounded-2xl border-border/60 shadow-sm">
                            <CardHeader className="pb-4">
                                <SectionHeader
                                    icon={KeyRound}
                                    title="Change Password"
                                    description="Use a strong, unique password to keep your account safe."
                                />
                            </CardHeader>
                            <Separator />
                            <CardContent className="pt-5">


                                <form onSubmit={submitPassword} className="space-y-5">
                                    <Field
                                        label="Current Password"
                                        error={passwordForm.errors.current_password}
                                    >
                                        <PasswordInput
                                            value={passwordForm.data.current_password}
                                            onChange={(v) =>
                                                passwordForm.setData('current_password', v)
                                            }
                                            show={showCurrent}
                                            onToggle={() => setShowCurrent((v) => !v)}
                                            autoComplete="current-password"
                                        />
                                    </Field>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="New Password"
                                            error={passwordForm.errors.password}
                                        >
                                            <PasswordInput
                                                value={passwordForm.data.password}
                                                onChange={(v) =>
                                                    passwordForm.setData('password', v)
                                                }
                                                show={showNew}
                                                onToggle={() => setShowNew((v) => !v)}
                                                autoComplete="new-password"
                                            />
                                        </Field>
                                        <Field
                                            label="Confirm Password"
                                            error={passwordForm.errors.password_confirmation}
                                        >
                                            <PasswordInput
                                                value={passwordForm.data.password_confirmation}
                                                onChange={(v) =>
                                                    passwordForm.setData(
                                                        'password_confirmation',
                                                        v,
                                                    )
                                                }
                                                show={showConfirm}
                                                onToggle={() => setShowConfirm((v) => !v)}
                                                autoComplete="new-password"
                                            />
                                        </Field>
                                    </div>

                                    {/* Strength meter */}
                                    {passwordForm.data.password && (
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-muted-foreground">
                                                    Password strength
                                                </span>
                                                <span
                                                    className={cn(
                                                        'font-semibold',
                                                        pwStrength.score <= 1 && 'text-red-500',
                                                        pwStrength.score <= 3 &&
                                                            pwStrength.score > 1 &&
                                                            'text-amber-500',
                                                        pwStrength.score > 3 && 'text-blue-600',
                                                    )}
                                                >
                                                    {pwStrength.label}
                                                </span>
                                            </div>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map((step) => (
                                                    <div
                                                        key={step}
                                                        className={cn(
                                                            'h-1.5 flex-1 rounded-full transition-all',
                                                            step <= pwStrength.score
                                                                ? pwStrength.color
                                                                : 'bg-muted',
                                                        )}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between border-t border-border/40 pt-4">
                                        <p className="text-xs text-muted-foreground">
                                            Min. 8 characters with uppercase, numbers &amp;
                                            symbols.
                                        </p>
                                        <Button
                                            type="submit"
                                            disabled={passwordForm.processing}
                                            className="rounded-xl bg-blue-600 px-5 font-semibold text-white hover:bg-blue-700"
                                        >
                                            {passwordForm.processing
                                                ? 'Updating…'
                                                : 'Update Password'}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>


        </TeacherLayout>
    );
}
