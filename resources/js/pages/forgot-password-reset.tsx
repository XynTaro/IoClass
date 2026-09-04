import { Head, useForm } from '@inertiajs/react';
import { Eye, EyeOff, Loader2, Lock } from 'lucide-react';
import { useState } from 'react';

import { route } from 'ziggy-js';
import AuthSplitShell from '@/components/auth-split-shell';
import { inputErrorClass } from '@/components/form-field-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ForgotPasswordReset({
    maskedPhone,
}: {
    maskedPhone?: string;
}) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        password: '',
        password_confirmation: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('password.reset.update'));
    };

    return (
        <>
            <Head title="Reset password" />
            <AuthSplitShell>
                <div className="space-y-2 text-center">
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold tracking-widest text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        IoClass
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Set a new password
                    </h2>
                    <p className="text-xs leading-relaxed text-zinc-400">
                        Choose a new password
                        {maskedPhone ? ` for ${maskedPhone}` : ''}.
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="password"
                                className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
                            >
                                New password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={data.password}
                                    onChange={(e) => {
                                        setData('password', e.target.value);
                                        clearErrors('password');
                                    }}
                                    aria-invalid={Boolean(errors.password)}
                                    className={cn(
                                        'h-11 rounded-xl border-zinc-200 pr-10 pl-10 focus-visible:ring-emerald-500 dark:border-zinc-700',
                                        inputErrorClass(Boolean(errors.password)),
                                    )}
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-0 right-0 h-full px-3 text-zinc-400"
                                    onClick={() => setShowPassword((p) => !p)}
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

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="password_confirmation"
                                className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
                            >
                                Confirm password
                            </Label>
                            <div className="relative">
                                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    id="password_confirmation"
                                    type={showConfirm ? 'text' : 'password'}
                                    autoComplete="new-password"
                                    value={data.password_confirmation}
                                    onChange={(e) =>
                                        setData(
                                            'password_confirmation',
                                            e.target.value,
                                        )
                                    }
                                    className="h-11 rounded-xl border-zinc-200 pr-10 pl-10 focus-visible:ring-emerald-500 dark:border-zinc-700"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-0 right-0 h-full px-3 text-zinc-400"
                                    onClick={() => setShowConfirm((p) => !p)}
                                    aria-label={
                                        showConfirm
                                            ? 'Hide confirmation'
                                            : 'Show confirmation'
                                    }
                                >
                                    {showConfirm ? (
                                        <EyeOff className="size-4" />
                                    ) : (
                                        <Eye className="size-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-11 w-full gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
                        >
                            {processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {processing ? 'Saving…' : 'Reset password'}
                        </Button>
                    </form>
                </div>
            </AuthSplitShell>
        </>
    );
}
