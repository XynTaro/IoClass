import { Link, usePage } from '@inertiajs/react';
import { Fragment } from 'react';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

const LABEL_MAP: Record<string, string> = {
    admin: 'Admin',
    teacher: 'Teacher',
    dashboard: 'Dashboard',
    profile: 'Profile',
    schedule: 'Schedule',
    attendance: 'Attendance',
    verification: 'Verification',
    building: 'Buildings',
    room: 'Rooms',
    section: 'Sections',
    student: 'Students',
    students: 'Students',
    subject: 'Subjects',
    'school-year': 'School Year',
    'audit-trail': 'Audit Trail',
    'student-records': 'Student Records',
    'sf2-reports': 'SF2 Reports',
    rfid: 'RFID Registry',
    address: 'Addresses',
    'change-password': 'Change Password',
};

export function getFallbackBreadcrumbs(url: string): BreadcrumbItemType[] {
    const rawPath = url.split('?')[0].split('#')[0];
    const segments = rawPath.split('/').filter(Boolean);

    if (segments.length === 0) return [];

    const items: BreadcrumbItemType[] = [];
    let currentPath = '';

    segments.forEach((seg) => {
        currentPath += `/${seg}`;
        const key = seg.toLowerCase();
        let title = LABEL_MAP[key];

        if (!title) {
            if (/^\d+$/.test(seg)) {
                title = `#${seg}`;
            } else {
                title = seg
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase());
            }
        }

        let href = currentPath;

        if (key === 'admin') {
            href = '/admin/dashboard';
        } else if (key === 'teacher') {
            href = '/teacher/dashboard';
        }

        items.push({ title, href });
    });

    if (
        items.length === 1 &&
        (segments[0] === 'admin' || segments[0] === 'teacher')
    ) {
        items.push({
            title: 'Dashboard',
            href: `/${segments[0]}/dashboard`,
        });
    }

    return items;
}

export function Breadcrumbs({
    breadcrumbs,
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { url } = usePage();
    const items =
        breadcrumbs && breadcrumbs.length > 0
            ? breadcrumbs
            : getFallbackBreadcrumbs(url);

    return (
        <>
            {items.length > 0 && (
                <Breadcrumb>
                    <BreadcrumbList>
                        {items.map((item, index) => {
                            const isLast = index === items.length - 1;
                            return (
                                <Fragment key={index}>
                                    <BreadcrumbItem>
                                        {isLast ? (
                                            <BreadcrumbPage>
                                                {item.title}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink asChild>
                                                <Link href={item.href}>
                                                    {item.title}
                                                </Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                    {!isLast && <BreadcrumbSeparator />}
                                </Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            )}
        </>
    );
}
