import { Head, useForm } from '@inertiajs/react';
import { Check, Eye, EyeOff, KeyRound, Loader2, Lock, X } from 'lucide-react';
import { useState } from 'react';
import { inputErrorClass } from '@/components/form-field-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import teacher from '@/routes/teacher';

interface ChangePasswordForm {
    password: string;
    password_confirmation: string;
}

function PasswordRule({ met, label }: { met: boolean; label: string }) {
    return (
        <span className={cn('flex items-center gap-1.5 text-xs', met ? 'text-green-500' : 'text-muted-foreground')}>
            {met ? <Check className="size-3" /> : <X className="size-3" />}
            {label}
        </span>
    );
}

export default function ChangePassword() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);

    const { data, setData, post, processing, errors, clearErrors, setError } =
        useForm<ChangePasswordForm>({
            password: '',
            password_confirmation: '',
        });

    const rules = {
        minLength: data.password.length >= 8,
        hasLetter: /[a-zA-Z]/.test(data.password),
        hasNumber: /[0-9]/.test(data.password),
        matches:
            data.password.length > 0 &&
            data.password === data.password_confirmation,
    };

    const passwordValid = rules.minLength && rules.hasLetter && rules.hasNumber;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!passwordValid) {
            setError('password', 'Password must be at least 8 characters and contain both letters and numbers.');
            return;
        }

        if (!rules.matches) {
            setError('password_confirmation', 'Passwords do not match.');
            return;
        }

        post(teacher.password.update.url());
    };

    return (
        <>
            <Head title="Change Password" />
            <div className="min-h-screen bg-background text-foreground">
                <div
                    className="fixed inset-0 -z-20 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage:
                            "url('/a5b3a8b0-5b7b-4c76-a9ac-13cbc7c8ab70.jpg')",
                    }}
                />
                <div className="fixed inset-0 -z-10 bg-black/55 backdrop-blur-sm" />

                <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center overflow-hidden px-4 py-8">
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary))/12%,transparent_40%),radial-gradient(circle_at_80%_10%,hsl(var(--destructive))/8%,transparent_35%)]" />
                    <Card className="relative w-full max-w-md border-border/60 bg-background/95 shadow-xl backdrop-blur-sm">
                        <CardHeader className="space-y-4 pb-3">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                                <KeyRound className="size-8 text-primary" />
                            </div>

                            <div className="space-y-1 text-center">
                                <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">
                                    Action Required
                                </p>
                                <CardTitle className="text-xl">
                                    Set Your New Password
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    For your security, you must change your
                                    password before continuing.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <form onSubmit={handleSubmit}>
                            <CardContent className="space-y-5">
                                <div className="flex flex-col gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="password">
                                            New Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type={
                                                    showPassword
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                placeholder="Enter new password"
                                                value={data.password}
                                                onChange={(e) => {
                                                    setData(
                                                        'password',
                                                        e.target.value,
                                                    );
                                                    clearErrors('password');
                                                    setPasswordTouched(true);
                                                }}
                                                aria-invalid={Boolean(
                                                    errors.password,
                                                )}
                                                className={cn(
                                                    'h-11 border-border/70 pr-10 pl-10',
                                                    inputErrorClass(
                                                        Boolean(errors.password),
                                                    ),
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-0 right-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    setShowPassword(
                                                        (prev) => !prev,
                                                    )
                                                }
                                                aria-label={
                                                    showPassword
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="size-4" />
                                                ) : (
                                                    <Eye className="size-4" />
                                                )}
                                            </Button>
                                        </div>
                                        <InputError message={errors.password} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="password_confirmation">
                                            Confirm New Password
                                        </Label>
                                        <div className="relative">
                                            <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="password_confirmation"
                                                type={
                                                    showConfirm
                                                        ? 'text'
                                                        : 'password'
                                                }
                                                placeholder="Confirm new password"
                                                value={
                                                    data.password_confirmation
                                                }
                                                onChange={(e) => {
                                                    setData(
                                                        'password_confirmation',
                                                        e.target.value,
                                                    );
                                                    clearErrors(
                                                        'password_confirmation',
                                                    );
                                                }}
                                                aria-invalid={Boolean(
                                                    errors.password_confirmation,
                                                )}
                                                className={cn(
                                                    'h-11 border-border/70 pr-10 pl-10',
                                                    inputErrorClass(
                                                        Boolean(
                                                            errors.password_confirmation,
                                                        ),
                                                    ),
                                                )}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute top-0 right-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                                onClick={() =>
                                                    setShowConfirm(
                                                        (prev) => !prev,
                                                    )
                                                }
                                                aria-label={
                                                    showConfirm
                                                        ? 'Hide password'
                                                        : 'Show password'
                                                }
                                            >
                                                {showConfirm ? (
                                                    <EyeOff className="size-4" />
                                                ) : (
                                                    <Eye className="size-4" />
                                                )}
                                            </Button>
                                        </div>
                                        <InputError
                                            message={
                                                errors.password_confirmation
                                            }
                                        />
                                    </div>
                                </div>

                                {passwordTouched && (
                                    <div className="rounded-md border border-border/50 bg-muted/40 px-4 py-3">
                                        <p className="mb-2 text-xs font-medium text-foreground/70">
                                            Password requirements
                                        </p>
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <PasswordRule met={rules.minLength} label="At least 8 characters" />
                                            <PasswordRule met={rules.hasLetter} label="Contains a letter (a–z)" />
                                            <PasswordRule met={rules.hasNumber} label="Contains a number (0–9)" />
                                            <PasswordRule met={rules.matches} label="Passwords match" />
                                        </div>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="pt-2 pb-6">
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="h-11 w-full gap-2 rounded-md bg-primary font-medium text-primary-foreground hover:bg-primary/90"
                                >
                                    {processing && (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    )}
                                    {processing
                                        ? 'Saving...'
                                        : 'Change Password & Continue'}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </div>
        </>
    );
}
