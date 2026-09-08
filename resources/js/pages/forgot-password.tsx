import { Head, Link, useForm } from '@inertiajs/react';
import { Loader2, Mail } from 'lucide-react';

import { route } from 'ziggy-js';
import AuthSplitShell from '@/components/auth-split-shell';
import { inputErrorClass } from '@/components/form-field-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        email: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('password.otp.send'));
    };

    return (
        <>
            <Head title="Forgot password" />
            <AuthSplitShell>
                <div className="space-y-2 text-center">
                    <div className="mb-5 flex justify-center">
                        <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-emerald-400/20 blur" />
                            <img
                                src="/puro.jpg"
                                alt="logo"
                                className="relative h-14 w-14 rounded-full object-cover shadow-lg ring-2 ring-emerald-500/40"
                            />
                        </div>
                    </div>

                    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-0.5 text-[11px] font-bold tracking-widest text-emerald-700 uppercase dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        IoClass
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        Forgot password
                    </h2>
                    <p className="text-xs leading-relaxed text-zinc-400">
                        Enter the email you use to sign in. We’ll look up your
                        contact number and send a one-time code by SMS.
                    </p>
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    {status && (
                        <p className="mb-4 text-center text-sm font-medium text-emerald-600">
                            {status}
                        </p>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="email"
                                className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
                            >
                                Email address
                            </Label>
                            <div className="relative">
                                <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="email"
                                    placeholder="name@school.edu"
                                    value={data.email}
                                    onChange={(e) => {
                                        setData('email', e.target.value);
                                        clearErrors('email');
                                    }}
                                    aria-invalid={Boolean(errors.email)}
                                    className={cn(
                                        'h-11 rounded-xl border-zinc-200 pl-10 focus-visible:ring-emerald-500 dark:border-zinc-700',
                                        inputErrorClass(Boolean(errors.email)),
                                    )}
                                />
                            </div>
                            <InputError message={errors.email} />
                        </div>

                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-11 w-full gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.99]"
                        >
                            {processing && (
                                <Loader2 className="size-4 animate-spin" />
                            )}
                            {processing ? 'Sending…' : 'Send verification code'}
                        </Button>
                    </form>
                </div>

                <p className="text-center text-xs text-zinc-400">
                    Remembered it?{' '}
                    <Link
                        href={route('login')}
                        className="font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                    >
                        Back to sign in
                    </Link>
                </p>
            </AuthSplitShell>
        </>
    );
}
