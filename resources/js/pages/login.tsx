import { Form, Head, Link } from '@inertiajs/react';
import { AlertCircle, Clock, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useState } from 'react';

import { inputErrorClass } from '@/components/form-field-error';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { home } from '@/routes';
import { submit } from '@/routes/login';
import { request as requestPassword } from '@/routes/password';

export default function Login({ status }: { status?: string }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Login" />
            <div className="flex min-h-screen">
                {/* ── Left panel — branding ── */}
                <div
                    className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex"
                    style={{
                        background:
                            'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
                    }}
                >
                    {/* Dot-grid texture */}
                    <div
                        className="absolute inset-0 opacity-10"
                        style={{
                            backgroundImage:
                                'radial-gradient(circle, white 1.5px, transparent 1.5px)',
                            backgroundSize: '24px 24px',
                        }}
                    />
                    {/* Diagonal light sweep */}
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.04) 100%)',
                        }}
                    />
                    {/* Bottom soft glow */}
                    <div
                        className="absolute right-0 bottom-0 left-0 h-64 opacity-30"
                        style={{
                            background:
                                'radial-gradient(ellipse at 50% 120%, #34d399 0%, transparent 70%)',
                        }}
                    />

                    {/* Top — back link */}
                    <div className="relative p-10">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-emerald-200/80 hover:bg-white/10 hover:text-white"
                            asChild
                        >
                            <Link href={home.url()}>← Home</Link>
                        </Button>
                    </div>

                    {/* Center — school identity */}
                    <div className="dash-fade-up relative space-y-8 px-10">
                        {/* Logo with glow ring */}
                        <div className="relative w-fit">
                            <div className="absolute -inset-1.5 rounded-full bg-emerald-300/30 blur-sm" />
                            <img
                                src="/puro.jpg"
                                alt="Puro National High School logo"
                                className="relative h-20 w-20 rounded-full border-2 border-emerald-300/40 object-cover shadow-xl"
                            />
                        </div>

                        <div className="space-y-3">
                            {/* IoClass badge */}
                            <span className="inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-bold tracking-widest text-emerald-300 uppercase">
                                IoClass
                            </span>

                            <h1 className="text-3xl leading-snug font-bold text-white">
                                An IoT-Based Class
                                <br />
                                Attendance Monitoring
                                <br />
                                System
                            </h1>
                            <p className="text-sm text-emerald-200/70">
                                for Puro National High School
                            </p>
                        </div>
                    </div>

                    {/* Bottom — quote */}
                    <div
                        className="dash-fade-up relative border-t border-white/10 px-10 py-8"
                        style={{ animationDelay: '100ms' }}
                    >
                        <p className="text-sm leading-relaxed text-white/60 italic">
                            "Efficient attendance tracking leads to better
                            student outcomes and stronger school
                            accountability."
                        </p>
                        <p className="mt-2 text-xs font-medium text-white/30">
                            — Puro NHS Administration
                        </p>
                    </div>
                </div>

                {/* ── Right panel — form ── */}
                <div className="flex w-full flex-col bg-zinc-50 lg:w-1/2 dark:bg-zinc-950">
                    {/* Mobile top bar */}
                    <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4 lg:hidden dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="flex items-center gap-2.5">
                            <img
                                src="/puro.jpg"
                                alt="logo"
                                className="h-8 w-8 rounded-full object-cover ring-2 ring-emerald-500/30"
                            />
                            <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                IoClass
                            </span>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                            <Link href={home.url()}>← Home</Link>
                        </Button>
                    </div>

                    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-12">
                        {/* Ambient background glow */}
                        <div className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/5 blur-3xl dark:bg-emerald-500/10" />

                        <div
                            className="dash-fade-up relative w-full max-w-sm space-y-8"
                            style={{ animationDelay: '50ms' }}
                        >
                            {/* Heading */}
                            <div className="space-y-2 text-center">
                                {/* Logo */}
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
                                    Welcome Back
                                </h2>
                                <p className="text-xs leading-relaxed text-zinc-400">
                                    An IoT-Based Class Attendance Monitoring
                                    System
                                    <br />
                                    for Puro National High School
                                </p>
                            </div>

                            {/* Form card */}
                            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-zinc-300/80 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700/80">
                                {status && (
                                    status.toLowerCase().includes('inactivity') ? (
                                        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-left dark:border-amber-900/50 dark:bg-amber-950/30">
                                            <div className="flex items-center gap-2.5">
                                                <Clock className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                                                <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                                                    {status}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="mb-4 text-center text-sm font-medium text-emerald-600">
                                            {status}
                                        </p>
                                    )
                                )}

                                <Form action="/login" method="post" className="space-y-5">
                                    {({ processing, errors, clearErrors }) => (
                                        <>
                                            {errors.email && (errors.email.includes('records') || errors.email.includes('Invalid email')) && (
                                                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                                                    <div className="flex gap-2.5">
                                                        <AlertCircle className="size-5 shrink-0 text-red-600 dark:text-red-400" />
                                                        <div>
                                                            <h3 className="text-sm font-semibold text-red-800 dark:text-red-300">
                                                                Invalid Credentials
                                                            </h3>
                                                            <p className="mt-1 text-xs text-red-700 dark:text-red-400">
                                                                {errors.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="space-y-4">
                                                {/* Email */}
                                                <div className="grid gap-1.5">
                                                    <Label
                                                        htmlFor="email"
                                                        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
                                                    >
                                                        Email Address
                                                    </Label>
                                                    <div className="relative">
                                                        <Mail className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                                                        <Input
                                                            id="email"
                                                            name="email"
                                                            type="email"
                                                            placeholder="name@school.edu"
                                                            aria-invalid={Boolean(
                                                                errors.email,
                                                            )}
                                                            onChange={() => clearErrors('email')}
                                                            className={cn(
                                                                'h-11 rounded-xl border-zinc-200 pl-10 focus-visible:ring-emerald-500 dark:border-zinc-700',
                                                                inputErrorClass(
                                                                    Boolean(
                                                                        errors.email &&
                                                                        !errors.email.includes('records') &&
                                                                        !errors.email.includes('Invalid email')
                                                                    ),
                                                                ),
                                                            )}
                                                        />
                                                    </div>
                                                    <InputError
                                                        message={
                                                            errors.email &&
                                                                !errors.email.includes('records') &&
                                                                !errors.email.includes('Invalid email')
                                                                ? errors.email
                                                                : undefined
                                                        }
                                                    />
                                                </div>

                                                {/* Password */}
                                                <div className="grid gap-1.5">
                                                    <Label
                                                        htmlFor="password"
                                                        className="text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
                                                    >
                                                        Password
                                                    </Label>
                                                    <div className="relative">
                                                        <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                                                        <Input
                                                            id="password"
                                                            name="password"
                                                            type={
                                                                showPassword
                                                                    ? 'text'
                                                                    : 'password'
                                                            }
                                                            placeholder="Enter your password"
                                                            aria-invalid={Boolean(
                                                                errors.password,
                                                            )}
                                                            onChange={() => {
                                                                clearErrors('password');
                                                                if (errors.email && (errors.email.includes('records') || errors.email.includes('Invalid email'))) {
                                                                    clearErrors('email');
                                                                }
                                                            }}
                                                            className={cn(
                                                                'h-11 rounded-xl border-zinc-200 pr-10 pl-10 focus-visible:ring-emerald-500 dark:border-zinc-700',
                                                                inputErrorClass(
                                                                    Boolean(
                                                                        errors.password,
                                                                    ),
                                                                ),
                                                            )}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="absolute top-0 right-0 h-full px-3 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                                                            onClick={() =>
                                                                setShowPassword(
                                                                    (p) => !p,
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
                                                    <InputError
                                                        message={
                                                            errors.password
                                                        }
                                                    />
                                                    <div className="flex justify-end">
                                                        <Link
                                                            href={requestPassword.url()}
                                                            className="text-xs font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                                                        >
                                                            Forgot password?
                                                        </Link>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Submit */}
                                            <Button
                                                type="submit"
                                                disabled={processing}
                                                className="h-11 w-full gap-2 rounded-xl bg-emerald-600 font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md hover:shadow-emerald-950/10 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.98]"
                                            >
                                                {processing && (
                                                    <Loader2 className="size-4 animate-spin" />
                                                )}
                                                {processing
                                                    ? 'Signing in…'
                                                    : 'Sign In'}
                                            </Button>
                                        </>
                                    )}
                                </Form>
                            </div>

                            <p className="text-center text-xs text-zinc-400">
                                Use your assigned admin or teacher credentials.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
