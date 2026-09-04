import { AdminSidebarNav } from '@/layouts/admin/admin-sidebar-nav';
import { cn } from '@/lib/utils';

type AdminSidebarProps = {
    isCollapsed: boolean;
    onExpandSidebar: () => void;
};

export function AdminSidebar({ isCollapsed, onExpandSidebar }: AdminSidebarProps) {
    return (
        <aside
            className={cn(
                'hidden shrink-0 flex-col border-r border-border/60 bg-zinc-50/90 py-6 dark:bg-zinc-950/40 lg:flex transition-all duration-300 ease-in-out',
                isCollapsed ? 'w-[78px] px-3' : 'w-[260px] px-4',
            )}
        >
            <AdminSidebarNav isCollapsed={isCollapsed} onExpandSidebar={onExpandSidebar} />
        </aside>
    );
}
