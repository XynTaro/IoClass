import { Head, router, usePage } from '@inertiajs/react';
import {
    AlertCircle,
    CalendarDays,
    CheckCircle2,
    Clock,
    Download,
    FileSpreadsheet,
    Loader2,
    ShieldCheck,
    Users,
    UserX,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import TeacherLayout from '@/layouts/teacher/teacher-layout';
import sf2Routes from '@/routes/teacher/sf2-reports';

type AttendanceStatus =
    | 'present'
    | 'late'
    | 'excused'
    | 'absent'
    | 'weekend'
    | 'no_class'
    | null;

interface StudentRow {
    stu_id: number;
    lrn: string | null;
    name: string;
    gender?: 'male' | 'female' | null;
    photo?: string | null;
    days: Record<number, AttendanceStatus>;
    totals: {
        present: number;
        late: number;
        excused: number;
        absent: number;
    };
}

interface SchoolYearOption {
    sy_id: number;
    sy_label: string;
    is_active: boolean;
}

type PageProps = {
    sectionInfo: { sect_name: string; gr_level: string } | null;
    schoolYears: SchoolYearOption[];
    selectedSyId: number | null;
    schoolYearLabel: string | null;
    selectedMonth: number;
    selectedYear: number;
    daysInMonth: number;
    rows: StudentRow[];
    maleSummaryByDay?: Record<
        number,
        { present: number; late: number; absent: number; excused: number }
    >;
    femaleSummaryByDay?: Record<
        number,
        { present: number; late: number; absent: number; excused: number }
    >;
    summaryByDay: Record<
        number,
        { present: number; late: number; absent: number; excused: number }
    >;
    isAdviser: boolean;
};

const MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
];

const STATUS_ABBR: Record<string, string> = {
    present: 'P',
    late: 'L',
    excused: 'E',
    absent: 'A',
    weekend: '',
    no_class: '',
};

const STATUS_CELL_CLASS: Record<string, string> = {
    present:
        'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    late: 'bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    excused:
        'bg-sky-500/10 text-sky-600 border border-sky-500/20 font-medium dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
    absent: 'bg-rose-500/10 text-rose-600 border border-rose-500/20 font-bold dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    weekend: 'bg-muted/20 text-muted-foreground/30',
    no_class: 'bg-amber-500/5 text-muted-foreground/30',
};

const LEGEND = [
    {
        abbr: 'P',
        label: 'Present',
        cls: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400 dark:ring-emerald-500/30',
    },
    {
        abbr: 'L',
        label: 'Late',
        cls: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400 dark:ring-amber-500/30',
    },
    {
        abbr: 'E',
        label: 'Excused',
        cls: 'bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400 dark:ring-sky-500/30',
    },
    {
        abbr: 'A',
        label: 'Absent',
        cls: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-400 dark:ring-rose-500/30',
    },
];

function isWeekendDay(year: number, month: number, day: number): boolean {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();
    return weekday === 0 || weekday === 6;
}

function statusCell(status: AttendanceStatus) {
    if (!status || status === 'weekend' || status === 'no_class') {
        return (
            <span className="block py-0.5 text-center text-[10px] text-muted-foreground/35 select-none">
                —
            </span>
        );
    }

    return (
        <span
            className={`mx-auto flex size-6 items-center justify-center rounded-full text-center text-[11px] transition-all duration-250 hover:scale-115 ${STATUS_CELL_CLASS[status] ?? ''}`}
        >
            {STATUS_ABBR[status] ?? ''}
        </span>
    );
}

export default function SF2ReportsIndex() {
    const {
        sectionInfo,
        schoolYears,
        selectedSyId,
        schoolYearLabel,
        selectedMonth,
        selectedYear,
        daysInMonth,
        rows,
        maleSummaryByDay,
        femaleSummaryByDay,
        summaryByDay,
        isAdviser,
    } = usePage<PageProps>().props;

    const [month, setMonth] = useState(String(selectedMonth));
    const [syId, setSyId] = useState(
        selectedSyId ? String(selectedSyId) : 'none',
    );

    useEffect(() => {
        setMonth(String(selectedMonth));
        setSyId(selectedSyId ? String(selectedSyId) : 'none');
    }, [selectedMonth, selectedSyId]);

    function navigate(overrides: Partial<{ month: string; sy_id: string }>) {
        const query: Record<string, string> = {};

        const nextMonth = overrides.month ?? month;
        const nextSy = overrides.sy_id ?? syId;

        if (nextMonth) {
            query.month = nextMonth;
        }
        if (nextSy && nextSy !== 'none') {
            query.sy_id = nextSy;
        }

        router.get(sf2Routes.index.url({ query }), {}, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    }

    const [isExporting, setIsExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    function buildExportUrl() {
        const query: Record<string, string> = {
            month,
        };

        if (syId && syId !== 'none') {
            query.sy_id = syId;
        }

        return sf2Routes.export.url({ query });
    }

    async function handleExport() {
        if (isExporting) {
            return;
        }

        setIsExporting(true);
        setExportError(null);

        try {
            const url = buildExportUrl();
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json, text/html, */*',
                },
            });

            // If session expired or redirected to login
            if (response.redirected || response.status === 401 || response.status === 419) {
                window.location.href = response.url || '/login';
                return;
            }

            if (!response.ok) {
                let errorMessage = `Export failed (HTTP ${response.status}).`;
                try {
                    const text = await response.text();
                    try {
                        const parsed = JSON.parse(text);
                        if (parsed.message) {
                            errorMessage = parsed.message;
                        }
                    } catch {
                        if (text && text.length < 250 && !text.includes('<!DOCTYPE')) {
                            errorMessage = text;
                        }
                    }
                } catch {
                    // Ignore text extraction errors
                }
                setExportError(errorMessage);
                return;
            }

            // Extract filename from Content-Disposition header if provided
            const disposition = response.headers.get('content-disposition');
            const gradeClean = (sectionInfo?.gr_level ?? '').replace(/^grade\s*/i, '').trim();
            const defaultFilename = `SF2_${(sectionInfo?.sect_name ?? 'Section').replace(/\s+/g, '_')}_Grade${gradeClean ? `_${gradeClean}` : ''}_${MONTHS[selectedMonth - 1] ?? 'Month'}_${schoolYearLabel ? schoolYearLabel.replace(/[\s/]+/g, '-') : selectedYear}.xlsx`;
            let filename = defaultFilename;

            if (disposition) {
                const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
                if (match?.[1]) {
                    filename = decodeURIComponent(match[1].trim());
                }
            }

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error: unknown) {
            console.error('SF2 export error:', error);
            setExportError(error instanceof Error ? error.message : 'Export failed.');
        } finally {
            setIsExporting(false);
        }
    }

    const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const periodLabel = `${MONTHS[selectedMonth - 1] ?? ''} ${selectedYear}`;

    const maleRows = useMemo(
        () => rows.filter((r) => r.gender !== 'female'),
        [rows],
    );
    const femaleRows = useMemo(
        () => rows.filter((r) => r.gender === 'female'),
        [rows],
    );

    const monthTotals = useMemo(() => {
        return rows.reduce(
            (acc, row) => ({
                present: acc.present + row.totals.present,
                late: acc.late + row.totals.late,
                excused: acc.excused + row.totals.excused,
                absent: acc.absent + row.totals.absent,
            }),
            { present: 0, late: 0, excused: 0, absent: 0 },
        );
    }, [rows]);

    const maleTotals = useMemo(() => {
        return maleRows.reduce(
            (acc, row) => ({
                present: acc.present + row.totals.present,
                late: acc.late + row.totals.late,
                excused: acc.excused + row.totals.excused,
                absent: acc.absent + row.totals.absent,
            }),
            { present: 0, late: 0, excused: 0, absent: 0 },
        );
    }, [maleRows]);

    const femaleTotals = useMemo(() => {
        return femaleRows.reduce(
            (acc, row) => ({
                present: acc.present + row.totals.present,
                late: acc.late + row.totals.late,
                excused: acc.excused + row.totals.excused,
                absent: acc.absent + row.totals.absent,
            }),
            { present: 0, late: 0, excused: 0, absent: 0 },
        );
    }, [femaleRows]);

    const summaryCards = [
        {
            label: 'Total Learners',
            value: rows.length,
            description: `${maleRows.length} Male · ${femaleRows.length} Female`,
            icon: Users,
            bgGradient: 'from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10',
            borderClass: 'border-blue-500/10 hover:border-blue-500/30 dark:border-blue-500/20 dark:hover:border-blue-500/40',
            iconStyle:
                'bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 ring-4 ring-blue-500/5',
            valueStyle: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Present Check-ins',
            value: monthTotals.present,
            icon: CheckCircle2,
            bgGradient: 'from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10',
            borderClass: 'border-emerald-500/10 hover:border-emerald-500/30 dark:border-emerald-500/20 dark:hover:border-emerald-500/40',
            iconStyle:
                'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400 ring-4 ring-emerald-500/5',
            valueStyle: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Late Check-ins',
            value: monthTotals.late,
            icon: Clock,
            bgGradient: 'from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/10',
            borderClass: 'border-amber-500/10 hover:border-amber-500/30 dark:border-amber-500/20 dark:hover:border-amber-500/40',
            iconStyle:
                'bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 ring-4 ring-amber-500/5',
            valueStyle: 'text-amber-600 dark:text-amber-400',
        },
        {
            label: 'Excused Absences',
            value: monthTotals.excused,
            icon: ShieldCheck,
            bgGradient: 'from-sky-500/5 to-cyan-500/5 dark:from-sky-500/10 dark:to-cyan-500/10',
            borderClass: 'border-sky-500/10 hover:border-sky-500/30 dark:border-sky-500/20 dark:hover:border-sky-500/40',
            iconStyle:
                'bg-sky-500/10 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400 ring-4 ring-sky-500/5',
            valueStyle: 'text-sky-600 dark:text-sky-400',
        },
        {
            label: 'Absent Days',
            value: monthTotals.absent,
            icon: UserX,
            bgGradient: 'from-rose-500/5 to-red-500/5 dark:from-rose-500/10 dark:to-red-500/10',
            borderClass: 'border-rose-500/10 hover:border-rose-500/30 dark:border-rose-500/20 dark:hover:border-rose-500/40',
            iconStyle:
                'bg-rose-500/10 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400 ring-4 ring-rose-500/5',
            valueStyle: 'text-rose-600 dark:text-rose-400',
        },
    ];

    if (!isAdviser) {
        return (
            <TeacherLayout>
                <Head title="SF2 Reports" />
                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center max-w-md mx-auto">
                    <div className="flex size-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400 shadow-inner ring-8 ring-amber-500/5">
                        <FileSpreadsheet className="size-8" aria-hidden />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl font-bold tracking-tight">
                            Access Restricted
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            SF2 reports are reserved for section advisers. You are not assigned as an adviser for the selected school year.
                        </p>
                    </div>
                </div>
            </TeacherLayout>
        );
    }

    return (
        <TeacherLayout>
            <Head title="SF2 Reports" />

            <div className="space-y-6 p-4 md:p-6 lg:p-8">
                {/* Top panel: title + filters + export */}
                <section className="relative overflow-hidden rounded-2xl border bg-card/60 backdrop-blur-md shadow-xs">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                    
                    <div className="flex flex-col gap-6 p-6 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 shadow-inner">
                                    <FileSpreadsheet
                                        className="size-5.5"
                                        aria-hidden
                                    />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text">
                                        SF2 Reports
                                    </h1>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        School Form 2 · Daily Attendance
                                    </p>
                                </div>
                            </div>
                            <p className="max-w-xl text-sm text-muted-foreground">
                                View, filter, and export the official monthly daily attendance log for your advisory learners.
                            </p>
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                                {sectionInfo && (
                                    <span className="inline-flex items-center rounded-lg border border-blue-500/20 bg-blue-500/8 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:text-blue-300">
                                        Grade {sectionInfo.gr_level} – {sectionInfo.sect_name}
                                    </span>
                                )}
                                {schoolYearLabel && (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg border bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                        <CalendarDays
                                            className="size-3.5 text-blue-500"
                                            aria-hidden
                                        />
                                        {schoolYearLabel}
                                    </span>
                                )}
                                <span className="inline-flex items-center rounded-lg bg-muted px-2.5 py-1 text-xs font-medium">
                                    {periodLabel}
                                </span>
                            </div>
                        </div>

                        {rows.length > 0 ? (
                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-xs transition-all hover:shadow-md cursor-pointer hover:opacity-95 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {isExporting ? (
                                        <>
                                            <Loader2 className="size-4 animate-spin" aria-hidden />
                                            <span>Exporting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="size-4" aria-hidden />
                                            <span>Export Excel</span>
                                        </>
                                    )}
                                </button>
                                {exportError && (
                                    <p className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                                        <AlertCircle className="size-3.5" aria-hidden />
                                        {exportError}
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>

                    <div className="grid gap-4 border-t bg-muted/20 p-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                School Year
                            </label>
                            <Select
                                value={syId}
                                onValueChange={(v) => {
                                    setSyId(v);
                                    navigate({ sy_id: v });
                                }}
                                disabled={schoolYears.length === 0}
                            >
                                <SelectTrigger className="h-10 w-full rounded-xl bg-background border-muted hover:bg-muted/10 transition-colors">
                                    <SelectValue placeholder="Select school year" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {schoolYears.map((sy) => (
                                        <SelectItem
                                            key={sy.sy_id}
                                            value={String(sy.sy_id)}
                                            className="rounded-lg"
                                        >
                                            {sy.sy_label}
                                            {sy.is_active ? ' (Active)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Report Month
                            </label>
                            <Select
                                value={month}
                                onValueChange={(v) => {
                                    setMonth(v);
                                    navigate({ month: v });
                                }}
                            >
                                <SelectTrigger className="h-10 w-full rounded-xl bg-background border-muted hover:bg-muted/10 transition-colors">
                                    <SelectValue placeholder="Month" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    {MONTHS.map((m, i) => (
                                        <SelectItem
                                            key={m}
                                            value={String(i + 1)}
                                            className="rounded-lg"
                                        >
                                            {m}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </section>

                {/* Summary cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {summaryCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <div
                                key={card.label}
                                className={`group flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md bg-gradient-to-br ${card.bgGradient} ${card.borderClass}`}
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {card.label}
                                    </span>
                                    <div
                                        className={`flex size-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${card.iconStyle}`}
                                    >
                                        <Icon className="size-4.5" aria-hidden />
                                    </div>
                                </div>
                                <div>
                                    <p
                                        className={`text-3xl font-extrabold tracking-tight tabular-nums ${card.valueStyle}`}
                                    >
                                        {card.value}
                                    </p>
                                    {card.description && (
                                        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                            {card.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Attendance grid */}
                <section className="overflow-hidden rounded-2xl border bg-card shadow-xs">
                    <div className="flex flex-col gap-4 border-b px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold tracking-tight uppercase">
                                Daily Attendance Grid
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {rows.length > 0
                                    ? `${rows.length} learner${rows.length === 1 ? '' : 's'} · ${daysInMonth} days in ${periodLabel}`
                                    : `No records for ${periodLabel}`}
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                            {LEGEND.map(({ abbr, label, cls }) => (
                                <span
                                    key={abbr}
                                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold ring-1 ${cls}`}
                                >
                                    <span className="font-bold">{abbr}</span>
                                    <span className="hidden opacity-90 sm:inline text-[11px]">
                                        {label}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground shadow-inner">
                                <Users className="size-6" aria-hidden />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold">
                                    No records found
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Try selecting another school year or report month.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent pb-1">
                            <table className="w-full min-w-max border-collapse text-sm select-none">
                                <thead>
                                    <tr className="border-b bg-muted/30">
                                        <th className="sticky left-0 z-20 min-w-10 border-r border-muted-foreground/10 bg-muted/60 px-2 py-3 text-center text-xs font-bold text-muted-foreground uppercase tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                            #
                                        </th>
                                        <th className="sticky left-10 z-20 min-w-48 border-r border-muted-foreground/10 bg-muted/60 px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider shadow-[2px_0_4px_rgba(0,0,0,0.03)]">
                                            Learner Name
                                        </th>
                                        <th className="min-w-32 border-r border-muted/20 px-3 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                            LRN
                                        </th>
                                        {dayNumbers.map((d) => {
                                            const weekend = isWeekendDay(
                                                selectedYear,
                                                selectedMonth,
                                                d,
                                            );
                                            return (
                                                <th
                                                    key={d}
                                                    className={`w-8 px-0.5 py-3 text-center text-[11px] font-bold border-r border-muted/20 last:border-r-0 ${
                                                        weekend
                                                            ? 'bg-muted/40 text-muted-foreground/35'
                                                            : 'text-muted-foreground/80'
                                                    }`}
                                                >
                                                    {d}
                                                </th>
                                            );
                                        })}
                                        <th className="w-11 border-l border-emerald-500/20 bg-emerald-500/[0.03] px-2 py-3 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                            P
                                        </th>
                                        <th className="w-11 bg-amber-500/[0.03] px-2 py-3 text-center text-xs font-bold text-amber-600 dark:text-amber-400">
                                            L
                                        </th>
                                        <th className="w-11 bg-sky-500/[0.03] px-2 py-3 text-center text-xs font-bold text-sky-600 dark:text-sky-400">
                                            E
                                        </th>
                                        <th className="w-11 bg-rose-500/[0.03] px-2 py-3 text-center text-xs font-bold text-rose-600 dark:text-rose-400">
                                            A
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* --- MALE LEARNERS --- */}
                                    {maleRows.length > 0 && (
                                        <>
                                            <tr className="border-b border-blue-500/20 bg-blue-500/[0.08] dark:bg-blue-500/[0.12]">
                                                <td
                                                    colSpan={daysInMonth + 7}
                                                    className="px-4 py-2 text-left text-xs font-black uppercase tracking-wider text-blue-700 dark:text-blue-300"
                                                >
                                                    MALE ({maleRows.length})
                                                </td>
                                            </tr>
                                            {maleRows.map((row, index) => (
                                                <tr
                                                    key={row.stu_id}
                                                    className="group/row border-b last:border-b-0 transition-colors hover:bg-blue-500/[0.03] dark:hover:bg-blue-500/[0.05]"
                                                >
                                                    <td className="sticky left-0 z-10 border-r border-muted-foreground/10 bg-card px-2 py-2.5 text-center text-xs text-muted-foreground font-semibold shadow-[1px_0_3px_rgba(0,0,0,0.03)] group-hover/row:bg-blue-500/[0.04] dark:group-hover/row:bg-blue-500/[0.06] transition-colors">
                                                        {index + 1}
                                                    </td>
                                                    <td className="sticky left-10 z-10 border-r border-muted-foreground/10 bg-card px-4 py-2.5 font-bold text-foreground/90 whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.03)] group-hover/row:bg-blue-500/[0.04] dark:group-hover/row:bg-blue-500/[0.06] transition-colors">
                                                        {row.name}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground/80 border-r border-muted/20">
                                                        {row.lrn ?? '—'}
                                                    </td>
                                                    {dayNumbers.map((d) => {
                                                        const weekend = isWeekendDay(
                                                            selectedYear,
                                                            selectedMonth,
                                                            d,
                                                        );
                                                        return (
                                                            <td
                                                                key={d}
                                                                className={`px-0.5 py-1.5 border-r border-muted/20 last:border-r-0 text-center relative align-middle ${
                                                                    weekend ? 'bg-muted/10' : ''
                                                                }`}
                                                                style={
                                                                    weekend
                                                                        ? {
                                                                              backgroundImage:
                                                                                  'repeating-linear-gradient(135deg, rgba(120, 120, 120, 0.08) 0px, rgba(120, 120, 120, 0.08) 1px, transparent 1px, transparent 6px)',
                                                                              backgroundSize: '6px 6px',
                                                                          }
                                                                        : undefined
                                                                }
                                                                title={
                                                                    row.days[d]
                                                                        ? String(row.days[d])
                                                                        : undefined
                                                                }
                                                            >
                                                                {statusCell(row.days[d] ?? null)}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-l border-emerald-500/20 bg-emerald-500/[0.01] px-2 py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shadow-inner group-hover/row:bg-emerald-500/5 transition-colors">
                                                        {row.totals.present}
                                                    </td>
                                                    <td className="bg-amber-500/[0.01] px-2 py-2 text-center text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums group-hover/row:bg-amber-500/5 transition-colors">
                                                        {row.totals.late}
                                                    </td>
                                                    <td className="bg-sky-500/[0.01] px-2 py-2 text-center text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums group-hover/row:bg-sky-500/5 transition-colors">
                                                        {row.totals.excused}
                                                    </td>
                                                    <td className="bg-rose-500/[0.01] px-2 py-2 text-center text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums group-hover/row:bg-rose-500/5 transition-colors">
                                                        {row.totals.absent}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Male Subtotal */}
                                            <tr className="border-y border-blue-500/20 bg-blue-500/[0.04] font-semibold">
                                                <td
                                                    colSpan={3}
                                                    className="sticky left-0 z-10 border-r border-blue-500/20 bg-blue-50/90 dark:bg-blue-950/90 px-4 py-2.5 text-xs font-bold text-blue-800 dark:text-blue-200"
                                                >
                                                    &lt;=== MALE | TOTAL Per Day ===&gt;
                                                </td>
                                                {dayNumbers.map((d) => {
                                                    const s = maleSummaryByDay?.[d];
                                                    const absent = s?.absent ?? 0;
                                                    const weekend = isWeekendDay(
                                                        selectedYear,
                                                        selectedMonth,
                                                        d,
                                                    );
                                                    return (
                                                        <td
                                                            key={d}
                                                            className={`px-0.5 py-2 text-center text-[10px] font-bold border-r border-muted/20 last:border-r-0 tabular-nums ${
                                                                weekend
                                                                    ? 'bg-muted/20 text-muted-foreground/30'
                                                                    : absent > 0
                                                                    ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                                                    : 'text-muted-foreground/35'
                                                            }`}
                                                        >
                                                            {weekend ? '' : absent > 0 ? absent : '—'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border-l border-emerald-500/20 bg-emerald-500/[0.04] px-2 py-2 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                                    {maleTotals.present}
                                                </td>
                                                <td className="bg-amber-500/[0.04] px-2 py-2 text-center text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                                                    {maleTotals.late}
                                                </td>
                                                <td className="bg-sky-500/[0.04] px-2 py-2 text-center text-xs font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                                                    {maleTotals.excused}
                                                </td>
                                                <td className="bg-rose-500/[0.04] px-2 py-2 text-center text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                                                    {maleTotals.absent}
                                                </td>
                                            </tr>
                                        </>
                                    )}

                                    {/* --- FEMALE LEARNERS --- */}
                                    {femaleRows.length > 0 && (
                                        <>
                                            <tr className="border-b border-rose-500/20 bg-rose-500/[0.08] dark:bg-rose-500/[0.12]">
                                                <td
                                                    colSpan={daysInMonth + 7}
                                                    className="px-4 py-2 text-left text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-300"
                                                >
                                                    FEMALE ({femaleRows.length})
                                                </td>
                                            </tr>
                                            {femaleRows.map((row, index) => (
                                                <tr
                                                    key={row.stu_id}
                                                    className="group/row border-b last:border-b-0 transition-colors hover:bg-rose-500/[0.03] dark:hover:bg-rose-500/[0.05]"
                                                >
                                                    <td className="sticky left-0 z-10 border-r border-muted-foreground/10 bg-card px-2 py-2.5 text-center text-xs text-muted-foreground font-semibold shadow-[1px_0_3px_rgba(0,0,0,0.03)] group-hover/row:bg-rose-500/[0.04] dark:group-hover/row:bg-rose-500/[0.06] transition-colors">
                                                        {index + 1}
                                                    </td>
                                                    <td className="sticky left-10 z-10 border-r border-muted-foreground/10 bg-card px-4 py-2.5 font-bold text-foreground/90 whitespace-nowrap shadow-[2px_0_4px_rgba(0,0,0,0.03)] group-hover/row:bg-rose-500/[0.04] dark:group-hover/row:bg-rose-500/[0.06] transition-colors">
                                                        {row.name}
                                                    </td>
                                                    <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-muted-foreground/80 border-r border-muted/20">
                                                        {row.lrn ?? '—'}
                                                    </td>
                                                    {dayNumbers.map((d) => {
                                                        const weekend = isWeekendDay(
                                                            selectedYear,
                                                            selectedMonth,
                                                            d,
                                                        );
                                                        return (
                                                            <td
                                                                key={d}
                                                                className={`px-0.5 py-1.5 border-r border-muted/20 last:border-r-0 text-center relative align-middle ${
                                                                    weekend ? 'bg-muted/10' : ''
                                                                }`}
                                                                style={
                                                                    weekend
                                                                        ? {
                                                                              backgroundImage:
                                                                                  'repeating-linear-gradient(135deg, rgba(120, 120, 120, 0.08) 0px, rgba(120, 120, 120, 0.08) 1px, transparent 1px, transparent 6px)',
                                                                              backgroundSize: '6px 6px',
                                                                          }
                                                                        : undefined
                                                                }
                                                                title={
                                                                    row.days[d]
                                                                        ? String(row.days[d])
                                                                        : undefined
                                                                }
                                                            >
                                                                {statusCell(row.days[d] ?? null)}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="border-l border-emerald-500/20 bg-emerald-500/[0.01] px-2 py-2 text-center text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums shadow-inner group-hover/row:bg-emerald-500/5 transition-colors">
                                                        {row.totals.present}
                                                    </td>
                                                    <td className="bg-amber-500/[0.01] px-2 py-2 text-center text-xs font-bold text-amber-600 dark:text-amber-400 tabular-nums group-hover/row:bg-amber-500/5 transition-colors">
                                                        {row.totals.late}
                                                    </td>
                                                    <td className="bg-sky-500/[0.01] px-2 py-2 text-center text-xs font-bold text-sky-600 dark:text-sky-400 tabular-nums group-hover/row:bg-sky-500/5 transition-colors">
                                                        {row.totals.excused}
                                                    </td>
                                                    <td className="bg-rose-500/[0.01] px-2 py-2 text-center text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums group-hover/row:bg-rose-500/5 transition-colors">
                                                        {row.totals.absent}
                                                    </td>
                                                </tr>
                                            ))}
                                            {/* Female Subtotal */}
                                            <tr className="border-y border-rose-500/20 bg-rose-500/[0.04] font-semibold">
                                                <td
                                                    colSpan={3}
                                                    className="sticky left-0 z-10 border-r border-rose-500/20 bg-rose-50/90 dark:bg-rose-950/90 px-4 py-2.5 text-xs font-bold text-rose-800 dark:text-rose-200"
                                                >
                                                    &lt;=== FEMALE | TOTAL Per Day ===&gt;
                                                </td>
                                                {dayNumbers.map((d) => {
                                                    const s = femaleSummaryByDay?.[d];
                                                    const absent = s?.absent ?? 0;
                                                    const weekend = isWeekendDay(
                                                        selectedYear,
                                                        selectedMonth,
                                                        d,
                                                    );
                                                    return (
                                                        <td
                                                            key={d}
                                                            className={`px-0.5 py-2 text-center text-[10px] font-bold border-r border-muted/20 last:border-r-0 tabular-nums ${
                                                                weekend
                                                                    ? 'bg-muted/20 text-muted-foreground/30'
                                                                    : absent > 0
                                                                    ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                                                                    : 'text-muted-foreground/35'
                                                            }`}
                                                        >
                                                            {weekend ? '' : absent > 0 ? absent : '—'}
                                                        </td>
                                                    );
                                                })}
                                                <td className="border-l border-emerald-500/20 bg-emerald-500/[0.04] px-2 py-2 text-center text-xs font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                                    {femaleTotals.present}
                                                </td>
                                                <td className="bg-amber-500/[0.04] px-2 py-2 text-center text-xs font-bold text-amber-700 dark:text-amber-300 tabular-nums">
                                                    {femaleTotals.late}
                                                </td>
                                                <td className="bg-sky-500/[0.04] px-2 py-2 text-center text-xs font-bold text-sky-700 dark:text-sky-300 tabular-nums">
                                                    {femaleTotals.excused}
                                                </td>
                                                <td className="bg-rose-500/[0.04] px-2 py-2 text-center text-xs font-bold text-rose-700 dark:text-rose-300 tabular-nums">
                                                    {femaleTotals.absent}
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t-2 border-muted-foreground/20 bg-muted/40 font-semibold select-none">
                                        <td
                                            colSpan={3}
                                            className="sticky left-0 z-10 border-r border-muted-foreground/10 bg-muted/90 px-4 py-3.5 text-xs font-bold text-foreground/80 tracking-wide uppercase shadow-[2px_0_4px_rgba(0,0,0,0.03)]"
                                        >
                                            Combined TOTAL Per Day
                                        </td>
                                        {dayNumbers.map((d) => {
                                            const s = summaryByDay[d];
                                            const total =
                                                (s?.present ?? 0) +
                                                (s?.late ?? 0) +
                                                (s?.excused ?? 0) +
                                                (s?.absent ?? 0);
                                            const weekend = isWeekendDay(
                                                selectedYear,
                                                selectedMonth,
                                                d,
                                            );

                                            return (
                                                <td
                                                    key={d}
                                                    className={`px-0.5 py-3 text-center text-[10px] font-bold border-r border-muted/20 last:border-r-0 tabular-nums ${
                                                        weekend
                                                            ? 'bg-muted/20 text-muted-foreground/30'
                                                            : total > 0
                                                            ? 'text-blue-600 dark:text-blue-400 font-extrabold bg-blue-500/5'
                                                            : 'text-muted-foreground/35'
                                                    }`}
                                                    style={
                                                        weekend
                                                            ? {
                                                                  backgroundImage:
                                                                      'repeating-linear-gradient(135deg, rgba(120, 120, 120, 0.05) 0px, rgba(120, 120, 120, 0.05) 1px, transparent 1px, transparent 6px)',
                                                                  backgroundSize: '6px 6px',
                                                              }
                                                            : undefined
                                                    }
                                                    title={
                                                        total > 0
                                                            ? `P:${s?.present} L:${s?.late} E:${s?.excused} A:${s?.absent}`
                                                            : undefined
                                                    }
                                                >
                                                    {total > 0 ? total : '—'}
                                                </td>
                                            );
                                        })}
                                        <td className="border-l border-emerald-500/20 bg-emerald-500/[0.06] px-2 py-3 text-center text-xs font-extrabold text-emerald-700 dark:text-emerald-300 tabular-nums">
                                            {monthTotals.present}
                                        </td>
                                        <td className="bg-amber-500/[0.06] px-2 py-3 text-center text-xs font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                                            {monthTotals.late}
                                        </td>
                                        <td className="bg-sky-500/[0.06] px-2 py-3 text-center text-xs font-extrabold text-sky-700 dark:text-sky-300 tabular-nums">
                                            {monthTotals.excused}
                                        </td>
                                        <td className="bg-rose-500/[0.06] px-2 py-3 text-center text-xs font-extrabold text-rose-700 dark:text-rose-300 tabular-nums">
                                            {monthTotals.absent}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </TeacherLayout>
    );
}
