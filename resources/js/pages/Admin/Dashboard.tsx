import { Deferred, Head, usePage } from '@inertiajs/react';
import {
    TrendingDown,
    TrendingUp,
    Users,
    UserCheck,
    Activity,
    Wifi,
    Clock,
    UserX,
    GraduationCap,
    CalendarDays,
    CalendarOff,
    Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    XAxis,
    Pie,
    PieChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';
import AdminLayout from '@/layouts/admin/admin-layout';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem, SharedData } from '@/types';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/admin/dashboard',
    },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
    totalStudents: number;
    checkedInToday: number;
    presentToday: number;
    lateToday: number;
    absentToday: number;
    activeRfid: number;
    avgRateToday: number;
    presentChange: number;
    avgChange: number;
}

interface BreakdownItem {
    label: string;
    count: number;
    color: string;
}

interface CheckinRow {
    att_id: number;
    stu_id: number;
    student: string;
    section: string;
    status: string;
    time_in: string;
    rfid_uid: string;
}

interface ChartData {
    labels: string[];
    points: number[];
    maxY: number;
    isNonSchoolDay?: boolean[];
}

interface SectionPerf {
    totalSections: number;
    activeTodaySections: number;
    avgRate: number;
    highCount: number;
    midCount: number;
    lowCount: number;
    topSection: { name: string; rate: number } | null;
    bottomSection: { name: string; rate: number } | null;
}

interface HourlyBucket {
    hour: string;
    count: number;
}

interface GradeRow {
    grade: string;
    enrolled: number;
    present: number;
    rate: number;
}

interface Props {
    stats: Stats;
    attendanceBreakdown: BreakdownItem[];
    recentCheckins: CheckinRow[];
    hourlyCheckins: HourlyBucket[];
    nonSchoolDay?: { title: string; type: string } | null;
    attendanceChart?: ChartData;
    sectionPerformance?: SectionPerf;
    gradeBreakdown?: GradeRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();
}

const AVATAR_COLORS = [
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
];

function avatarColor(name: string) {
    let n = 0;
    for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
    return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

// ─── Smooth line chart ────────────────────────────────────────────────────────

function MainLineChart({ data }: { data: ChartData }) {
    const chartRows = useMemo(() => {
        return data.points.map((val, idx) => ({
            day: data.labels[idx] || `Day ${idx + 1}`,
            students: val,
        }));
    }, [data]);

    const chartConfig = {
        students: {
            label: 'Students',
            color: '#10b981', // emerald-500
        },
    } satisfies ChartConfig;

    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[180px] w-full"
        >
            <AreaChart
                data={chartRows}
                margin={{ left: -10, right: 10, top: 10, bottom: 0 }}
            >
                <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                            offset="5%"
                            stopColor="var(--color-students)"
                            stopOpacity={0.3}
                        />
                        <stop
                            offset="95%"
                            stopColor="var(--color-students)"
                            stopOpacity={0}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid vertical={false} className="stroke-border" />
                <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={20}
                />
                <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                />
                <Area
                    dataKey="students"
                    type="monotone"
                    fill="url(#areaGrad)"
                    stroke="var(--color-students)"
                    strokeWidth={2}
                    dot={false}
                />
            </AreaChart>
        </ChartContainer>
    );
}

// ─── Hourly bar chart ─────────────────────────────────────────────────────────

function HourlyBarChart({ buckets }: { buckets: HourlyBucket[] }) {
    const chartConfig = {
        count: {
            label: 'Taps',
            color: '#10b981', // emerald-500
        },
    } satisfies ChartConfig;

    return (
        <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[120px] w-full"
        >
            <BarChart
                data={buckets}
                margin={{ left: -20, right: 10, top: 10, bottom: 0 }}
            >
                <CartesianGrid vertical={false} className="stroke-border" />
                <XAxis
                    dataKey="hour"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    interval={1}
                />
                <ChartTooltip
                    content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                />
            </BarChart>
        </ChartContainer>
    );
}

// ─── Grade breakdown ──────────────────────────────────────────────────────────

function GradeBreakdownList({ grades }: { grades: GradeRow[] }) {
    if (grades.length === 0) {
        return (
            <p className="py-6 text-center text-xs text-muted-foreground">
                No enrollment data for the active school year.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {grades.map((g) => (
                <div key={g.grade}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-medium text-foreground">
                            {g.grade}
                        </span>
                        <span className="text-muted-foreground tabular-nums">
                            {g.present}/{g.enrolled}
                            <span
                                className={cn(
                                    'ml-2 font-semibold',
                                    g.rate >= 90
                                        ? 'text-emerald-600'
                                        : g.rate >= 80
                                          ? 'text-amber-600'
                                          : 'text-red-600',
                                )}
                            >
                                {g.rate}%
                            </span>
                        </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all',
                                g.rate >= 90
                                    ? 'bg-emerald-500'
                                    : g.rate >= 80
                                      ? 'bg-amber-400'
                                      : 'bg-red-400',
                            )}
                            style={{ width: `${Math.min(g.rate, 100)}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

function GradeSkeleton() {
    return (
        <div className="space-y-4 pt-1">
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-1.5">
                    <div className="h-3 w-20 animate-pulse rounded-full bg-muted/50" />
                    <div className="h-2 w-full animate-pulse rounded-full bg-muted/50" />
                </div>
            ))}
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="relative h-[180px] w-full overflow-hidden rounded-xl bg-muted/30">
            <div className="absolute inset-0 animate-pulse bg-linear-to-r from-transparent via-muted/60 to-transparent" />
        </div>
    );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

function DonutChart({ breakdown }: { breakdown: BreakdownItem[] }) {
    const total = breakdown.reduce((s, seg) => s + seg.count, 0);

    const chartRows = useMemo(() => {
        return breakdown.map((item) => ({
            name: item.label,
            value: item.count,
            fill: item.color,
        }));
    }, [breakdown]);

    const chartConfig = useMemo(() => {
        const cfg: ChartConfig = {};
        breakdown.forEach((item) => {
            cfg[item.label] = {
                label: item.label,
                color: item.color,
            };
        });
        return cfg;
    }, [breakdown]);

    return (
        <div className="relative mx-auto size-[140px] shrink-0">
            <ChartContainer
                config={chartConfig}
                className="aspect-square size-full"
            >
                <PieChart>
                    <Pie
                        data={chartRows}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={56}
                        stroke="var(--card)"
                        strokeWidth={2}
                        cornerRadius={4}
                    />
                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold tracking-tight text-foreground">
                    {total.toLocaleString()}
                </span>
                <span className="text-[9px] tracking-wider text-muted-foreground uppercase">
                    Total
                </span>
            </div>
        </div>
    );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

type StatCardAccent = 'emerald' | 'blue' | 'violet' | 'amber';

type StatCardProps = {
    label: string;
    value: string | number;
    change: number;
    icon: React.ElementType;
    accent: StatCardAccent;
    suffix?: string;
    hideChange?: boolean;
    footnote?: string;
    style?: React.CSSProperties;
    className?: string;
};

const ACCENT_STYLES: Record<
    StatCardAccent,
    {
        bar: string;
        glow: string;
        iconBg: string;
        iconText: string;
        changeBg: string;
    }
> = {
    emerald: {
        bar: 'bg-emerald-500',
        glow: 'hover:shadow-lg hover:shadow-emerald-500/10 dark:hover:shadow-emerald-500/5',
        iconBg: 'bg-emerald-100 dark:bg-emerald-950/40',
        iconText: 'text-emerald-600 dark:text-emerald-400',
        changeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    },
    blue: {
        bar: 'bg-blue-500',
        glow: 'hover:shadow-lg hover:shadow-blue-500/10 dark:hover:shadow-blue-500/5',
        iconBg: 'bg-blue-100 dark:bg-blue-950/40',
        iconText: 'text-blue-600 dark:text-blue-400',
        changeBg: 'bg-blue-50 dark:bg-blue-950/40',
    },
    violet: {
        bar: 'bg-violet-500',
        glow: 'hover:shadow-lg hover:shadow-violet-500/10 dark:hover:shadow-violet-500/5',
        iconBg: 'bg-violet-100 dark:bg-violet-950/40',
        iconText: 'text-violet-600 dark:text-violet-400',
        changeBg: 'bg-violet-50 dark:bg-violet-950/40',
    },
    amber: {
        bar: 'bg-amber-500',
        glow: 'hover:shadow-lg hover:shadow-amber-500/10 dark:hover:shadow-amber-500/5',
        iconBg: 'bg-amber-100 dark:bg-amber-950/40',
        iconText: 'text-amber-600 dark:text-amber-400',
        changeBg: 'bg-amber-50 dark:bg-amber-950/40',
    },
};

function StatCard({
    label,
    value,
    change,
    icon: Icon,
    accent,
    suffix,
    hideChange,
    footnote,
    style,
    className,
}: StatCardProps) {
    const positive = change >= 0;
    const styles = ACCENT_STYLES[accent];

    return (
        <Card
            className={cn(
                'group relative overflow-hidden rounded-xl border-border/60 py-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5',
                styles.glow,
                className,
            )}
            style={style}
        >
            <div className={cn('absolute inset-x-0 top-0 h-1 rounded-t-xl', styles.bar)} />
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                        {label}
                    </span>
                    <div
                        className={cn(
                            'flex size-8 items-center justify-center rounded-lg',
                            styles.iconBg,
                        )}
                    >
                        <Icon className={cn('size-4', styles.iconText)} />
                    </div>
                </div>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground tabular-nums md:text-3xl">
                    {typeof value === 'number' ? value.toLocaleString() : value}
                    {suffix && (
                        <span className="ml-0.5 text-lg font-semibold text-muted-foreground">
                            {suffix}
                        </span>
                    )}
                </p>
                <div className="mt-2 flex min-h-[20px] items-center gap-1 text-[11px] text-muted-foreground">
                    {!hideChange ? (
                        <>
                            <span
                                className={cn(
                                    'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold',
                                    positive
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                                )}
                            >
                                {positive ? (
                                    <TrendingUp className="size-3" />
                                ) : (
                                    <TrendingDown className="size-3" />
                                )}
                                {Math.abs(change)}%
                            </span>
                            <span>vs yesterday</span>
                        </>
                    ) : (
                        <span>{footnote ?? 'Total in system'}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusBar({ stats, className }: { stats: Stats; className?: string }) {
    const total = stats.checkedInToday + stats.absentToday;
    const presentPct = total > 0 ? (stats.presentToday / total) * 100 : 0;
    const latePct = total > 0 ? (stats.lateToday / total) * 100 : 0;
    const absentPct = total > 0 ? (stats.absentToday / total) * 100 : 0;

    return (
        <Card className={cn('flex flex-col justify-between rounded-2xl border-border/60 py-0 shadow-sm', className)}>
            <CardContent className="flex flex-1 flex-col justify-between p-5">
                <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                        Today's Attendance
                    </p>
                    <span className="text-xs text-muted-foreground">
                        {stats.checkedInToday} / {total} scanned
                    </span>
                </div>

                {/* Progress bar */}
                <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-muted/50">
                    {presentPct > 0 && (
                        <div
                            className="h-full bg-emerald-500 transition-all"
                            style={{ width: `${presentPct}%` }}
                        />
                    )}
                    {latePct > 0 && (
                        <div
                            className="h-full bg-amber-400 transition-all"
                            style={{ width: `${latePct}%` }}
                        />
                    )}
                    {absentPct > 0 && (
                        <div
                            className="h-full bg-red-400 transition-all"
                            style={{ width: `${absentPct}%` }}
                        />
                    )}
                </div>

                <div className="grid grid-cols-3 gap-4">
                    {[
                        {
                            label: 'Present',
                            count: stats.presentToday,
                            pct: presentPct,
                            icon: UserCheck,
                            color: 'text-emerald-600',
                            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
                        },
                        {
                            label: 'Late',
                            count: stats.lateToday,
                            pct: latePct,
                            icon: Clock,
                            color: 'text-amber-600',
                            bg: 'bg-amber-50 dark:bg-amber-950/30',
                        },
                        {
                            label: 'Absent',
                            count: stats.absentToday,
                            pct: absentPct,
                            icon: UserX,
                            color: 'text-red-600',
                            bg: 'bg-red-50 dark:bg-red-950/30',
                        },
                    ].map(({ label, count, pct, icon: Ico, color, bg }) => (
                        <div
                            key={label}
                            className={cn(
                                'flex flex-col items-center gap-1 rounded-xl p-3',
                                bg,
                            )}
                        >
                            <Ico className={cn('size-4', color)} />
                            <span
                                className={cn(
                                    'text-xl font-bold tabular-nums',
                                    color,
                                )}
                            >
                                {count.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                {label}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground">
                                {pct.toFixed(1)}%
                            </span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function SectionPerfSkeleton() {
    return (
        <div className="space-y-3 pt-1">
            {[80, 60, 45, 90, 35].map((w) => (
                <div key={w} className="flex items-center gap-3">
                    <div className="h-3 w-24 animate-pulse rounded-full bg-muted/50" />
                    <div
                        className="h-2 flex-1 animate-pulse rounded-full bg-muted/50"
                        style={{ maxWidth: `${w}%` }}
                    />
                    <div className="h-3 w-8 animate-pulse rounded-full bg-muted/50" />
                </div>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard({
    stats,
    attendanceBreakdown,
    recentCheckins,
    hourlyCheckins,
    nonSchoolDay,
    attendanceChart,
    sectionPerformance,
    gradeBreakdown,
}: Props) {
    const { auth } = usePage<SharedData>().props;
    const displayName = auth.user?.name?.trim() || 'Admin';
    const [search, setSearch] = useState('');

    const filteredCheckins = useMemo(
        () =>
            recentCheckins.filter(
                (r) =>
                    r.student.toLowerCase().includes(search.toLowerCase()) ||
                    r.section.toLowerCase().includes(search.toLowerCase()),
            ),
        [recentCheckins, search],
    );

    const dateLabel = new Date().toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin · Dashboard" />
            <div className="space-y-5 p-4 md:p-6 lg:p-8">
                {/* ── Welcome banner ── */}
                <div
                    className="dash-fade-up relative overflow-hidden rounded-xl border bg-linear-to-r from-emerald-500/[0.08] via-teal-500/[0.05] to-transparent p-5 dark:from-emerald-500/[0.12] dark:via-teal-500/[0.07]"
                    style={{ animationDelay: '0ms' }}
                >
                    <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />
                    <div className="pointer-events-none absolute -top-10 -right-10 size-48 rounded-full bg-emerald-500/10 blur-3xl" />
                    <div className="pointer-events-none absolute right-40 -bottom-10 size-32 rounded-full bg-teal-500/10 blur-2xl" />
                    <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1.5">
                            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                                {getGreeting()}, {displayName}
                            </h1>
                            <p className="max-w-lg text-sm text-muted-foreground md:text-base">
                                Here's a real-time overview of attendance,
                                students, and system stats.
                            </p>
                        </div>
                        <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-500/15 bg-background/80 px-3 py-2 text-sm text-muted-foreground shadow-sm backdrop-blur-sm">
                            <span className="relative flex size-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                            </span>
                            <CalendarDays
                                className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                                aria-hidden
                            />
                            <span className="font-medium text-foreground">
                                {dateLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Non-school-day banner ── */}
                {nonSchoolDay && (
                    <div
                        className="dash-fade-up relative overflow-hidden rounded-xl border border-amber-500/20 bg-linear-to-r from-amber-500/[0.08] via-orange-500/[0.05] to-transparent p-4 dark:from-amber-500/[0.12] dark:via-orange-500/[0.07]"
                        style={{ animationDelay: '25ms' }}
                    >
                        <div className="absolute inset-y-0 left-0 w-1 bg-amber-500" />
                        <div className="relative z-10 flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/40">
                                <CalendarOff className="size-5 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-foreground">
                                    No Classes Today — {nonSchoolDay.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Today is a{' '}
                                    <span className="font-medium capitalize">
                                        {nonSchoolDay.type.replace('_', ' ')}
                                    </span>
                                    . Attendance tracking is paused and RFID scans will not be recorded.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Stat cards ── */}
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        label="Total Students"
                        value={stats.totalStudents}
                        change={0}
                        icon={Users}
                        accent="blue"
                        hideChange
                        footnote="Enrolled in system"
                        className="dash-fade-up"
                        style={{ animationDelay: '50ms' }}
                    />
                    <StatCard
                        label="Checked In Today"
                        value={stats.checkedInToday}
                        change={stats.presentChange}
                        icon={UserCheck}
                        accent="emerald"
                        className="dash-fade-up"
                        style={{ animationDelay: '100ms' }}
                    />
                    <StatCard
                        label="Attendance Rate"
                        value={stats.avgRateToday}
                        change={stats.avgChange}
                        icon={Activity}
                        accent="violet"
                        suffix="%"
                        className="dash-fade-up"
                        style={{ animationDelay: '150ms' }}
                    />
                    <StatCard
                        label="Active RFID Cards"
                        value={stats.activeRfid}
                        change={0}
                        icon={Wifi}
                        accent="amber"
                        hideChange
                        footnote="Assigned to students"
                        className="dash-fade-up"
                        style={{ animationDelay: '200ms' }}
                    />
                </div>

                {/* ── Status + Chart row ── */}
                <div
                    className="dash-fade-up grid gap-4 lg:grid-cols-5"
                    style={{ animationDelay: '250ms' }}
                >
                    {/* Status bar takes 2/5 */}
                    <div className="flex flex-col lg:col-span-2">
                        <StatusBar stats={stats} className="h-full" />
                    </div>

                    {/* Chart takes 3/5 */}
                    <Card className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border-border/60 gap-0 py-0 shadow-sm lg:col-span-3">
                        <CardHeader className="px-4 pt-4 pb-0">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        Daily Attendance Trend
                                    </CardTitle>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        Last 30 days · students checked in
                                    </p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col justify-end px-4 pt-2 pb-4">
                            <Deferred
                                data="attendanceChart"
                                fallback={<ChartSkeleton />}
                            >
                                {attendanceChart && (
                                    <MainLineChart data={attendanceChart} />
                                )}
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Breakdown + Section perf row ── */}
                <div
                    className="dash-fade-up grid gap-4 lg:grid-cols-5"
                    style={{ animationDelay: '300ms' }}
                >
                    {/* Donut breakdown */}
                    <Card className="rounded-2xl border-border/60 gap-0 py-0 shadow-sm lg:col-span-2">
                        <CardHeader className="px-5 pt-4 pb-2">
                            <CardTitle className="text-sm font-semibold">
                                Today's Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-5 pb-5">
                            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                                <DonutChart breakdown={attendanceBreakdown} />
                                <div className="w-full flex-1 space-y-3">
                                    {attendanceBreakdown.map((src) => {
                                        const total =
                                            attendanceBreakdown.reduce(
                                                (s, x) => s + x.count,
                                                0,
                                            );
                                        const pct =
                                            total > 0
                                                ? (
                                                      (src.count / total) *
                                                      100
                                                  ).toFixed(1)
                                                : '0.0';
                                        return (
                                            <div key={src.label}>
                                                <div className="mb-1 flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="size-2 shrink-0 rounded-full"
                                                            style={{
                                                                backgroundColor:
                                                                    src.color,
                                                            }}
                                                        />
                                                        <span className="text-xs text-muted-foreground">
                                                            {src.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {pct}%
                                                        </span>
                                                        <span className="text-xs font-semibold text-foreground tabular-nums">
                                                            {src.count.toLocaleString()}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor:
                                                                src.color,
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section performance */}
                    <Card className="rounded-2xl border-border/60 gap-0 py-0 shadow-sm lg:col-span-3">
                        <CardHeader className="px-5 pt-4 pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-sm font-semibold">
                                    Section Performance Today
                                </CardTitle>
                                <Deferred
                                    data="sectionPerformance"
                                    fallback={null}
                                >
                                    {sectionPerformance && (
                                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                                                High ≥90%
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block size-2 rounded-full bg-amber-400" />
                                                Mid
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <span className="inline-block size-2 rounded-full bg-red-400" />
                                                Low &lt;80%
                                            </span>
                                        </div>
                                    )}
                                </Deferred>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-0 px-5 pb-5">
                            <Deferred
                                data="sectionPerformance"
                                fallback={<SectionPerfSkeleton />}
                            >
                                {sectionPerformance ? (
                                    <>
                                        {/* Summary row */}
                                        <div className="mb-4 grid grid-cols-3 gap-3">
                                            {[
                                                {
                                                    label: 'Total Sections',
                                                    value: sectionPerformance.totalSections,
                                                },
                                                {
                                                    label: 'Active Today',
                                                    value: sectionPerformance.activeTodaySections,
                                                },
                                                {
                                                    label: 'Avg Rate',
                                                    value: `${sectionPerformance.avgRate}%`,
                                                },
                                            ].map(({ label, value }) => (
                                                <div
                                                    key={label}
                                                    className="rounded-xl bg-muted/30 p-3 text-center"
                                                >
                                                    <p className="text-base font-bold text-foreground tabular-nums">
                                                        {value}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {label}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Distribution bar */}
                                        <div className="mb-3">
                                            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted/50">
                                                {sectionPerformance.totalSections >
                                                    0 && (
                                                    <>
                                                        <div
                                                            className="bg-emerald-500 transition-all"
                                                            style={{
                                                                width: `${(sectionPerformance.highCount / sectionPerformance.totalSections) * 100}%`,
                                                            }}
                                                        />
                                                        <div
                                                            className="bg-amber-400 transition-all"
                                                            style={{
                                                                width: `${(sectionPerformance.midCount / sectionPerformance.totalSections) * 100}%`,
                                                            }}
                                                        />
                                                        <div
                                                            className="bg-red-400 transition-all"
                                                            style={{
                                                                width: `${(sectionPerformance.lowCount / sectionPerformance.totalSections) * 100}%`,
                                                            }}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                                                <span>
                                                    High:{' '}
                                                    {
                                                        sectionPerformance.highCount
                                                    }
                                                </span>
                                                <span>
                                                    Mid:{' '}
                                                    {
                                                        sectionPerformance.midCount
                                                    }
                                                </span>
                                                <span>
                                                    Low:{' '}
                                                    {
                                                        sectionPerformance.lowCount
                                                    }
                                                </span>
                                            </div>
                                        </div>

                                        {/* Top / bottom */}
                                        {(sectionPerformance.topSection ||
                                            sectionPerformance.bottomSection) && (
                                            <div className="space-y-2 border-t border-border/50 pt-3">
                                                {sectionPerformance.topSection && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-20 shrink-0 truncate text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                            ↑ Best
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="mb-0.5 flex items-center justify-between text-[11px]">
                                                                <span className="truncate text-muted-foreground">
                                                                    {
                                                                        sectionPerformance
                                                                            .topSection
                                                                            .name
                                                                    }
                                                                </span>
                                                                <span className="ml-2 shrink-0 font-semibold text-emerald-600">
                                                                    {
                                                                        sectionPerformance
                                                                            .topSection
                                                                            .rate
                                                                    }
                                                                    %
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                                                <div
                                                                    className="h-full rounded-full bg-emerald-500"
                                                                    style={{
                                                                        width: `${sectionPerformance.topSection.rate}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {sectionPerformance.bottomSection && (
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-20 shrink-0 truncate text-[11px] font-medium text-red-600 dark:text-red-400">
                                                            ↓ Lowest
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="mb-0.5 flex items-center justify-between text-[11px]">
                                                                <span className="truncate text-muted-foreground">
                                                                    {
                                                                        sectionPerformance
                                                                            .bottomSection
                                                                            .name
                                                                    }
                                                                </span>
                                                                <span className="ml-2 shrink-0 font-semibold text-red-600">
                                                                    {
                                                                        sectionPerformance
                                                                            .bottomSection
                                                                            .rate
                                                                    }
                                                                    %
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 overflow-hidden rounded-full bg-muted/50">
                                                                <div
                                                                    className="h-full rounded-full bg-red-400"
                                                                    style={{
                                                                        width: `${sectionPerformance.bottomSection.rate}%`,
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                ) : null}
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Hourly activity + Grade breakdown row ── */}
                <div
                    className="dash-fade-up grid gap-4 lg:grid-cols-5"
                    style={{ animationDelay: '350ms' }}
                >
                    {/* Hourly check-in activity */}
                    <Card className="rounded-2xl border-border/60 gap-0 py-0 shadow-sm lg:col-span-3">
                        <CardHeader className="px-5 pt-4 pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        Check-in Activity Today
                                    </CardTitle>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        Taps per hour · 6 AM – 6 PM
                                    </p>
                                </div>
                                <Clock className="size-4 text-muted-foreground/50" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pt-2 pb-4">
                            <HourlyBarChart buckets={hourlyCheckins} />
                        </CardContent>
                    </Card>

                    {/* Grade level breakdown */}
                    <Card className="rounded-2xl border-border/60 gap-0 py-0 shadow-sm lg:col-span-2">
                        <CardHeader className="px-5 pt-4 pb-2">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-semibold">
                                        By Grade Level
                                    </CardTitle>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        Attendance rate today
                                    </p>
                                </div>
                                <GraduationCap className="size-4 text-muted-foreground/50" />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pt-2 pb-4">
                            <Deferred
                                data="gradeBreakdown"
                                fallback={<GradeSkeleton />}
                            >
                                {gradeBreakdown ? (
                                    <GradeBreakdownList
                                        grades={gradeBreakdown}
                                    />
                                ) : null}
                            </Deferred>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Recent Check-ins ── */}
                <Card
                    className="dash-fade-up overflow-hidden rounded-2xl border-border/60 gap-0 py-0 shadow-sm"
                    style={{ animationDelay: '400ms' }}
                >
                    <CardHeader className="px-5 pt-4 pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <CardTitle className="text-sm font-semibold">
                                    Recent Check-ins
                                </CardTitle>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {recentCheckins.length} most recent today
                                </p>
                            </div>
                            <div className="relative">
                                <Search className="absolute top-2.5 left-2.5 size-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Filter by name or section…"
                                    className="h-8 w-full rounded-xl border border-border/60 bg-muted/40 pr-3 pl-8 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-emerald-500 focus:outline-none sm:w-56"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {recentCheckins.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-14 text-center">
                                <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/40">
                                    <UserCheck className="size-6 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">
                                    No check-ins yet today
                                </p>
                                <p className="text-xs text-muted-foreground/60">
                                    Students will appear here as they scan their
                                    RFID cards.
                                </p>
                            </div>
                        ) : filteredCheckins.length === 0 ? (
                            <div className="py-10 text-center text-sm text-muted-foreground">
                                No results for &quot;{search}&quot;
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-y border-border/50 bg-muted/20">
                                            {[
                                                'Student',
                                                'Section',
                                                'Status',
                                                'Time In',
                                                'RFID',
                                            ].map((col) => (
                                                <th
                                                    key={col}
                                                    className="px-4 py-2.5 text-left text-[11px] font-semibold tracking-wider text-muted-foreground uppercase"
                                                >
                                                    {col}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {filteredCheckins.map((row) => (
                                            <tr
                                                key={row.att_id}
                                                className="group transition-colors hover:bg-muted/20"
                                            >
                                                {/* Student */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={cn(
                                                                'flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                                                                avatarColor(
                                                                    row.student,
                                                                ),
                                                            )}
                                                        >
                                                            {initials(
                                                                row.student,
                                                            )}
                                                        </div>
                                                        <span className="font-medium text-foreground">
                                                            {row.student}
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* Section */}
                                                <td className="px-4 py-3 text-xs text-muted-foreground">
                                                    {row.section}
                                                </td>
                                                {/* Status */}
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                                                            row.status ===
                                                                'Present' &&
                                                                'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                                                            row.status ===
                                                                'Late' &&
                                                                'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
                                                            row.status ===
                                                                'Absent' &&
                                                                'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                'size-1.5 rounded-full',
                                                                row.status ===
                                                                    'Present' &&
                                                                    'bg-emerald-500',
                                                                row.status ===
                                                                    'Late' &&
                                                                    'bg-amber-500',
                                                                row.status ===
                                                                    'Absent' &&
                                                                    'bg-red-500',
                                                            )}
                                                        />
                                                        {row.status}
                                                    </span>
                                                </td>
                                                {/* Time */}
                                                <td className="px-4 py-3 text-xs text-muted-foreground tabular-nums">
                                                    {row.time_in}
                                                </td>
                                                {/* RFID */}
                                                <td className="px-4 py-3">
                                                    <span className="inline-block rounded-md border border-border/50 bg-muted/60 px-2 py-0.5 font-mono text-[11px] font-medium text-foreground/80">
                                                        {row.rfid_uid}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AdminLayout>
    );
}
