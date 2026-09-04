/* ─────────────────────────────────────────────────────────────────────────
   PageSkeleton — pixel-faithful loading skeleton for every admin page.

   Shimmer uses a ::after pseudo-element with a white rgba gradient so it
   works identically in light and dark mode without reading CSS variables.
   ───────────────────────────────────────────────────────────────────────── */

const SkeletonCSS = () => (
    <style>{`
        @keyframes sk-sweep {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX( 100%); }
        }
        @keyframes sk-row-in {
            from { opacity: 0; transform: translateY(5px); }
            to   { opacity: 1; transform: translateY(0);   }
        }

        /* Every shimmer bar */
        .sk-bar {
            position: relative;
            overflow: hidden;
            background-color: var(--color-muted);
            flex-shrink: 0;
        }
        .sk-bar::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(
                90deg,
                transparent       0%,
                rgba(255,255,255,.18) 50%,
                transparent     100%
            );
            animation: sk-sweep 1.5s ease-in-out infinite;
        }

        /* Pill badge */
        .sk-pill {
            position: relative;
            overflow: hidden;
            background-color: var(--color-muted);
            border-radius: 9999px;
            flex-shrink: 0;
        }
        .sk-pill::after {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(
                90deg,
                transparent       0%,
                rgba(255,255,255,.18) 50%,
                transparent     100%
            );
            animation: sk-sweep 1.5s ease-in-out infinite;
        }

        /* Row entrance */
        .sk-row {
            animation: sk-row-in 0.25s ease both;
        }
    `}</style>
);

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function Bar({
    w,
    h = 13,
    r = 6,
    className = '',
}: {
    w: number | string;
    h?: number;
    r?: number;
    className?: string;
}) {
    return (
        <div
            className={`sk-bar ${className}`}
            style={{ width: w, height: h, borderRadius: r }}
        />
    );
}

function Pill({ w = 58, h = 20 }: { w?: number; h?: number }) {
    return <div className="sk-pill" style={{ width: w, height: h }} />;
}

function BtnBox({ w = 30, h = 30 }: { w?: number; h?: number }) {
    return (
        <div
            className="sk-bar"
            style={{ width: w, height: h, borderRadius: 6 }}
        />
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   TABLE SKELETON
   Matches DataTable exactly:
     page   → space-y-4 py-3
     header → flex px-5
     search → ml-5 px-5 pb-3
     table  → px-5 > DataTable(p-5) > div.overflow-hidden.rounded-md.border > <table>
   ───────────────────────────────────────────────────────────────────────── */

/* Header-bar widths for the 9 columns of a typical list page */
const HEADER_WIDTHS = [28, 68, 80, 68, 40, 56, 28, 44, 56] as const;

/* Per-row column content widths — first col (LRN/code) fixed, names vary */
const ROW_CONFIGS = [
    [80, 108, 72, 96,  44, 60, 80],
    [80,  92, 80, 80,  48, 56, 80],
    [80, 120, 68, 104, 40, 64, 80],
    [80, 100, 76, 88,  52, 60, 80],
    [80,  88, 84, 92,  44, 68, 80],
    [80, 112, 70, 100, 48, 52, 80],
    [80,  96, 78, 84,  40, 64, 80],
    [80, 104, 74, 96,  52, 58, 80],
] as const;

function TablePageSkeleton() {
    return (
        <div className="space-y-4 py-3">
            <SkeletonCSS />

            {/* ── Page header ── */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5">
                <Bar w={220} h={28} r={8} />
                <div className="flex items-center gap-2">
                    <Bar w={120} h={36} r={8} />
                    <Bar w={130} h={36} r={8} />
                </div>
            </div>

            {/* ── Search bar ── */}
            <div className="ml-5 px-5 pb-3">
                <Bar w={280} h={36} r={8} />
            </div>

            {/* ── DataTable ── */}
            <div className="px-5">
                <div className="p-5">
                    <div className="overflow-hidden rounded-md border">
                        <table className="w-full caption-bottom text-sm">
                            {/* thead — bg-muted/70 */}
                            <thead className="bg-muted/70 border-b">
                                <tr>
                                    {HEADER_WIDTHS.map((w, i) => (
                                        <th
                                            key={i}
                                            className="h-10 px-2 text-left align-middle"
                                        >
                                            <Bar w={w} h={11} r={4} />
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* tbody */}
                            <tbody>
                                {ROW_CONFIGS.map((cols, rowIdx) => (
                                    <tr
                                        key={rowIdx}
                                        className="sk-row border-b last:border-0"
                                        style={{
                                            animationDelay: `${rowIdx * 45}ms`,
                                            opacity: Math.max(
                                                0.3,
                                                1 - rowIdx * 0.09,
                                            ),
                                        }}
                                    >
                                        {cols.map((w, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className="p-2 align-middle"
                                            >
                                                <Bar w={w} h={13} />
                                            </td>
                                        ))}
                                        {/* Status badge */}
                                        <td className="p-2 align-middle">
                                            <Pill w={56} h={20} />
                                        </td>
                                        {/* Actions */}
                                        <td className="p-2 align-middle">
                                            <div className="flex gap-1.5">
                                                <BtnBox />
                                                <BtnBox />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ── Pagination ── */}
            <div className="mr-10 flex items-center justify-end gap-1.5 py-2">
                {[36, 32, 44, 32, 36].map((w, i) => (
                    <Bar key={i} w={w} h={28} r={6} />
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────────────────
   DASHBOARD SKELETON
   Mirrors Dashboard.tsx layout:
     header  → title + two buttons
     cards   → 4 stat cards (sm:2 xl:4)
     bottom  → Activity card (chart area) + Quick-actions card (4 buttons)
   ───────────────────────────────────────────────────────────────────────── */

function StatCard({ delay }: { delay: number }) {
    return (
        <div
            className="sk-row rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Label */}
            <Bar w={96} h={12} r={4} />
            {/* Big number */}
            <div className="mt-3">
                <Bar w={60} h={36} r={8} />
            </div>
            {/* Sub-text */}
            <div className="mt-3">
                <Bar w={160} h={11} r={4} />
            </div>
        </div>
    );
}

function DashboardPageSkeleton() {
    return (
        <div className="space-y-6 p-4 md:p-6 lg:p-8">
            <SkeletonCSS />

            {/* ── Page header ── */}
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="space-y-2">
                    <Bar w={160} h={30} r={8} />
                    <Bar w={260} h={14} r={4} />
                </div>
                <div className="flex gap-2">
                    <Bar w={132} h={36} r={10} />
                    <Bar w={120} h={36} r={10} />
                </div>
            </div>

            {/* ── Stat cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[80, 140, 200, 260].map((delay, i) => (
                    <StatCard key={i} delay={delay} />
                ))}
            </div>

            {/* ── Bottom cards ── */}
            <div className="grid gap-4 lg:grid-cols-2">
                {/* Activity / chart card */}
                <div
                    className="sk-row overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                    style={{ animationDelay: '340ms' }}
                >
                    <div className="space-y-2 p-5 pb-3">
                        <Bar w={72} h={16} r={5} />
                        <Bar w={180} h={12} r={4} />
                    </div>
                    <div className="p-5 pt-2">
                        <div
                            className="sk-bar w-full rounded-xl"
                            style={{ height: 200, borderRadius: 12 }}
                        />
                    </div>
                </div>

                {/* Quick-actions card — 4 button placeholders */}
                <div
                    className="sk-row overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
                    style={{ animationDelay: '420ms' }}
                >
                    <div className="space-y-2 p-5 pb-3">
                        <Bar w={104} h={16} r={5} />
                        <Bar w={210} h={12} r={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-5 pt-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="sk-bar rounded-xl"
                                style={{ height: 64, borderRadius: 12 }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ─── Public export ──────────────────────────────────────────────────────── */
export type SkeletonVariant = 'table' | 'dashboard';

export default function PageSkeleton({
    variant = 'table',
}: {
    variant?: SkeletonVariant;
}) {
    return variant === 'dashboard' ? (
        <DashboardPageSkeleton />
    ) : (
        <TablePageSkeleton />
    );
}
