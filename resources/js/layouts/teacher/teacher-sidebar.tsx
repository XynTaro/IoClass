import { TeacherSidebarNav } from '@/layouts/teacher/teacher-sidebar-nav';
import { cn } from '@/lib/utils';

type TeacherSidebarProps = {
    isCollapsed: boolean;
    onExpandSidebar: () => void;
};

export function TeacherSidebar({ isCollapsed, onExpandSidebar }: TeacherSidebarProps) {
    return (
        <aside
            className={cn(
                'hidden shrink-0 flex-col border-r border-border/60 bg-zinc-50/90 py-6 dark:bg-zinc-950/40 lg:flex transition-all duration-300 ease-in-out',
                isCollapsed ? 'w-[78px] px-3' : 'w-[260px] px-4',
            )}
        >
            <TeacherSidebarNav isCollapsed={isCollapsed} onExpandSidebar={onExpandSidebar} />
        </aside>
    );
}
