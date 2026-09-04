import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    BookOpen,
    CalendarCheck,
    CalendarDays,
    ChevronDown,
    ClipboardCheck,
    ClipboardList,
    LayoutDashboard,
    UserCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import teacher from '@/routes/teacher';
import teacherSchedule from '@/routes/teacher/schedule/index';
import sf2Reports from '@/routes/teacher/sf2-reports';
import studentRecords from '@/routes/teacher/student-records';

type NavLinkProps = {
    href: string;
    icon: LucideIcon;
    label: string;
    isCollapsed?: boolean;
};

function NavLink({ href, icon: Icon, label, isCollapsed }: NavLinkProps) {
    const { isCurrentUrl } = useCurrentUrl();
    const active = href !== '#' && isCurrentUrl(href);

    return (
        <Link
            href={href}
            title={isCollapsed ? label : undefined}
            className={cn(
                'group relative flex items-center rounded-xl py-2.5 text-sm font-medium transition-all duration-300',
                active
                    ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100'
                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                isCollapsed ? 'lg:px-[17px] lg:gap-0' : 'px-3 gap-3'
            )}
        >
            {active && (
                <span
                    className={cn(
                        "absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-300",
                        isCollapsed && "lg:left-[3px]"
                    )}
                    aria-hidden
                />
            )}

            <Icon
                className={cn(
                    'size-5 shrink-0 transition-colors',
                    active
                        ? 'text-blue-600'
                        : 'text-muted-foreground group-hover:text-foreground',
                )}
            />

            <span className={cn(
                "flex-1 truncate transition-all duration-300 ease-in-out",
                isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-[200px] opacity-100"
            )}>
                {label}
            </span>
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

const studentManagementItems = [
    { href: teacher.students.index.url(), label: 'My Students' },
    { href: studentRecords.index.url(), label: 'Student Records' },
];

type TeacherSidebarNavProps = {
    isCollapsed?: boolean;
    onExpandSidebar?: () => void;
};

export function TeacherSidebarNav({ isCollapsed = false, onExpandSidebar }: TeacherSidebarNavProps) {
    const { isCurrentUrl } = useCurrentUrl();

    const isStudentManagementActive = studentManagementItems.some(
        (item) => item.href !== '#' && isCurrentUrl(item.href),
    );

    const [openStudentManagement, setOpenStudentManagement] = useState(
        isStudentManagementActive,
    );

    useEffect(() => {
        if (isStudentManagementActive) {
            setOpenStudentManagement(true);
        }
    }, [isStudentManagementActive]);


    return (
        <div className="flex h-full flex-col gap-6">
            {/* Logo */}
            <Link
                href={teacher.dashboard.url()}
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
                <NavSection title="Menu" isCollapsed={isCollapsed}>
                    <NavLink
                        href={teacher.dashboard.url()}
                        icon={LayoutDashboard}
                        label="Dashboard"
                        isCollapsed={isCollapsed}
                    />
                    <NavLink
                        href={teacher.attendance.index.url()}
                        icon={UserCheck}
                        label="Attendance"
                        isCollapsed={isCollapsed}
                    />
                    <NavLink
                        href={route('teacher.my-attendance.index')}
                        icon={CalendarCheck}
                        label="My Attendance"
                        isCollapsed={isCollapsed}
                    />
                    <NavLink
                        href={teacher.verification.index.url()}
                        icon={ClipboardCheck}
                        label="Subject Verification"
                        isCollapsed={isCollapsed}
                    />
                    <NavLink
                        href={teacherSchedule.index.url()}
                        icon={CalendarDays}
                        label="My Schedule"
                        isCollapsed={isCollapsed}
                    />
                    
                    {/* Student Management Accordion */}
                    <div className="space-y-1 rounded-2xl bg-muted/40 py-1">
                        <button
                            type="button"
                            title={isCollapsed ? "Student Management" : undefined}
                            onClick={() => {
                                if (isCollapsed) {
                                    onExpandSidebar?.();
                                    setOpenStudentManagement(true);
                                } else {
                                    setOpenStudentManagement(!openStudentManagement);
                                }
                            }}
                            className={cn(
                                'group relative flex w-full items-center justify-between rounded-xl py-2.5 text-sm font-medium transition-all duration-300',
                                isStudentManagementActive
                                    ? 'bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-100'
                                    : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground',
                                isCollapsed ? 'lg:px-[17px] lg:gap-0' : 'px-3 gap-3'
                            )}
                        >
                            {isStudentManagementActive && (
                                <span
                                    className={cn(
                                        "absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-full bg-blue-600 transition-all duration-300",
                                        isCollapsed && "lg:left-[3px]"
                                    )}
                                    aria-hidden
                                />
                            )}
                            <div className={cn("flex items-center transition-all duration-300", isCollapsed ? 'lg:gap-0' : 'gap-3')}>
                                <ClipboardList
                                    className={cn(
                                        'size-5 shrink-0 transition-colors',
                                        isStudentManagementActive
                                            ? 'text-blue-600'
                                            : 'text-muted-foreground group-hover:text-foreground',
                                    )}
                                />
                                <span className={cn(
                                    "transition-all duration-300 truncate",
                                    isCollapsed ? "lg:max-w-0 lg:opacity-0 lg:overflow-hidden" : "max-w-[200px] opacity-100"
                                )}>
                                    Student Management
                                </span>
                            </div>

                            <ChevronDown
                                className={cn(
                                    'size-4 transition-all duration-300',
                                    openStudentManagement && 'rotate-180',
                                    isCollapsed ? 'lg:max-w-0 lg:opacity-0 lg:overflow-hidden' : 'max-w-[20px] opacity-100'
                                )}
                            />
                        </button>

                        {openStudentManagement && !isCollapsed && (
                            <div className="ml-8 space-y-1">
                                {studentManagementItems.map(({ href, label }) => (
                                    <Link
                                        key={label}
                                        href={href}
                                        className={cn(
                                            'block rounded-lg px-3 py-2 text-sm transition-colors',
                                            href !== '#' && isCurrentUrl(href)
                                                ? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'
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
                        href={sf2Reports.index.url()}
                        icon={BookOpen}
                        label="SF2 Reports"
                        isCollapsed={isCollapsed}
                    />
                </NavSection>
            </nav>
        </div>
    );
}
