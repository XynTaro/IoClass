import { AlertTriangle, Clock, Loader2, LogOut, ShieldAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useIdleTimeout } from '@/hooks/use-idle-timeout';
import { cn } from '@/lib/utils';

export interface IdleTimeoutModalProps {
    /** Override total timeout in milliseconds (default: 30 minutes) */
    timeoutMs?: number;
    /** Override warning countdown in milliseconds (default: 5 minutes) */
    warningMs?: number;
    /** Whether idle tracking is enabled */
    enabled?: boolean;
}

function formatTime(totalSeconds: number): string {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function IdleTimeoutModal({
    timeoutMs,
    warningMs,
    enabled = true,
}: IdleTimeoutModalProps) {
    const {
        isWarning,
        remainingSeconds,
        totalWarningSeconds,
        percentRemaining,
        idleMinutesBeforeWarning,
        isLoggingOut,
        isRefreshing,
        stayLoggedIn,
        logoutNow,
    } = useIdleTimeout({
        timeoutMs,
        warningMs,
        enabled,
    });

    const originalTitleRef = useRef<string | null>(null);

    // Dynamic browser tab title alerting user if tab is in the background
    useEffect(() => {
        if (isWarning) {
            if (originalTitleRef.current === null) {
                originalTitleRef.current = document.title;
            }
            document.title = `⚠️ (${formatTime(remainingSeconds)}) Session Expiring - IoClass`;
        } else if (originalTitleRef.current !== null) {
            document.title = originalTitleRef.current;
            originalTitleRef.current = null;
        }

        return () => {
            if (originalTitleRef.current !== null) {
                document.title = originalTitleRef.current;
                originalTitleRef.current = null;
            }
        };
    }, [isWarning, remainingSeconds]);

    const isUrgent = remainingSeconds <= 20; // Final 20 seconds of the 1-minute warning

    return (
        <Dialog open={isWarning} onOpenChange={() => {}}>
            <DialogContent
                className="max-w-md gap-5 p-6 sm:max-w-lg"
                onPointerDownOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => e.preventDefault()}
            >
                <DialogHeader className="flex flex-row items-start gap-4 space-y-0 text-left">
                    <div
                        className={cn(
                            'relative flex size-12 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300',
                            isUrgent
                                ? 'border-red-500/30 bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                                : 'border-amber-500/30 bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400',
                        )}
                    >
                        {/* Pulse animation */}
                        <span
                            className={cn(
                                'absolute inline-flex h-full w-full animate-ping rounded-2xl opacity-25',
                                isUrgent ? 'bg-red-500' : 'bg-amber-500',
                            )}
                        />
                        {isUrgent ? (
                            <AlertTriangle className="size-6 animate-bounce" />
                        ) : (
                            <Clock className="size-6" />
                        )}
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <DialogTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                Are you still there?
                            </DialogTitle>
                            <span
                                className={cn(
                                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                    isUrgent
                                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                                )}
                            >
                                {isUrgent ? 'Expiring soon' : 'Inactive'}
                            </span>
                        </div>
                        <DialogDescription className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-sm">
                            {idleMinutesBeforeWarning > 0
                                ? `You have been inactive for ${idleMinutesBeforeWarning} minute${idleMinutesBeforeWarning > 1 ? 's' : ''}. For security, your IoClass session will automatically close.`
                                : 'You have been inactive. For security, your IoClass session will automatically close.'}
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* ── Visual Countdown Card ── */}
                <div
                    className={cn(
                        'rounded-2xl border p-4 text-center transition-colors duration-300',
                        isUrgent
                            ? 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/20'
                            : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/30 dark:bg-amber-950/20',
                    )}
                >
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Time Remaining Before Auto-Logout
                    </div>
                    <div
                        className={cn(
                            'my-1 font-mono text-4xl font-extrabold tracking-tight transition-colors duration-300',
                            isUrgent
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-amber-600 dark:text-amber-400',
                        )}
                    >
                        {formatTime(remainingSeconds)}
                    </div>

                    {/* Countdown Progress Bar */}
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                        <div
                            className={cn(
                                'h-full rounded-full transition-all duration-1000 ease-linear',
                                isUrgent
                                    ? 'bg-red-500'
                                    : 'bg-gradient-to-r from-amber-400 to-amber-500',
                            )}
                            style={{ width: `${percentRemaining}%` }}
                        />
                    </div>
                </div>

                {/* Security hint */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldAlert className="size-4 shrink-0 text-amber-500" />
                    <span>
                        Automatic logout protects student attendance records and personal data on shared computers.
                    </span>
                </div>

                <DialogFooter className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={logoutNow}
                        disabled={isLoggingOut || isRefreshing}
                        className="text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    >
                        {isLoggingOut ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Logging out...
                            </>
                        ) : (
                            <>
                                <LogOut className="mr-2 size-4" />
                                Log Out Now
                            </>
                        )}
                    </Button>

                    <Button
                        type="button"
                        onClick={() => stayLoggedIn()}
                        disabled={isLoggingOut || isRefreshing}
                        className="bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
                    >
                        {isRefreshing ? (
                            <>
                                <Loader2 className="mr-2 size-4 animate-spin" />
                                Extending Session...
                            </>
                        ) : (
                            'Stay Logged In'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
