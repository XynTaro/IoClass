import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    CheckCircle2,
    Cpu,
    FileSpreadsheet,
    Layers,
    LogIn,
    Radio,
    ShieldCheck,
    Sparkles,
    UserCheck,
    Users,
} from 'lucide-react';
import { useState } from 'react';
import { login } from '@/routes';
import type { SharedData } from '@/types';

type WelcomePageProps = SharedData & {
    canRegister?: boolean;
};

const FEATURES = [
    {
        icon: Radio,
        title: 'RFID Instant Tap-in',
        desc: 'Fast, hassle-free attendance recording using unique student RFID card UIDs.',
        items: [
            'Instant scan validation',
            'Duplicate scan prevention',
            'Arduino & ESP32 hardware ready',
        ],
    },
    {
        icon: FileSpreadsheet,
        title: 'Automated SF2 Reports',
        desc: 'Generate DepEd-aligned School Form 2 reports in seconds with zero manual calculation.',
        items: [
            'Daily & monthly summaries',
            'One-click PDF & Excel exports',
            'Automatic section filtering',
        ],
    },
    {
        icon: ShieldCheck,
        title: 'Role-Based Portals',
        desc: 'Customized interfaces and granular permissions for Administrators and Teachers.',
        items: [
            'Teacher & Admin logins',
            'Soft-delete archive protection',
            'Full audit log tracking',
        ],
    },
    {
        icon: Users,
        title: 'Student Masterlists',
        desc: 'Manage student profiles, section assignments, and attendance histories centrally.',
        items: [
            'Section-by-section views',
            'Guardian notification ready',
            'Promote & transfer support',
        ],
    },
    {
        icon: Layers,
        title: 'Schedules & Sections',
        desc: 'Seamlessly organize subjects, timetables, rooms, and building assignments.',
        items: [
            'Real-time class timetables',
            'Room & building allocation',
            'Subject-wise tracking',
        ],
    },
    {
        icon: UserCheck,
        title: 'Teacher Verification',
        desc: 'Empower teachers to confirm, adjust, and verify daily attendance logs.',
        items: [
            'Manual adjustment override',
            'Time-in / Time-out logs',
            'Instant status indicators',
        ],
    },
];

const STEPS = [
    {
        step: '01',
        title: 'Student Taps RFID Card',
        desc: 'Students scan their ID card at the classroom door RFID reader upon entering.',
        icon: Radio,
    },
    {
        step: '02',
        title: 'Instant Hardware Processing',
        desc: 'The microcontroller validates the UID and flashes a confirmation light.',
        icon: Cpu,
    },
    {
        step: '03',
        title: 'Real-Time Dashboard & Reports',
        desc: 'Logs immediately stream to teacher dashboards and update SF2 reports.',
        icon: BarChart3,
    },
];

export default function Welcome() {
    const { auth } = usePage<WelcomePageProps>().props;
    const [scanState, setScanState] = useState<
        'ready' | 'scanning' | 'success'
    >('ready');
    const [scannedStudent, setScannedStudent] = useState('John Doe');

    const triggerScan = () => {
        if (scanState !== 'ready') return;
        setScanState('scanning');
        setTimeout(() => {
            setScanState('success');
            const students = [
                'John Doe',
                'Maria Santos',
                'Juan Dela Cruz',
                'Sarah Gomez',
            ];
            setScannedStudent(
                students[Math.floor(Math.random() * students.length)],
            );
        }, 1000);
        setTimeout(() => {
            setScanState('ready');
        }, 3400);
    };

    const scrollToSection = (
        e: React.MouseEvent<HTMLAnchorElement>,
        id: string,
    ) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            <Head title="IoClass — Puro National High School" />

            <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 via-white to-emerald-50/30 font-sans text-neutral-900 antialiased dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 dark:text-zinc-100">
                {/* Background ambient lighting */}
                <div className="pointer-events-none fixed inset-0 overflow-hidden">
                    <div className="absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-600/10" />
                    <div className="absolute top-1/3 -left-40 h-[600px] w-[600px] rounded-full bg-teal-400/10 blur-3xl dark:bg-teal-600/10" />
                </div>

                {/* ── Navbar ── */}
                <header className="sticky top-0 z-50 border-b border-emerald-100/80 bg-white/80 backdrop-blur-md dark:border-emerald-950/50 dark:bg-zinc-950/80">
                    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        {/* School & App Branding */}
                        <div className="flex items-center gap-3">
                            <div className="relative flex items-center justify-center">
                                <div className="absolute -inset-1 rounded-full bg-emerald-500/20 blur-sm dark:bg-emerald-400/30" />
                                <img
                                    src="/puro.jpg"
                                    alt="Puro National High School Logo"
                                    className="relative h-10 w-10 rounded-full border-2 border-emerald-400 object-cover shadow-sm dark:border-emerald-500"
                                />
                            </div>
                            <div>
                                <div className="text-sm font-bold tracking-tight text-emerald-950 dark:text-emerald-100">
                                    Puro National High School
                                </div>
                                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Sparkles className="h-3 w-3" />
                                    <span>IoClass Portal</span>
                                </div>
                            </div>
                        </div>

                        {/* Navigation Links */}
                        <nav className="hidden items-center gap-8 md:flex">
                            <a
                                href="#home"
                                onClick={(e) => scrollToSection(e, 'home')}
                                className="text-sm font-medium text-neutral-600 transition-colors hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
                            >
                                Home
                            </a>
                            <a
                                href="#features"
                                onClick={(e) => scrollToSection(e, 'features')}
                                className="text-sm font-medium text-neutral-600 transition-colors hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
                            >
                                Features
                            </a>
                            <a
                                href="#how-it-works"
                                onClick={(e) =>
                                    scrollToSection(e, 'how-it-works')
                                }
                                className="text-sm font-medium text-neutral-600 transition-colors hover:text-emerald-600 dark:text-zinc-300 dark:hover:text-emerald-400"
                            >
                                How It Works
                            </a>
                        </nav>

                        {/* Auth Action CTA */}
                        <div className="flex items-center gap-3">
                            {auth?.user ? (
                                <Link
                                    href="/admin/dashboard"
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                >
                                    <span>Go to Dashboard</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            ) : (
                                <Link
                                    href={login.url()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-lg hover:shadow-emerald-600/30 focus:outline-none dark:bg-emerald-500 dark:hover:bg-emerald-600"
                                >
                                    <LogIn className="h-4 w-4" />
                                    <span>Login</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </header>

                {/* ── Hero Section ── */}
                <section
                    id="home"
                    className="relative mx-auto max-w-7xl px-4 pt-12 pb-20 sm:px-6 lg:px-8 lg:pt-20 lg:pb-28"
                >
                    <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
                        {/* Left Content */}
                        <div className="dash-fade-up lg:col-span-6">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-emerald-800 uppercase backdrop-blur-sm dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                </span>
                                IoT-Powered Attendance Monitoring
                            </div>

                            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl dark:text-white">
                                Modern Class Attendance for{' '}
                                <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
                                    Puro National High School
                                </span>
                            </h1>

                            <p className="mt-4 text-base leading-relaxed text-neutral-600 sm:text-lg dark:text-zinc-300">
                                <strong className="font-semibold text-emerald-700 dark:text-emerald-400">
                                    IoClass
                                </strong>{' '}
                                connects RFID hardware readers with real-time
                                class tracking, automated DepEd SF2 report
                                generation, and student attendance records.
                            </p>

                            {/* Stat Pill Chips */}
                            <div className="mt-8 grid grid-cols-3 gap-3">
                                <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <Radio className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">
                                            RFID
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500 dark:text-zinc-400">
                                        Tap-to-Record
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                                    <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400">
                                        <FileSpreadsheet className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">
                                            SF2 Ready
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500 dark:text-zinc-400">
                                        Auto Generated
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80">
                                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                                        <ShieldCheck className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase">
                                            Role Access
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500 dark:text-zinc-400">
                                        Teacher & Admin
                                    </div>
                                </div>
                            </div>

                            {/* Primary Buttons */}
                            <div className="mt-8 flex flex-wrap items-center gap-4">
                                <Link
                                    href={login.url()}
                                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98]"
                                >
                                    <span>Get Started →</span>
                                </Link>
                                <a
                                    href="#features"
                                    onClick={(e) =>
                                        scrollToSection(e, 'features')
                                    }
                                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-3.5 text-base font-semibold text-emerald-800 shadow-sm transition-all hover:bg-emerald-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-zinc-800"
                                >
                                    <span>Explore Features</span>
                                </a>
                            </div>
                        </div>

                        {/* Right Mockup / Hardware Live Preview Card */}
                        <div
                            className="dash-fade-up relative flex flex-col items-center justify-center lg:col-span-6"
                            style={{ animationDelay: '100ms' }}
                        >
                            <div className="relative mx-auto w-full max-w-sm">
                                {/* Glow backdrop - shifts color dynamically */}
                                <div
                                    className={`absolute -inset-2 rounded-3xl bg-gradient-to-tr opacity-25 blur-2xl transition-all duration-700 dark:opacity-40 ${
                                        scanState === 'scanning'
                                            ? 'from-amber-400 to-yellow-300'
                                            : scanState === 'success'
                                              ? 'from-emerald-400 to-green-300 shadow-[0_0_30px_rgba(16,185,129,0.3)]'
                                              : 'from-emerald-400 to-teal-300'
                                    }`}
                                />

                                {/* RFID Hardware Reader Illustration */}
                                <div
                                    onClick={triggerScan}
                                    className="group relative z-10 flex w-full cursor-pointer flex-col items-center justify-center select-none"
                                >
                                    {/* CSS Keyframes for advanced UI animations */}
                                    <style
                                        dangerouslySetInnerHTML={{
                                            __html: `
                                        @keyframes ioclass-card-tap {
                                            0%, 100% {
                                                transform: translate(16px, 16px) rotate(15deg);
                                                filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15));
                                            }
                                            45%, 55% {
                                                transform: translate(-36px, -36px) rotate(2deg) scale(0.95);
                                                filter: drop-shadow(0 0 25px rgba(52, 211, 153, 0.75));
                                            }
                                        }
                                        @keyframes ioclass-scan-beam {
                                            0% { top: 0%; opacity: 0; }
                                            10% { opacity: 1; }
                                            90% { opacity: 1; }
                                            100% { top: 100%; opacity: 0; }
                                        }
                                        @keyframes ioclass-ripple {
                                            0% { transform: scale(0.6); opacity: 0; }
                                            50% { opacity: 0.45; }
                                            100% { transform: scale(1.35); opacity: 0; }
                                        }
                                        @keyframes ioclass-screen-glow {
                                            0%, 100% { box-shadow: inset 0 0 10px rgba(52,211,153,0.15); }
                                            50% { box-shadow: inset 0 0 16px rgba(52,211,153,0.3); }
                                        }
                                    `,
                                        }}
                                    />

                                    <div
                                        className={`relative w-full overflow-hidden rounded-3xl border-2 bg-gradient-to-b from-zinc-800 via-zinc-900 to-zinc-950 p-6 shadow-2xl transition-colors duration-500 ${
                                            scanState === 'scanning'
                                                ? 'border-amber-500/50'
                                                : scanState === 'success'
                                                  ? 'border-emerald-400/50'
                                                  : 'border-zinc-700'
                                        }`}
                                    >
                                        {/* Metallic Corner Screws / Rivets */}
                                        <div className="absolute top-3 left-3 h-2 w-2 rounded-full border border-zinc-600 bg-zinc-700 shadow-inner" />
                                        <div className="absolute top-3 right-3 h-2 w-2 rounded-full border border-zinc-600 bg-zinc-700 shadow-inner" />
                                        <div className="absolute bottom-3 left-3 h-2 w-2 rounded-full border border-zinc-600 bg-zinc-700 shadow-inner" />
                                        <div className="absolute right-3 bottom-3 h-2 w-2 rounded-full border border-zinc-600 bg-zinc-700 shadow-inner" />

                                        {/* Glass reflection overlay */}
                                        <div className="pointer-events-none absolute -inset-y-1/2 left-0 w-1/2 -rotate-12 bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                                        {/* Status LED & Logo */}
                                        <div className="relative z-10 mb-5 flex items-center justify-between px-1">
                                            <div className="flex items-center gap-2">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span
                                                        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 transition-colors duration-500 ${
                                                            scanState ===
                                                            'scanning'
                                                                ? 'bg-amber-400'
                                                                : 'bg-emerald-400'
                                                        }`}
                                                    />
                                                    <span
                                                        className={`relative inline-flex h-2.5 w-2.5 rounded-full transition-all duration-500 ${
                                                            scanState ===
                                                            'scanning'
                                                                ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'
                                                                : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'
                                                        }`}
                                                    />
                                                </span>
                                                <span className="font-mono text-[10px] font-bold tracking-wider text-neutral-300 uppercase">
                                                    {scanState === 'scanning'
                                                        ? 'Processing...'
                                                        : scanState ===
                                                            'success'
                                                          ? 'Granted'
                                                          : 'Reader Active'}
                                                </span>
                                            </div>
                                            <div className="font-mono text-[10px] font-bold text-neutral-400">
                                                IoClass v2.0
                                            </div>
                                        </div>

                                        {/* Simulated LCD Screen */}
                                        <div
                                            className={`relative mb-6 overflow-hidden rounded-xl border-2 bg-black/95 p-4 text-center font-mono shadow-inner transition-colors duration-500 ${
                                                scanState === 'scanning'
                                                    ? 'border-amber-950/80 shadow-[inset_0_0_10px_rgba(245,158,11,0.1)]'
                                                    : scanState === 'success'
                                                      ? 'border-emerald-950/80 shadow-[inset_0_0_10px_rgba(16,185,129,0.15)]'
                                                      : 'border-zinc-800'
                                            }`}
                                            style={{
                                                animation:
                                                    scanState === 'ready'
                                                        ? 'ioclass-screen-glow 3s infinite'
                                                        : 'none',
                                            }}
                                        >
                                            {/* Scan beam */}
                                            <div
                                                className={`pointer-events-none absolute right-0 left-0 h-[1.5px] animate-[ioclass-scan-beam_2.5s_infinite_linear] bg-gradient-to-r from-transparent ${
                                                    scanState === 'scanning'
                                                        ? 'via-amber-400'
                                                        : 'via-emerald-400'
                                                } to-transparent`}
                                            />
                                            {/* Screen Grid lines */}
                                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[size:100%_4px]" />

                                            {scanState === 'ready' && (
                                                <>
                                                    <div className="text-[12px] font-bold tracking-widest text-emerald-400 drop-shadow-[0_0_3px_#34d399]">
                                                        ::: READY TO SCAN :::
                                                    </div>
                                                    <div className="mt-1 text-[10px] tracking-wide text-emerald-500/70 uppercase">
                                                        Place RFID Card Near
                                                        Reader
                                                    </div>
                                                </>
                                            )}

                                            {scanState === 'scanning' && (
                                                <>
                                                    <div className="animate-pulse text-[12px] font-bold tracking-widest text-amber-400 drop-shadow-[0_0_3px_#f59e0b]">
                                                        ::: SCANNING :::
                                                    </div>
                                                    <div className="mt-1 text-[10px] tracking-wide text-amber-500/70 uppercase">
                                                        Verifying UID: E200-410A
                                                    </div>
                                                </>
                                            )}

                                            {scanState === 'success' && (
                                                <>
                                                    <div className="text-[12px] font-bold tracking-widest text-emerald-400 drop-shadow-[0_0_5px_#10b981]">
                                                        ::: ACCESS GRANTED :::
                                                    </div>
                                                    <div className="mt-1 text-[10px] font-bold tracking-wide text-emerald-400">
                                                        Welcome,{' '}
                                                        {scannedStudent}!
                                                    </div>
                                                </>
                                            )}
                                        </div>

                                        {/* RFID Contactless Sensor Area */}
                                        <div
                                            className={`relative mx-auto flex h-36 w-36 items-center justify-center rounded-full border-2 bg-emerald-950/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)] transition-colors duration-500 ${
                                                scanState === 'scanning'
                                                    ? 'border-amber-500/30'
                                                    : 'border-emerald-500/30'
                                            }`}
                                        >
                                            {/* Pulse circles with custom animations */}
                                            <div
                                                className="absolute inset-2 rounded-full border-2 border-emerald-500/20"
                                                style={{
                                                    animation:
                                                        'ioclass-ripple 3s infinite linear',
                                                }}
                                            />
                                            <div
                                                className="absolute inset-6 rounded-full border border-dashed border-emerald-500/10"
                                                style={{
                                                    animation:
                                                        'ioclass-ripple 3s infinite 1.5s linear',
                                                }}
                                            />

                                            {/* Sensor Icon */}
                                            <div
                                                className={`relative flex flex-col items-center transition-colors duration-500 ${
                                                    scanState === 'scanning'
                                                        ? 'text-amber-400'
                                                        : 'text-emerald-400/80'
                                                }`}
                                            >
                                                <Radio
                                                    className={`h-10 w-10 transition-all ${
                                                        scanState === 'scanning'
                                                            ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                                            : 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                                                    }`}
                                                />
                                                <span className="mt-1.5 text-[10px] font-extrabold tracking-widest uppercase">
                                                    NFC / RFID
                                                </span>
                                            </div>

                                            {/* Card Tap Animation overlay */}
                                            <div
                                                className="absolute -right-6 -bottom-6 flex h-24 w-36 flex-col justify-between rounded-2xl border border-white/20 bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 p-3 shadow-2xl transition-all duration-500"
                                                style={
                                                    scanState === 'ready'
                                                        ? {
                                                              animation:
                                                                  'ioclass-card-tap 4s infinite ease-in-out',
                                                          }
                                                        : {
                                                              transform:
                                                                  'translate(-36px, -36px) rotate(2deg) scale(0.95)',
                                                              boxShadow:
                                                                  scanState ===
                                                                  'scanning'
                                                                      ? '0 0 25px rgba(245, 158, 11, 0.6)'
                                                                      : '0 0 35px rgba(16, 185, 129, 0.85)',
                                                          }
                                                }
                                            >
                                                {/* Card Header */}
                                                <div className="flex items-start justify-between border-b border-white/25 pb-1">
                                                    <div>
                                                        <div className="text-[9px] leading-none font-bold tracking-wider text-white uppercase">
                                                            Puro NHS
                                                        </div>
                                                        <div className="mt-0.5 text-[7px] leading-none font-semibold text-emerald-100">
                                                            Student ID
                                                        </div>
                                                    </div>
                                                    <div className="flex h-5 w-7 items-center justify-center rounded-md border border-amber-300/40 bg-amber-400/90 p-0.5">
                                                        <div className="grid h-full w-full grid-cols-3 gap-0.5">
                                                            <div className="rounded-xs bg-amber-950/20" />
                                                            <div className="rounded-xs bg-amber-950/20" />
                                                            <div className="rounded-xs bg-amber-950/20" />
                                                            <div className="rounded-xs bg-amber-950/20" />
                                                            <div className="rounded-xs bg-amber-950/20" />
                                                            <div className="rounded-xs bg-amber-950/20" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Body */}
                                                <div className="my-1 flex items-center gap-2">
                                                    {/* Avatar Silhouette */}
                                                    <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-white/20">
                                                        <div className="mt-1 h-5 w-5 rounded-full bg-white/40" />
                                                    </div>
                                                    <div>
                                                        <div className="text-[8px] leading-none font-extrabold text-white">
                                                            {scanState ===
                                                            'success'
                                                                ? scannedStudent
                                                                : 'John Doe'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Card Footer */}
                                                <div className="flex items-center justify-between border-t border-white/10 pt-1.5 font-mono text-[6px] text-emerald-200/80">
                                                    <span>UID: E200-410A</span>
                                                    <Cpu className="h-4 w-4 text-white/80" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Floating helper instruction button */}
                                <div className="mt-4 flex justify-center">
                                    <button
                                        onClick={triggerScan}
                                        className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition-all hover:scale-[1.03] hover:bg-emerald-500/20 active:scale-[0.97] dark:border-emerald-400/10 dark:bg-emerald-400/10 dark:text-emerald-300"
                                    >
                                        <Sparkles className="h-3.5 w-3.5 animate-pulse text-emerald-500" />
                                        <span>
                                            Click reader to tap student card
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Features Grid ── */}
                <section
                    id="features"
                    className="bg-white/70 py-20 dark:bg-zinc-900/50"
                >
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="dash-fade-up text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold tracking-wider text-emerald-800 uppercase dark:bg-emerald-950 dark:text-emerald-300">
                                Key Capabilities
                            </span>
                            <h2 className="mt-4 text-3xl font-extrabold text-emerald-950 sm:text-4xl dark:text-white">
                                Everything needed for seamless attendance
                            </h2>
                            <p className="mx-auto mt-3 max-w-2xl text-base text-neutral-600 dark:text-zinc-300">
                                Designed specifically for teachers and
                                administrators at Puro National High School.
                            </p>
                        </div>

                        <div
                            className="dash-fade-up mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
                            style={{ animationDelay: '100ms' }}
                        >
                            {FEATURES.map((feature) => {
                                const IconComponent = feature.icon;
                                return (
                                    <div
                                        key={feature.title}
                                        className="group relative overflow-hidden rounded-3xl border border-emerald-100/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-400/80 hover:shadow-xl hover:shadow-emerald-500/5 dark:border-zinc-800 dark:bg-zinc-900/90 dark:hover:border-emerald-600/80"
                                    >
                                        {/* Subtle background glow card accent */}
                                        <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-emerald-400/5 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:bg-emerald-400/10 dark:bg-emerald-500/5 dark:group-hover:bg-emerald-500/10" />

                                        <div className="relative z-10">
                                            {/* Icon box */}
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-600 transition-all duration-300 group-hover:from-emerald-600 group-hover:to-teal-600 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-600/20 dark:from-emerald-950/40 dark:to-teal-950/40 dark:text-emerald-400">
                                                <IconComponent className="h-6 w-6 transition-transform duration-500 group-hover:scale-110" />
                                            </div>

                                            <h3 className="mt-5 text-lg font-bold text-neutral-900 transition-colors duration-300 group-hover:text-emerald-950 dark:text-zinc-100 dark:group-hover:text-white">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-2 text-sm leading-relaxed text-neutral-500 transition-colors duration-300 group-hover:text-neutral-600 dark:text-zinc-400 dark:group-hover:text-zinc-300">
                                                {feature.desc}
                                            </p>

                                            <ul className="mt-5 space-y-2.5 border-t border-neutral-100 pt-4 dark:border-zinc-800">
                                                {feature.items.map((item) => (
                                                    <li
                                                        key={item}
                                                        className="flex items-center gap-2 text-xs font-semibold text-neutral-600 transition-colors duration-300 group-hover:text-neutral-700 dark:text-zinc-300 dark:group-hover:text-zinc-200"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 transition-transform duration-300 group-hover:scale-110" />
                                                        <span>{item}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── How It Works Section ── */}
                <section id="how-it-works" className="py-20">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="dash-fade-up text-center">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 px-3.5 py-1 text-xs font-bold tracking-wider text-teal-800 uppercase dark:bg-teal-950 dark:text-teal-300">
                                Simple Process
                            </span>
                            <h2 className="mt-4 text-3xl font-extrabold text-emerald-950 sm:text-4xl dark:text-white">
                                How IoClass Works in the Classroom
                            </h2>
                            <p className="mx-auto mt-3 max-w-xl text-base text-neutral-600 dark:text-zinc-300">
                                From RFID card tap to automated reports in three
                                easy steps.
                            </p>
                        </div>

                        <div
                            className="dash-fade-up mt-14 grid gap-8 md:grid-cols-3"
                            style={{ animationDelay: '100ms' }}
                        >
                            {STEPS.map((step) => {
                                const StepIcon = step.icon;
                                return (
                                    <div
                                        key={step.step}
                                        className="group relative overflow-hidden rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 dark:border-zinc-800 dark:bg-zinc-900"
                                    >
                                        {/* Subtle step glow */}
                                        <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-teal-400/5 blur-3xl transition-all duration-500 group-hover:scale-150 group-hover:bg-teal-400/10 dark:bg-teal-500/5 dark:group-hover:bg-teal-500/10" />

                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 transition-transform duration-500 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-emerald-600/30">
                                                <StepIcon className="h-7 w-7" />
                                            </div>
                                            <div className="mt-4 text-xs font-extrabold tracking-widest text-emerald-600 uppercase dark:text-emerald-400">
                                                Step {step.step}
                                            </div>
                                            <h3 className="mt-2 text-lg font-bold text-neutral-900 dark:text-zinc-100">
                                                {step.title}
                                            </h3>
                                            <p className="mt-2 text-sm text-neutral-500 dark:text-zinc-400">
                                                {step.desc}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* ── CTA Banner ── */}
                <section className="relative overflow-hidden bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 py-16 text-white dark:from-zinc-950 dark:via-emerald-950 dark:to-zinc-950">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
                    <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
                        <img
                            src="/puro.jpg"
                            alt="Logo"
                            className="mx-auto h-16 w-16 rounded-full border-2 border-white/40 object-cover shadow-xl"
                        />
                        <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
                            Ready to manage attendance efficiently?
                        </h2>
                        <p className="mt-3 text-base text-emerald-100/90 sm:text-lg">
                            Log in with your Puro National High School account
                            credentials to access your portal.
                        </p>
                        <div className="mt-8 flex justify-center">
                            <Link
                                href={login.url()}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-emerald-900 shadow-xl transition-all hover:scale-105 hover:bg-emerald-50 active:scale-95"
                            >
                                <span>Access Portal Now</span>
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ── Footer ── */}
                <footer className="border-t border-emerald-950/30 bg-emerald-950 py-12 text-neutral-400 dark:border-zinc-800/80 dark:bg-zinc-950">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        {/* Upper Multi-Column Grid */}
                        <div className="mb-8 grid grid-cols-1 gap-8 border-b border-emerald-900/30 pb-8 sm:grid-cols-2 md:grid-cols-4">
                            {/* Branding Info */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src="/puro.jpg"
                                        alt="Logo"
                                        className="h-8 w-8 rounded-full border border-emerald-700 object-cover"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-white">
                                            IoClass
                                        </div>
                                        <div className="text-[10px] text-emerald-400">
                                            Puro National High School
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-2 text-xs leading-relaxed text-neutral-400">
                                    IoT-powered smart attendance recording and
                                    administrative dashboard for modern
                                    classrooms.
                                </p>
                            </div>

                            {/* Quick Navigation links */}
                            <div>
                                <h4 className="mb-4 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                                    Navigation
                                </h4>
                                <ul className="space-y-2 text-xs">
                                    <li>
                                        <a
                                            href="#home"
                                            onClick={(e) =>
                                                scrollToSection(e, 'home')
                                            }
                                            className="transition-colors hover:text-white"
                                        >
                                            Home
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#features"
                                            onClick={(e) =>
                                                scrollToSection(e, 'features')
                                            }
                                            className="transition-colors hover:text-white"
                                        >
                                            Features
                                        </a>
                                    </li>
                                    <li>
                                        <a
                                            href="#how-it-works"
                                            onClick={(e) =>
                                                scrollToSection(
                                                    e,
                                                    'how-it-works',
                                                )
                                            }
                                            className="transition-colors hover:text-white"
                                        >
                                            How It Works
                                        </a>
                                    </li>
                                    <li>
                                        <Link
                                            href={login.url()}
                                            className="transition-colors hover:text-white"
                                        >
                                            Teacher & Admin Login
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Contact Details */}
                            <div>
                                <h4 className="mb-4 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                                    Puro NHS Details
                                </h4>
                                <p className="text-xs leading-relaxed text-neutral-400">
                                    Puro, Magsingal, Ilocos Sur
                                    <br />
                                    Ilocos Region, Philippines
                                </p>
                                <p className="mt-2 text-xs text-neutral-400">
                                    Support:{' '}
                                    <a
                                        href="mailto:info@puronhs.edu.ph"
                                        className="underline transition-colors hover:text-white"
                                    >
                                        info@puronhs.edu.ph
                                    </a>
                                </p>
                            </div>

                            {/* System Status Indicators */}
                            <div>
                                <h4 className="mb-4 text-xs font-bold tracking-wider text-emerald-400 uppercase">
                                    Platform Info
                                </h4>
                                <div className="space-y-3">
                                    {/* System Status online marker */}
                                    <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                        </span>
                                        <span>System Operational</span>
                                    </div>
                                    <div className="flex flex-col gap-1 text-[10px] text-neutral-400">
                                        <div className="font-semibold">
                                            DepEd SF2 Format Ready
                                        </div>
                                        <div>
                                            Official School Form 2 Compliance
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom Copyright Bar */}
                        <div className="flex flex-col items-center justify-between gap-4 text-xs text-neutral-400 sm:flex-row">
                            <div>
                                © {new Date().getFullYear()} IoClass · Puro
                                National High School. All rights reserved.
                            </div>
                            <div className="text-[10px] text-neutral-500">
                                Designed with ♥ for modern education
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
