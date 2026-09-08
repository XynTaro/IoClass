import { Head, Link, router, usePage } from '@inertiajs/react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import TeacherLayout from '@/layouts/teacher/teacher-layout';
import teacher from '@/routes/teacher';
import teacherSchedule from '@/routes/teacher/schedule/index';
import sf2Reports from '@/routes/teacher/sf2-reports';
import studentRecords from '@/routes/teacher/student-records';
import type { BreadcrumbItem, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: teacher.dashboard.url(),
    },
];
import {
    ArrowRight,
    BookOpen,
    CalendarDays,
    GraduationCap,
    TrendingUp,
    UserCheck,
} from 'lucide-react';

/** Fixed row height so trend bars align on a common baseline above labels */
const TREND_CHART_HEIGHT_PX = 168;
/** Headroom inside the chart area reserved for the per-bar total / tooltip */
const TREND_BAR_LABEL_SPACE_PX = 28;
/** Minimum visible candle height (empty stub or tiny totals) */
const TREND_MIN_BAR_PX = 6;

function parseLocalDate(dateStr: string): Date {
    const parts = dateStr.split('-').map(Number);
    if (parts.length >= 3 && parts.every((n) => Number.isFinite(n))) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date(dateStr);
}

interface DashboardStats {
    studentsCount?: number | null;
    subjectsCount?: number | null;
}

type AtRiskStudent = {
    stu_id: number;
    name: string;
    section: string;
    absent_count: number;
    attendance_rate: number;
};

type SectionAttendance = {
    sect_id: number;
    name: string;
    attendance_rate: number;
    total_records: number;
};

type DashboardAnalytics = {
    range?: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    statusTotals?: { present: number; late: number; absent: number } | null;
    statusTrend?: Array<{
        date: string;
        present: number;
        late: number;
        absent: number;
    }> | null;
    atRiskStudents?: AtRiskStudent[] | null;
    sectionAttendance?: SectionAttendance[] | null;
};

type DashboardPageProps = SharedData & {
    stats?: DashboardStats;
    analytics?: DashboardAnalytics;
};

const statCards = [
    {
        title: 'My Students',
        icon: GraduationCap,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
        ring: 'ring-emerald-500/20',
        accent: 'bg-emerald-500',
        wash: 'bg-emerald-500/[0.04] dark:bg-emerald-500/[0.06]',
        valueStyle: 'text-emerald-600 dark:text-emerald-400',
        hoverRing: 'hover:border-emerald-500/30 hover:shadow-emerald-500/10',
        statKey: 'studentsCount' as const,
        footnote: 'Total in system',
        href: () => teacher.students.index.url(),
    },
    {
        title: 'My Subjects',
        icon: BookOpen,
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-500/10 dark:bg-blue-500/15',
        ring: 'ring-blue-500/20',
        accent: 'bg-blue-500',
        wash: 'bg-blue-500/[0.04] dark:bg-blue-500/[0.06]',
        valueStyle: 'text-blue-600 dark:text-blue-400',
        hoverRing: 'hover:border-blue-500/30 hover:shadow-blue-500/10',
        statKey: 'subjectsCount' as const,
        footnote: 'Active subjects',
        href: () => teacherSchedule.index.url(),
    },
];

const quickActions = [
    {
        label: 'Take Attendance',
        description: 'Record today’s sessions',
        icon: UserCheck,
        href: () => teacher.attendance.index.url(),
        iconStyle:
            'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400',
        hoverBorder: 'hover:border-emerald-500/30',
    },
    {
        label: 'My Schedule',
        description: 'See your class timetable',
        icon: CalendarDays,
        href: () => teacherSchedule.index.url(),
        iconStyle:
            'bg-blue-500/10 text-blue-600 ring-blue-500/20 dark:bg-blue-500/15 dark:text-blue-400',
        hoverBorder: 'hover:border-blue-500/30',
    },
    {
        label: 'My Students',
        description: 'Browse your class lists',
        icon: GraduationCap,
        href: () => teacher.students.index.url(),
        iconStyle:
            'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:bg-violet-500/15 dark:text-violet-400',
        hoverBorder: 'hover:border-violet-500/30',
    },
    {
        label: 'SF2 Reports',
        description: 'Generate monthly reports',
        icon: BookOpen,
        href: () => sf2Reports.index.url(),
        iconStyle:
            'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:bg-amber-500/15 dark:text-amber-400',
        hoverBorder: 'hover:border-amber-500/30',
    },
];

const RANGE_OPTIONS = [
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
] as const;

const STATUS_STYLES = {
    present: {
        label: 'Present',
        bar: 'bg-emerald-500',
        soft: 'bg-emerald-500/15',
        dot: 'bg-emerald-500',
        text: 'text-emerald-600 dark:text-emerald-400',
    },
    late: {
        label: 'Late',
        bar: 'bg-amber-500',
        soft: 'bg-amber-500/15',
        dot: 'bg-amber-500',
        text: 'text-amber-600 dark:text-amber-400',
    },
    absent: {
        label: 'Absent',
        bar: 'bg-red-500',
        soft: 'bg-red-500/15',
        dot: 'bg-red-500',
        text: 'text-red-600 dark:text-red-400',
    },
} as const;

function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Good morning';
    }
    if (hour < 18) {
        return 'Good afternoon';
    }
    return 'Good evening';
}

function formatStat(value: number | null | undefined): string {
    if (value == null) {
        return '—';
    }
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1)}k`;
    }
    return String(value);
}

const chartConfig = {
    present: {
        label: 'Present',
        color: '#10b981', // emerald-500
    },
    late: {
        label: 'Late',
        color: '#f59e0b', // amber-500
    },
    absent: {
        label: 'Absent',
        color: '#ef4444', // red-500
    },
} satisfies ChartConfig;

export default function TeacherDashboard() {
    const {
        auth,
        stats: statsProp,
        analytics: analyticsProp,
    } = usePage<DashboardPageProps>().props;
    const stats: DashboardStats = statsProp ?? {};
    const analytics: DashboardAnalytics = analyticsProp ?? {};
    const atRiskStudents = analytics.atRiskStudents ?? [];
    const sectionAttendance = analytics.sectionAttendance ?? [];
    const displayName = auth.user?.name?.trim() || 'Teacher';

    const range = analytics.range ?? 'weekly';
    const totals = analytics.statusTotals ?? {
        present: 0,
        late: 0,
        absent: 0,
    };
    const trend = analytics.statusTrend ?? [];
    const totalAll =
        (totals.present ?? 0) + (totals.late ?? 0) + (totals.absent ?? 0);
    const maxTrend = Math.max(
        1,
        ...trend.map((d) => (d.present ?? 0) + (d.late ?? 0) + (d.absent ?? 0)),
    );
    const attendanceRate =
        totalAll > 0
            ? Math.round((100 * (totals.present ?? 0)) / totalAll)
            : null;

    const todayLabel = new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const formatTrendLabel = (dateStr: string) => {
        const d = parseLocalDate(dateStr);
        if (Number.isNaN(d.getTime())) {
            return dateStr;
        }
        if (range === 'daily') {
            return d.toLocaleDateString(undefined, { weekday: 'short' });
        }
        if (range === 'weekly') {
            return d.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
            });
        }
        if (range === 'monthly') {
            return d.toLocaleDateString(undefined, { month: 'short' });
        }
        return d.toLocaleDateString(undefined, { year: '2-digit' });
    };

    const trendHasData = trend.some(
        (d) => (d.present ?? 0) + (d.late ?? 0) + (d.absent ?? 0) > 0,
    );
    const peakTrend = Math.max(
        0,
        ...trend.map((d) => (d.present ?? 0) + (d.late ?? 0) + (d.absent ?? 0)),
    );

    function setRange(next: NonNullable<DashboardAnalytics['range']>) {
        router.get(
            teacher.dashboard.url({ query: { range: next } }),
            {},
            { preserveScroll: true, preserveState: true, replace: true },
        );
    }

    return (
        <TeacherLayout breadcrumbs={breadcrumbs}>
            <Head title="Teacher Dashboard" />

            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* Welcome banner */}
                <div
                    className="dash-fade-up relative overflow-hidden rounded-xl border bg-linear-to-r from-blue-500/[0.08] via-indigo-500/[0.05] to-transparent p-5 dark:from-blue-500/[0.12] dark:via-indigo-500/[0.07]"
                    style={{ animationDelay: '0ms' }}
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-blue-500" />
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {getGreeting()}, {displayName}
                            </h1>
                            <p className="max-w-lg text-sm text-muted-foreground md:text-base">
                                Here’s a quick overview of your classes and key
                                numbers.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-blue-500/15 bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                            <CalendarDays
                                className="size-4 shrink-0 text-blue-600 dark:text-blue-400"
                                aria-hidden
                            />
                            <span>{todayLabel}</span>
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                                Today
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {statCards.map((item, index) => {
                        const statValue = stats[item.statKey];
                        const displayValue = formatStat(statValue ?? null);
                        const Icon = item.icon;

                        const cardContent = (
                            <div className="flex flex-1 flex-col justify-between p-4">
                                <div
                                    className={`absolute inset-x-0 top-0 h-1 rounded-t-xl ${item.accent}`}
                                />
                                <div>
                                    <div className="flex flex-row items-center justify-between space-y-0">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {item.title}
                                        </span>
                                        <div
                                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 transition-transform duration-300 group-hover:scale-110 ${item.bg} ${item.color} ${item.ring}`}
                                        >
                                            <Icon className="size-4" aria-hidden />
                                        </div>
                                    </div>
                                    <div
                                        className={`mt-1 text-2xl font-bold tracking-tight tabular-nums md:text-3xl ${item.valueStyle}`}
                                    >
                                        {displayValue}
                                    </div>
                                </div>
                                <p className="mt-2 text-[11px] text-muted-foreground">
                                    {item.footnote}
                                </p>
                            </div>
                        );

                        const cardClass = `group relative flex flex-col justify-between h-full overflow-hidden rounded-xl border-border/60 py-0 gap-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${item.wash} ${item.hoverRing}`;

                        if (item.href) {
                            return (
                                <Link
                                    key={item.title}
                                    href={item.href()}
                                    className="dash-fade-up block"
                                    style={{
                                        animationDelay: `${80 + index * 70}ms`,
                                    }}
                                >
                                    <Card className={cardClass}>
                                        {cardContent}
                                    </Card>
                                </Link>
                            );
                        }

                        return (
                            <div
                                key={item.title}
                                className="dash-fade-up"
                                style={{
                                    animationDelay: `${80 + index * 70}ms`,
                                }}
                            >
                                <Card className={cardClass}>{cardContent}</Card>
                            </div>
                        );
                    })}

                    <Link
                        href={teacher.attendance.index.url()}
                        className="dash-fade-up block"
                        style={{ animationDelay: '220ms' }}
                    >
                        <Card className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border-border/60 py-0 gap-0 bg-violet-500/[0.04] shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-violet-500/30 hover:shadow-md hover:shadow-violet-500/10 dark:bg-violet-500/[0.06]">
                            <div className="absolute inset-x-0 top-0 h-1 rounded-t-xl bg-violet-500" />
                            <div className="flex flex-1 flex-col justify-between p-4">
                                <div>
                                    <div className="flex flex-row items-center justify-between space-y-0">
                                        <span className="text-xs font-medium text-muted-foreground">
                                            Attendance Rate
                                        </span>
                                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 ring-1 ring-violet-500/20 transition-transform duration-300 group-hover:scale-110 dark:bg-violet-500/15 dark:text-violet-400">
                                            <TrendingUp
                                                className="size-4"
                                                aria-hidden
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-1 text-2xl font-bold tracking-tight text-violet-600 tabular-nums md:text-3xl dark:text-violet-400">
                                        {attendanceRate == null
                                            ? '—'
                                            : `${attendanceRate}%`}
                                    </div>
                                </div>
                                <div>
                                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div
                                            className="dash-width-grow h-full rounded-full bg-violet-500"
                                            style={{
                                                width: `${attendanceRate ?? 0}%`,
                                                animationDelay: '350ms',
                                            }}
                                        />
                                    </div>
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Present across the selected range
                                    </p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>

                {/* Quick actions */}

                {/* Attendance analytics */}
                <section
                    className="dash-fade-up space-y-4"
                    style={{ animationDelay: '420ms' }}
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h2 className="text-lg font-semibold tracking-tight">
                                Attendance overview
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Present, late, and absent counts for your
                                sessions.
                            </p>
                        </div>
                        <div
                            className="inline-flex w-fit items-center gap-0.5 rounded-lg bg-muted p-1"
                            role="tablist"
                            aria-label="Analytics range"
                        >
                            {RANGE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="tab"
                                    aria-selected={range === option.value}
                                    onClick={() => setRange(option.value)}
                                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all duration-200 select-none ${
                                        range === option.value
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:bg-background/60 hover:text-foreground'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Status breakdown */}
                        <Card className="flex flex-col justify-between overflow-hidden p-5 sm:p-6 transition-shadow duration-300 hover:shadow-md">
                            <CardHeader className="p-0 pb-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold">
                                            Status breakdown
                                        </CardTitle>
                                        <CardDescription>
                                            Totals for the selected range
                                        </CardDescription>
                                    </div>
                                    {totalAll > 0 && (
                                        <div className="text-right">
                                            <div className="text-2xl font-bold tabular-nums">
                                                {formatStat(totalAll)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                records
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-between p-0">
                                {totalAll === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
                                        <TrendingUp
                                            className="size-6 text-muted-foreground/50"
                                            aria-hidden
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            No attendance records yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-1 flex-col justify-between gap-3">
                                        {/* Composition bar */}
                                        <div className="flex h-2.5 w-full gap-1 overflow-hidden rounded-full bg-muted/60">
                                            {(
                                                [
                                                    'present',
                                                    'late',
                                                    'absent',
                                                ] as const
                                            ).map((key) => {
                                                const value = totals[key] ?? 0;
                                                if (value === 0) {
                                                    return null;
                                                }
                                                return (
                                                    <div
                                                        key={key}
                                                        className={`dash-width-grow h-full ${STATUS_STYLES[key].bar}`}
                                                        style={{
                                                            width: `${(100 * value) / totalAll}%`,
                                                            animationDelay:
                                                                '500ms',
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="space-y-2">
                                            {(
                                                [
                                                    'present',
                                                    'late',
                                                    'absent',
                                                ] as const
                                            ).map((key, index) => {
                                                const value = totals[key] ?? 0;
                                                const pct = totalAll > 0 ? Math.round(
                                                    (100 * value) / totalAll,
                                                ) : 0;
                                                const style =
                                                    STATUS_STYLES[key];
                                                return (
                                                    <div
                                                        key={key}
                                                        className="space-y-1.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/40"
                                                    >
                                                        <div className="flex items-center justify-between text-sm">
                                                            <span className="inline-flex items-center gap-2 font-medium text-foreground">
                                                                <span
                                                                    className={`size-2 rounded-full ${style.dot}`}
                                                                />
                                                                {style.label}
                                                            </span>
                                                            <span className="tabular-nums">
                                                                <span
                                                                    className={`font-semibold ${style.text}`}
                                                                >
                                                                    {formatStat(
                                                                        value,
                                                                    )}
                                                                </span>{' '}
                                                                <span className="text-xs text-muted-foreground">
                                                                    ({pct}%)
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                            <div
                                                                className={`dash-width-grow h-full rounded-full ${style.bar}`}
                                                                style={{
                                                                    width: `${pct}%`,
                                                                    animationDelay: `${550 + index * 80}ms`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Trend */}
                        <Card className="flex flex-col justify-between overflow-hidden p-5 sm:p-6 transition-shadow duration-300 hover:shadow-md">
                            <CardHeader className="p-0 pb-3">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base font-semibold">
                                            Trend
                                        </CardTitle>
                                        <CardDescription>
                                            Last 7{' '}
                                            {range === 'daily'
                                                ? 'days'
                                                : range === 'weekly'
                                                  ? 'weeks'
                                                  : range === 'monthly'
                                                    ? 'months'
                                                    : 'years'}
                                            {peakTrend > 0
                                                ? ` · peak ${formatStat(peakTrend)}`
                                                : ''}
                                        </CardDescription>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {(
                                            [
                                                'present',
                                                'late',
                                                'absent',
                                            ] as const
                                        ).map((key) => (
                                            <span
                                                key={key}
                                                className="inline-flex items-center gap-1.5"
                                            >
                                                <span
                                                    className={`size-2 rounded-full ${STATUS_STYLES[key].dot}`}
                                                />
                                                {STATUS_STYLES[key].label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-end p-0">
                                {trend.length === 0 || !trendHasData ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
                                        <CalendarDays
                                            className="size-6 text-muted-foreground/50"
                                            aria-hidden
                                        />
                                        <p className="text-sm text-muted-foreground">
                                            No trend data yet.
                                        </p>
                                    </div>
                                ) : (
                                    <ChartContainer
                                        config={chartConfig}
                                        className="aspect-auto h-[180px] w-full"
                                    >
                                        <BarChart
                                            data={trend}
                                            accessibilityLayer
                                            margin={{
                                                left: 0,
                                                right: 0,
                                                top: 0,
                                                bottom: 0,
                                            }}
                                        >
                                            <CartesianGrid
                                                vertical={false}
                                                className="stroke-border"
                                            />
                                            <XAxis
                                                dataKey="date"
                                                tickLine={false}
                                                axisLine={false}
                                                tickMargin={8}
                                                tickFormatter={(value) =>
                                                    formatTrendLabel(value)
                                                }
                                            />
                                            <ChartTooltip
                                                content={
                                                    <ChartTooltipContent
                                                        indicator="dot"
                                                        labelFormatter={(
                                                            value,
                                                        ) => {
                                                            const d =
                                                                parseLocalDate(
                                                                    value,
                                                                );
                                                            if (
                                                                Number.isNaN(
                                                                    d.getTime(),
                                                                )
                                                            ) {
                                                                return value;
                                                            }
                                                            return d.toLocaleDateString(
                                                                undefined,
                                                                {
                                                                    weekday:
                                                                        'long',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                },
                                                            );
                                                        }}
                                                    />
                                                }
                                            />
                                            <Bar
                                                dataKey="present"
                                                stackId="a"
                                                fill="var(--color-present)"
                                                radius={[0, 0, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="late"
                                                stackId="a"
                                                fill="var(--color-late)"
                                                radius={[0, 0, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="absent"
                                                stackId="a"
                                                fill="var(--color-absent)"
                                                radius={[4, 4, 0, 0]}
                                            />
                                        </BarChart>
                                    </ChartContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        {/* Section Attendance Breakdown */}
                        <Card className="flex flex-col justify-between overflow-hidden p-5 sm:p-6 transition-shadow duration-300 hover:shadow-md">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-semibold">Section breakdown</CardTitle>
                                <CardDescription>
                                    Average attendance rates across your sections for the selected range
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-between p-0">
                                {sectionAttendance.length === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-10 text-center">
                                        <TrendingUp className="size-6 text-muted-foreground/50" aria-hidden />
                                        <p className="text-sm text-muted-foreground">
                                            No section attendance records yet.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {sectionAttendance.map((item) => {
                                            let barColor = 'bg-red-500';
                                            let textColor = 'text-red-600 dark:text-red-400';
                                            if (item.attendance_rate >= 90) {
                                                barColor = 'bg-emerald-500';
                                                textColor = 'text-emerald-600 dark:text-emerald-400';
                                            } else if (item.attendance_rate >= 80) {
                                                barColor = 'bg-amber-500';
                                                textColor = 'text-amber-600 dark:text-amber-400';
                                            }

                                            return (
                                                <div key={item.sect_id} className="space-y-2 rounded-xl border border-border/50 bg-muted/20 p-3.5 transition-colors hover:bg-muted/40">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="font-semibold text-foreground">
                                                            {item.name}
                                                        </span>
                                                        <span className={`font-bold tabular-nums ${textColor}`}>
                                                            {item.attendance_rate}%
                                                        </span>
                                                    </div>
                                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                                            style={{ width: `${item.attendance_rate}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                                        <span>{formatStat(item.total_records)} total check-ins</span>
                                                        <span className="font-medium">{item.attendance_rate >= 90 ? 'Excellent' : item.attendance_rate >= 80 ? 'Good' : 'Needs Attention'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* At-Risk Students */}
                        <Card className="flex flex-col justify-between overflow-hidden p-5 sm:p-6 transition-shadow duration-300 hover:shadow-md">
                            <CardHeader className="p-0 pb-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <span>At-risk students</span>
                                    {atRiskStudents.length > 0 && (
                                        <span className="flex size-5 items-center justify-center rounded-full bg-red-500/10 text-xs font-semibold text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                                            {atRiskStudents.length}
                                        </span>
                                    )}
                                </CardTitle>
                                <CardDescription>
                                    Students with low attendance rates or high absence counts in the selected range
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-1 flex-col justify-center p-0">
                                {atRiskStudents.length === 0 ? (
                                    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-7 px-4 text-center">
                                        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400">
                                            <UserCheck className="size-5" aria-hidden />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">No students at risk</p>
                                        <p className="text-xs text-muted-foreground">
                                            All students in your sections meet attendance expectations!
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border">
                                        {atRiskStudents.map((student) => {
                                            const nameParts = student.name.split(' ');
                                            const initials = nameParts.map(n => n[0]).join('').substring(0, 2).toUpperCase();

                                            return (
                                                <div key={student.stu_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                                                            {initials}
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <div className="text-sm font-semibold leading-none hover:underline">
                                                                <Link href={studentRecords.show.url(student.stu_id)}>
                                                                    {student.name}
                                                                </Link>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-none">
                                                                {student.section}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-right">
                                                            <div className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20">
                                                                {student.attendance_rate}% Rate
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                                {student.absent_count} {student.absent_count === 1 ? 'absence' : 'absences'}
                                                            </div>
                                                        </div>
                                                        <Link
                                                            href={studentRecords.show.url(student.stu_id)}
                                                            className="flex size-7 items-center justify-center rounded-lg border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                                                            title="View attendance details"
                                                        >
                                                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                                                        </Link>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>
        </TeacherLayout>
    );
}
