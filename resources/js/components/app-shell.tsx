import { SidebarProvider } from '@/components/ui/sidebar';

export function AppShell({
    children,
    variant = 'header',
}: {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}) {
    if (variant === 'sidebar') {
        return (
            <SidebarProvider className="relative h-svh">
                {children}
            </SidebarProvider>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-background">
            {children}
        </div>
    );
}
