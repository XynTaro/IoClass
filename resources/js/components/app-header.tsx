'use client';

import { SendIcon, BellIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { CustomSidebarTrigger } from '@/components/custom-sidebar-trigger';
import { NavUser } from '@/components/nav-user';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

export function AppHeader({ breadcrumbs }: { breadcrumbs?: BreadcrumbItem[] }) {
    return (
        <header
            className={cn(
                'sticky top-0 z-50 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 md:px-6',
            )}
        >
            <div className="flex items-center gap-3">
                <CustomSidebarTrigger />
                <Separator
                    className="mr-2 h-4 data-[orientation=vertical]:self-center"
                    orientation="vertical"
                />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="flex items-center gap-3">
                <Button size="icon-sm" variant="outline">
                    <SendIcon />
                </Button>
                <Button
                    aria-label="Notifications"
                    size="icon-sm"
                    variant="outline"
                >
                    <BellIcon />
                </Button>
                <Separator
                    className="h-4 data-[orientation=vertical]:self-center"
                    orientation="vertical"
                />
                <NavUser />
            </div>
        </header>
    );
}
