import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import FlashToast from '@/components/FlashToast';
import { IdleTimeoutModal } from '@/components/IdleTimeoutModal';
import { LogoutOverlay } from '@/components/LogoutOverlay';
import PageSkeleton, { type SkeletonVariant } from '@/components/PageSkeleton';
import { AdminSidebar } from '@/layouts/admin/admin-sidebar';
import { AdminTopBar } from '@/layouts/admin/admin-top-bar';
import type { BreadcrumbItem } from '@/types';

type Props = {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
};

function variantFromPath(pathname: string): SkeletonVariant {
    return pathname.includes('dashboard') ? 'dashboard' : 'table';
}

/**
 * Admin shell: fixed left sidebar (desktop), top bar with search and profile (upper right),
 * and scrollable main content — layout inspired by modern dashboard UIs.
 *
 * Full-page skeleton only appears when switching to a different page path.
 * Filter/query updates keep the current page visible (progress bar only).
 */
export default function AdminLayout({ children, breadcrumbs }: Props) {
    const [pageSwitching, setPageSwitching] = useState(false);
    const [variant, setVariant] = useState<SkeletonVariant>('table');
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        const stopStart = router.on('start', (event) => {
            const nextPath = event.detail.visit.url.pathname;
            const isPageSwitch = nextPath !== window.location.pathname;

            if (isPageSwitch) {
                setVariant(variantFromPath(nextPath));
                setPageSwitching(true);
            }
        });
        const stopFinish = router.on('finish', () => {
            setPageSwitching(false);
        });

        return () => {
            stopStart();
            stopFinish();
        };
    }, []);

    return (
        <div className="flex min-h-screen w-full bg-background">

            <AdminSidebar
                isCollapsed={isCollapsed}
                onExpandSidebar={() => setIsCollapsed(false)}
            />
            <div className="flex min-w-0 flex-1 flex-col">
                <AdminTopBar
                    breadcrumbs={breadcrumbs}
                    isCollapsed={isCollapsed}
                    onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
                />
                <main className="flex-1 overflow-auto">
                    {pageSwitching ? (
                        <PageSkeleton variant={variant} />
                    ) : (
                        children
                    )}
                </main>
            </div>
            <FlashToast />
            <LogoutOverlay />
            <IdleTimeoutModal />
        </div>
    );
}
