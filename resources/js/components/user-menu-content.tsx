import { Link } from '@inertiajs/react';
import { LogOut, UserIcon } from 'lucide-react';
import { triggerLogout } from '@/components/LogoutOverlay';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { type User } from '@/types';

interface UserMenuContentProps {
    user: User;
    profileUrl: string;
}

export function UserMenuContent({ user, profileUrl }: UserMenuContentProps) {
    const cleanup = useMobileNavigation();

    const handleLogout = () => {
        cleanup(); // close mobile nav if open
        triggerLogout();
    };

    return (
        <>
            {/* User Info */}
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            {/* Profile Link */}
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link href={profileUrl} className="flex w-full cursor-pointer items-center">
                        <UserIcon className="mr-2 h-4 w-4" />
                        Profile
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            {/* Logout Button */}
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <button
                        className="flex w-full cursor-pointer items-center text-left text-red-600"
                        onClick={handleLogout}
                        data-test="logout-button"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                    </button>
                </DropdownMenuItem>
            </DropdownMenuGroup>
        </>
    );
}
