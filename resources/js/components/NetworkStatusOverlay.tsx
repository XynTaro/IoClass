import { router } from '@inertiajs/react';
import {
    AlertCircle,
    CheckCircle2,
    Loader2,
    RefreshCw,
    Wifi,
    WifiOff,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { cn } from '@/lib/utils';

interface ConnectionErrorDetail {
    message?: string;
    onRetry?: () => void;
}

export function NetworkStatusOverlay() {
    const { isOnline, wasOffline, isChecking, checkStatus } = useOnlineStatus();
    const [modalOpen, setModalOpen] = useState(false);
    const [customMessage, setCustomMessage] = useState<string | null>(null);
    const [retryCallback, setRetryCallback] = useState<(() => void) | null>(
        null,
    );

    // Listen for manual or intercepted connection error events
    useEffect(() => {
        const handleConnectionError = (
            event: CustomEvent<ConnectionErrorDetail>,
        ) => {
            setCustomMessage(event.detail?.message || null);
            if (event.detail?.onRetry) {
                setRetryCallback(() => event.detail.onRetry);
            }
            setModalOpen(true);
        };

        window.addEventListener(
            'app:connection-error',
            handleConnectionError as EventListener,
        );

        return () => {
            window.removeEventListener(
                'app:connection-error',
                handleConnectionError as EventListener,
            );
        };
    }, []);

    // If connection restores while modal is open, automatically close after a brief delay
    useEffect(() => {
        if (isOnline && modalOpen && !isChecking) {
            const timer = setTimeout(() => {
                setModalOpen(false);
                setCustomMessage(null);
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [isOnline, modalOpen, isChecking]);

    const handleRetry = async () => {
        const online = await checkStatus();
        if (online) {
            if (retryCallback) {
                retryCallback();
                setRetryCallback(null);
            } else {
                router.reload();
            }
            setModalOpen(false);
            setCustomMessage(null);
        }
    };

    const showFloatingBanner = !isOnline || wasOffline;

    return (
        <>
            {/* ── Floating Indicator Banner ─────────────────────────────── */}
            <aside
                aria-label="Network Status"
                aria-live="polite"
                className={cn(
                    'pointer-events-none fixed top-5 left-1/2 z-50 -translate-x-1/2 transform transition-all duration-300 ease-out',
                    showFloatingBanner
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none -translate-y-6 opacity-0',
                )}
            >
                <div
                    className={cn(
                        'pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2.5 text-xs font-medium shadow-xl backdrop-blur-md transition-colors duration-300 sm:text-sm',
                        !isOnline
                            ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 shadow-amber-500/10 dark:bg-amber-950/40 dark:text-amber-200'
                            : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 shadow-emerald-500/10 dark:bg-emerald-950/40 dark:text-emerald-200',
                    )}
                >
                    {!isOnline ? (
                        <>
                            <span className="relative flex size-2.5 shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                                <span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
                            </span>
                            <WifiOff className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                You are offline. Please check your connection.
                            </span>
                            <button
                                type="button"
                                onClick={() => checkStatus()}
                                disabled={isChecking}
                                className="ml-1 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-950 transition-colors hover:bg-amber-500/30 disabled:opacity-50 dark:text-amber-100"
                            >
                                {isChecking ? (
                                    <Loader2 className="size-3 animate-spin" />
                                ) : (
                                    <RefreshCw className="size-3" />
                                )}
                                Retry
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="relative flex size-2.5 shrink-0">
                                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                            </span>
                            <Wifi className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>Back online! Connection restored.</span>
                        </>
                    )}
                </div>
            </aside>

            {/* ── Connection Lost Action Dialog ─────────────────────────── */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
                            <WifiOff className="size-6" />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-lg font-semibold">
                                Connection Lost
                            </DialogTitle>
                            <DialogDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                                {customMessage ||
                                    "IoClass couldn't reach the server because your internet connection appears to be offline. Please check your network and try again."}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="flex items-center gap-2.5 rounded-xl border border-muted-foreground/15 bg-muted/40 p-3.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                        <span>
                            Your unsaved form inputs and current page have been
                            kept intact.
                        </span>
                    </div>

                    <DialogFooter className="mt-4 flex flex-row justify-end gap-2 sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setModalOpen(false)}
                            disabled={isChecking}
                        >
                            Stay on page
                        </Button>
                        <Button
                            type="button"
                            onClick={handleRetry}
                            disabled={isChecking}
                            className="bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700"
                        >
                            {isChecking ? (
                                <>
                                    <Loader2 className="mr-2 size-4 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 size-4" />
                                    Try Again
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
