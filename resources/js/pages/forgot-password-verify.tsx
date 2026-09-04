import { Head, Link, router, useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

import { route } from 'ziggy-js';
import AuthSplitShell from '@/components/auth-split-shell';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordVerify({
    maskedPhone,
    status,
    debugOtp,
}: {
    maskedPhone?: string;
    status?: string;
    debugOtp?: string | null;
}) {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        code: '',
    });
    const [resending, setResending] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('password.otp.verify'));
    };

    const handleResend = () => {
        setResending(true);
        router.post(
            route('password.otp.resend'),
            {},
            {
                onFinish: () => setResending(false),
            },
        );
    };

    return (
        <>
            <Head title="Verify code" />
            <AuthSplitShell>
                <div className="space-y-2 text-center">
                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold tracking-widest text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        IoClass
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Enter verification code
                    </h2>
                    <p className="text-xs leading-relaxed text-zinc-400">
                        If your account has a contact number on file, we sent a
                        6-digit SMS code
                        {maskedPhone ? ` to ${maskedPhone}` : ''}.
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {status && (
                        <p className="mb-4 text-center text-sm font-medium text-emerald-600">
                            {status}
                        </p>
                    )}

                    {debugOtp && (
                        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            Local/dev code: <strong>{debugOtp}</strong>
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-2">
                            <Label className="text-center text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                                Verification code
                            </Label>
                            <div className="flex justify-center">
                                <InputOTP
                                    maxLength={6}
                                    value={data.code}
                                    onChange={(value) => {
                                        setData('code', value);
                                        clearErrors('code');
                                    }}
                                >
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} className="h-11 w-11" />
                                        <InputOTPSlot index={1} className="h-11 w-11" />
                                        <InputOTPSlot index={2} className="h-11 w-11" />
                                        <InputOTPSlot index={3} className="h-11 w-11" />
                                        <InputOTPSlot index={4} className="h-11 w-11" />
                                        <InputOTPSlot index={5} className="h-11 w-11" />
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                            <InputError
                                className="text-center"
                                message={errors.code}
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={processing || data.code.length !== 6}
                            className="h-11 w-full gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
                        >
                            {processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {processing ? 'Verifying…' : 'Verify code'}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={resending}
                            onClick={handleResend}
                            className="text-xs text-zinc-500"
                        >
                            {resending ? 'Resending…' : 'Resend code'}
                        </Button>
                    </div>
                </div>

                <p className="text-center text-xs text-zinc-400">
                    <Link
                        href={route('password.request')}
                        className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                    >
                        Use a different email
                    </Link>
                </p>
            </AuthSplitShell>
        </>
    );
}
