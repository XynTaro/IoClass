import { Link, usePage } from '@inertiajs/react';
import { Bell, Mail, Menu, Search } from 'lucide-react';
import { useState } from 'react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { UserMenuContent } from '@/components/user-menu-content';
import { useInitials } from '@/hooks/use-initials';
import { AdminSidebarNav } from '@/layouts/admin/admin-sidebar-nav';
import admin from '@/routes/admin';
import type { BreadcrumbItem, SharedData } from '@/types';

type AdminTopBarProps = {
    breadcrumbs?: BreadcrumbItem[];
    isCollapsed: boolean;
    onToggleSidebar: () => void;
};

export function AdminTopBar({
    breadcrumbs = [],
    isCollapsed,
    onToggleSidebar,
}: AdminTopBarProps) {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <header className="sticky top-0 z-30 flex h-[64px] shrink-0 items-center gap-3 border-b border-border/60 bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80 md:gap-4 md:px-6">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 lg:hidden"
                        aria-label="Open menu"
                    >
                        <Menu className="size-5" />
                    </Button>
                </SheetTrigger>
                <SheetContent
                    side="left"
                    className="flex w-[280px] flex-col border-r bg-zinc-50 p-6 dark:bg-zinc-950"
                >
                    <SheetHeader className="sr-only">
                        <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <AdminSidebarNav isCollapsed={false} />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar Toggle Button */}
            <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSidebar}
                className="hidden shrink-0 size-9 rounded-xl hover:bg-muted/80 transition-all duration-200 lg:flex"
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                <Menu className="size-5 text-muted-foreground transition-all duration-200 hover:text-foreground active:scale-95" />
            </Button>

            <div className="flex items-center gap-2">
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-1 md:gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            className="h-auto gap-2 rounded-xl px-2 py-1.5 hover:bg-muted/80"
                        >
                            <Avatar className="size-9 border border-border/80">
                                <AvatarImage
                                    src={auth.user?.avatar}
                                    alt={auth.user?.name || 'User'}
                                />

                                <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
                                    {getInitials(auth.user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="hidden min-w-0 flex-col items-start text-left md:flex">
                                <span className="max-w-[140px] truncate text-sm leading-tight font-semibold">
                                    {auth.user.name}
                                </span>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    Admin
                                </span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end">
                        <UserMenuContent user={auth.user} profileUrl={admin.profile.show.url()} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
