import { router } from '@inertiajs/react';
import { Loader2, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function triggerLogout() {
    window.dispatchEvent(new CustomEvent('app:logout-start'));
}

export function LogoutOverlay() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const handleStart = () => {
            setOpen(true);
            setLoading(false);
        };

        window.addEventListener('app:logout-start', handleStart);
        return () => window.removeEventListener('app:logout-start', handleStart);
    }, []);

    const handleConfirmLogout = () => {
        setLoading(true);
        sessionStorage.setItem('is_logged_out', 'true');

        router.post(
            route('logout'),
            {},
            {
                replace: true,
                onSuccess: () => {
                    window.location.replace(route('login'));
                },
                onError: () => {
                    setLoading(false);
                    setOpen(false);
                    sessionStorage.removeItem('is_logged_out');
                },
            },
        );
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !loading && setOpen(val)}>
            <DialogContent className="max-w-md p-6">
                <DialogHeader className="flex flex-row items-center gap-3 space-y-0 text-left">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400">
                        <LogOut className="size-5" />
                    </div>
                    <div>
                        <DialogTitle className="text-lg font-semibold">Confirm Logout</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Are you sure you want to log out of your IoClass account?
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleConfirmLogout}
                        disabled={loading}
                        className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Logging out...
                            </>
                        ) : (
                            'Logout'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
