import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    BookOpen,
    CalendarDays,
    ChevronDown,
    CircleHelp,
    History,
    LayoutDashboard,
    ListTodo,
    Calendar,
    Users,
    UserCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';


import { route } from 'ziggy-js';
import { Badge } from '@/components/ui/badge';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import admin from '@/routes/admin';

type NavLinkProps = {
    href: string;
    icon: LucideIcon;
    label: string;
    badge?: string;
    isCollapsed?: boolean;
};

function NavLink({ href, icon: Icon, label, badge, isCollapsed }: NavLinkProps) {
    const { isCurrentUrl } = useCurrentUrl();

    const active = href !== '#' && isCurrentUrl(href);

    return (
        <Link
            href={href}
            title={isCollapsed ? label : undefined}
            className={cn(
                'group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-300',
                active
                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                isCollapsed ? 'lg:px-[17px] lg:gap-0' : 'px-3 gap-3'
            )}
        >
            {active && (
                <span
                    className={cn(
                        "absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-full bg-emerald-600 transition-all duration-300",
                        isCollapsed && "lg:left-[3px]"
                    )}
                    aria-hidden
                />
            )}

            <Icon
                className={cn(
                    'size-5 shrink-0 transition-colors',
                    active
                        ? 'text-emerald-600'
                        : 'text-muted-foreground group-hover:text-foreground',
                )}
            />

            <span className={cn(
                "flex-1 truncate transition-all duration-300 ease-in-out",
                isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-[200px] opacity-100"
            )}>
                {label}
            </span>

            {badge && !isCollapsed ? (
                <Badge className="h-5 min-w-5 border-0 bg-emerald-600 px-1.5 text-[10px] font-semibold text-white hover:bg-emerald-600">
                    {badge}
                </Badge>
            ) : null}
        </Link>
    );
}

type SectionProps = {
    title: string;
    children: ReactNode;
    isCollapsed?: boolean;
};

function NavSection({ title, children, isCollapsed }: SectionProps) {
    return (
        <div className="space-y-1">
            <p className={cn(
                "px-3 pb-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase transition-all duration-300",
                isCollapsed ? 'lg:opacity-0 lg:h-0 lg:pb-0 lg:overflow-hidden' : 'lg:opacity-100'
            )}>
                {title}
            </p>

            <div className="space-y-0.5">{children}</div>
        </div>
    );
}

type AdminSidebarNavProps = {
    isCollapsed?: boolean;
    onExpandSidebar?: () => void;
};

export function AdminSidebarNav({ isCollapsed = false, onExpandSidebar }: AdminSidebarNavProps) {
    const { isCurrentUrl } = useCurrentUrl();

    const adminHref = route('admin.admin.index');
    const teacherHref = route('admin.teacher.index');
    const teacherAttendanceHref = route('admin.teacher-attendance.index');
    const studentHref = route('admin.student.index');
    const subjectHref = route('admin.subject.index');
    const roomHref = route('admin.room.index');
    const buildingHref = route('admin.building.index');
    const sectionHref = route('admin.section.index');
    const schoolYearHref = route('admin.school-year.index');
    const scheduleHref = route('admin.schedule.index');
    const calendarHref = route('admin.calendar.index');
    const auditTrailHref = route('admin.audit-trail.index');

    const isUserMgmtActive = [
        adminHref,
        teacherHref,
        studentHref,
    ].some((h) => isCurrentUrl(h));
    const isClassMgmtActive = [
        subjectHref,
        buildingHref,
        roomHref,
        sectionHref,
        schoolYearHref,
    ].some((h) => isCurrentUrl(h));

    const [openUserManagement, setOpenUserManagement] =
        useState(isUserMgmtActive);
    const [openClassManagement, setOpenClassManagement] =
        useState(isClassMgmtActive);

    useEffect(() => {
        if (isUserMgmtActive) setOpenUserManagement(true);
    }, [isUserMgmtActive]);

    useEffect(() => {
        if (isClassMgmtActive) setOpenClassManagement(true);
    }, [isClassMgmtActive]);


    return (
        <div className="flex h-full flex-col gap-6">
            {/* Logo */}
            <Link
                href={admin.dashboard.url()}
                className={cn(
                    "flex items-center transition-all duration-300 hover:opacity-90",
                    isCollapsed ? "lg:px-[7px] lg:gap-0" : "px-1 gap-2.5"
                )}
            >
                <img
                    src="/puro.jpg"
                    alt="Puro National High School"
                    className="size-10 rounded-full object-cover shadow-sm shrink-0"
                />

                <span className={cn(
                    "text-lg font-bold tracking-tight text-foreground transition-all duration-300 truncate",
                    isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-[150px] opacity-100"
                )}>
                    IoClass
                </span>
            </Link>

            {/* Navigation */}
            <nav className="flex flex-1 flex-col gap-6 overflow-y-auto">
                {/* MENU */}
                <NavSection title="Menu" isCollapsed={isCollapsed}>
                    <NavLink
                        href={admin.dashboard.url()}
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isCollapsed={isCollapsed}
                    />

                    <NavLink
                        href={teacherAttendanceHref}
                        icon={UserCheck}
                        label="Teacher Attendance"
                        isCollapsed={isCollapsed}
                    />

                    {/* USER MANAGEMENT GROUP */}
                    <div className="space-y-1 rounded-2xl bg-muted/40 py-1">
                        {/* Parent */}
                        <button
                            type="button"
                            title={isCollapsed ? "User Management" : undefined}
                            onClick={() => {
                                if (isCollapsed) {
                                    onExpandSidebar?.();
                                    setOpenUserManagement(true);
                                } else {
                                    setOpenUserManagement(!openUserManagement);
                                }
                            }}
                            className={cn(
                                'group relative flex w-full items-center justify-between rounded-xl py-2.5 text-sm font-medium transition-all duration-300',
                                isUserMgmtActive
                                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                                isCollapsed ? 'lg:px-[17px] lg:gap-0' : 'px-3 gap-3'
                            )}
                        >
                            {isUserMgmtActive && (
                                <span
                                    className={cn(
                                        "absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-full bg-emerald-600 transition-all duration-300",
                                        isCollapsed && "lg:left-[3px]"
                                    )}
                                    aria-hidden
                                />
                            )}
                            <div className={cn("flex items-center transition-all duration-300", isCollapsed ? 'lg:gap-0' : 'gap-3')}>
                                <ListTodo
                                    className={cn(
                                        'size-5 shrink-0 transition-colors',
                                        isUserMgmtActive
                                            ? 'text-emerald-600'
                                            : 'text-muted-foreground group-hover:text-foreground',
                                    )}
                                />
                                <span className={cn(
                                    "transition-all duration-300 truncate",
                                    isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-[200px] opacity-100"
                                )}>
                                    User Management
                                </span>
                            </div>

                            <ChevronDown
                                className={cn(
                                    'size-4 transition-all duration-300',
                                    openUserManagement && 'rotate-180',
                                    isCollapsed ? 'lg:max-w-0 lg:opacity-0 lg:overflow-hidden' : 'max-w-[20px] opacity-100'
                                )}
                            />
                        </button>

                        {/* Submenu */}
                        {openUserManagement && !isCollapsed && (
                            <div className="ml-8 space-y-1">
                                {[
                                    { href: adminHref, label: 'Admins' },
                                    { href: teacherHref, label: 'Teachers' },
                                    { href: studentHref, label: 'Students' },
                                ].map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={cn(
                                            'block rounded-lg px-3 py-2 text-sm transition-colors',
                                            isCurrentUrl(href)
                                                ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* CLASS MANAGEMENT GROUP */}
                    <div className="space-y-1 rounded-2xl bg-muted/40 py-1">
                        <button
                            type="button"
                            title={isCollapsed ? "Class Management" : undefined}
                            onClick={() => {
                                if (isCollapsed) {
                                    onExpandSidebar?.();
                                    setOpenClassManagement(true);
                                } else {
                                    setOpenClassManagement(!openClassManagement);
                                }
                            }}
                            className={cn(
                                'group relative flex w-full items-center justify-between rounded-xl py-2.5 text-sm font-medium transition-all duration-300',
                                isClassMgmtActive
                                    ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                                isCollapsed ? 'lg:px-[17px] lg:gap-0' : 'px-3 gap-3'
                            )}
                        >
                            {isClassMgmtActive && (
                                <span
                                    className={cn(
                                        "absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-full bg-emerald-600 transition-all duration-300",
                                        isCollapsed && "lg:left-[3px]"
                                    )}
                                    aria-hidden
                                />
                            )}
                            <div className={cn("flex items-center transition-all duration-300", isCollapsed ? 'lg:gap-0' : 'gap-3')}>
                                <BookOpen
                                    className={cn(
                                        'size-5 shrink-0 transition-colors',
                                        isClassMgmtActive
                                            ? 'text-emerald-600'
                                            : 'text-muted-foreground group-hover:text-foreground',
                                    )}
                                />
                                <span className={cn(
                                    "transition-all duration-300 truncate",
                                    isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-[200px] opacity-100"
                                )}>
                                    Class Management
                                </span>
                            </div>
                            <ChevronDown
                                className={cn(
                                    'size-4 transition-all duration-300',
                                    openClassManagement && 'rotate-180',
                                    isCollapsed ? 'lg:max-w-0 lg:opacity-0 lg:overflow-hidden' : 'max-w-[20px] opacity-100'
                                )}
                            />
                        </button>

                        {openClassManagement && !isCollapsed && (
                            <div className="ml-8 space-y-1">
                                {[
                                    { href: sectionHref, label: 'Section' },
                                    { href: buildingHref, label: 'Building' },
                                    { href: roomHref, label: 'Room' },
                                    { href: subjectHref, label: 'Subject' },
                                    {
                                        href: schoolYearHref,
                                        label: 'School Year',
                                    },
                                ].map(({ href, label }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={cn(
                                            'block rounded-lg px-3 py-2 text-sm transition-colors',
                                            isCurrentUrl(href)
                                                ? 'bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                        )}
                                    >
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <NavLink
                        href={scheduleHref}
                        icon={Calendar}
                        label="Schedule Management"
                        isCollapsed={isCollapsed}
                    />

                    <NavLink
                        href={calendarHref}
                        icon={CalendarDays}
                        label="Academic Calendar"
                        isCollapsed={isCollapsed}
                    />

                    <NavLink
                        href={auditTrailHref}
                        icon={History}
                        label="Audit Trail"
                        isCollapsed={isCollapsed}
                    />
                </NavSection>
            </nav>
        </div>
    );
}
