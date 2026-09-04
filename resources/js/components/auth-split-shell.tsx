import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { home } from '@/routes';

export default function AuthSplitShell({
    children,
}: {
    children: ReactNode;
}) {
    return (
        <div className="flex min-h-screen">
            <div
                className="relative hidden w-1/2 flex-col justify-between overflow-hidden lg:flex"
                style={{
                    background:
                        'linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 100%)',
                }}
            >
                <div
                    className="absolute inset-0 opacity-10"
                    style={{
                        backgroundImage:
                            'radial-gradient(circle, white 1.5px, transparent 1.5px)',
                        backgroundSize: '24px 24px',
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            'linear-gradient(120deg, transparent 40%, rgba(255,255,255,0.04) 100%)',
                    }}
                />
                <div
                    className="absolute right-0 bottom-0 left-0 h-64 opacity-30"
                    style={{
                        background:
                            'radial-gradient(ellipse at 50% 120%, #34d399 0%, transparent 70%)',
                    }}
                />

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

                <div className="relative space-y-8 px-10">
                    <div className="relative w-fit">
                        <div className="absolute -inset-1.5 rounded-full bg-emerald-300/30 blur-sm" />
                        <img
                            src="/puro.jpg"
                            alt="Puro National High School logo"
                            className="relative h-20 w-20 rounded-full border-2 border-emerald-300/40 object-cover shadow-xl"
                        />
                    </div>

                    <div className="space-y-3">
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

                <div className="relative border-t border-white/10 px-10 py-8">
                    <p className="text-sm leading-relaxed text-white/60 italic">
                        "Efficient attendance tracking leads to better student
                        outcomes and stronger school accountability."
                    </p>
                    <p className="mt-2 text-xs font-medium text-white/30">
                        — Puro NHS Administration
                    </p>
                </div>
            </div>

            <div className="flex w-full flex-col bg-zinc-50 lg:w-1/2 dark:bg-zinc-950">
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

                <div className="flex flex-1 items-center justify-center px-6 py-12">
                    <div className="w-full max-w-sm space-y-8">{children}</div>
                </div>
            </div>
        </div>
    );
}
