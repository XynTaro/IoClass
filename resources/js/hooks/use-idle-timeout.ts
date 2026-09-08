import { router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { route } from 'ziggy-js';

const STORAGE_KEY = 'ioclass_last_activity_at';
const STORAGE_LOGOUT_EVENT = 'ioclass_logout_event';
const STORAGE_RESET_EVENT = 'ioclass_keep_alive_event';

export interface UseIdleTimeoutOptions {
    /** Total idle duration in milliseconds before logging out. Default: 30 minutes */
    timeoutMs?: number;
    /** Duration in milliseconds of the countdown warning before logout. Default: 5 minutes */
    warningMs?: number;
    /** Whether the tracker is enabled (e.g. only when user is authenticated) */
    enabled?: boolean;
}

export interface IdleTimeoutState {
    isWarning: boolean;
    remainingSeconds: number;
    totalWarningSeconds: number;
    percentRemaining: number;
    idleMinutesBeforeWarning: number;
    isLoggingOut: boolean;
    isRefreshing: boolean;
    stayLoggedIn: () => Promise<void>;
    logoutNow: () => void;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes total
const DEFAULT_WARNING_MS = 1 * 60 * 1000; // 1 minute warning (triggers at 29 minutes)
const ACTIVITY_THROTTLE_MS = 10 * 1000; // Write to storage at most every 10 seconds

export function useIdleTimeout({
    timeoutMs = DEFAULT_TIMEOUT_MS,
    warningMs = DEFAULT_WARNING_MS,
    enabled = true,
}: UseIdleTimeoutOptions = {}): IdleTimeoutState {
    const activeTimeoutMs = timeoutMs;
    const activeWarningMs = warningMs;
    const activeThrottleMs = ACTIVITY_THROTTLE_MS;
    const warningThresholdMs = activeTimeoutMs - activeWarningMs;

    const [isWarning, setIsWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(
        Math.floor(activeWarningMs / 1000),
    );
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const lastStorageWriteRef = useRef<number>(Date.now());
    const isLoggingOutRef = useRef<boolean>(false);
    const isWarningRef = useRef<boolean>(false);

    // Keep ref in sync
    useEffect(() => {
        isWarningRef.current = isWarning;
    }, [isWarning]);

    /**
     * Get the latest recorded activity timestamp
     */
    const getLastActivity = useCallback((): number => {
        try {
            const val = localStorage.getItem(STORAGE_KEY);
            if (val) {
                const parsed = parseInt(val, 10);
                if (!isNaN(parsed) && parsed > 0) {
                    return parsed;
                }
            }
        } catch {
            // Storage access might fail in privacy modes
        }
        return Date.now();
    }, []);

    /**
     * Mark activity timestamp in memory and localStorage
     */
    const recordActivity = useCallback(
        (forceSync = false) => {
            if (!enabled || isLoggingOutRef.current) return;

            // If the warning dialog is currently open, passive activity (like mouse hover)
            // should not silently dismiss the security prompt; the user must explicitly
            // click "Stay Logged In".
            if (isWarningRef.current && !forceSync) return;

            const now = Date.now();
            const shouldWriteStorage =
                forceSync ||
                now - lastStorageWriteRef.current >= activeThrottleMs;

            if (shouldWriteStorage) {
                lastStorageWriteRef.current = now;
                try {
                    localStorage.setItem(STORAGE_KEY, now.toString());
                } catch {
                    // Ignore storage quota or access errors
                }
            }
        },
        [activeThrottleMs, enabled],
    );

    /**
     * Perform actual logout and redirect with reason
     */
    const logoutNow = useCallback(() => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;
        setIsLoggingOut(true);

        // Notify other tabs
        try {
            sessionStorage.setItem('is_logged_out', 'true');
            localStorage.setItem(STORAGE_LOGOUT_EVENT, Date.now().toString());
        } catch {
            // Ignore storage errors
        }

        const logoutUrl = route('logout');
        const loginRedirectUrl = `${route('login')}?reason=inactivity`;

        router.post(
            logoutUrl,
            {},
            {
                replace: true,
                onSuccess: () => {
                    window.location.replace(loginRedirectUrl);
                },
                onError: () => {
                    window.location.replace(loginRedirectUrl);
                },
            },
        );
    }, []);

    /**
     * Keep session alive: reset timer and ping backend endpoint
     */
    const stayLoggedIn = useCallback(async () => {
        if (isLoggingOutRef.current || isRefreshing) return;
        setIsRefreshing(true);

        const now = Date.now();
        lastStorageWriteRef.current = now;
        try {
            localStorage.setItem(STORAGE_KEY, now.toString());
            localStorage.setItem(STORAGE_RESET_EVENT, now.toString());
        } catch {
            // Ignore
        }

        setIsWarning(false);
        setRemainingSeconds(Math.floor(activeWarningMs / 1000));

        try {
            const csrfToken =
                document
                    .querySelector('meta[name="csrf-token"]')
                    ?.getAttribute('content') || '';

            const response = await fetch('/session/keep-alive', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.status === 401 || response.status === 419) {
                // Server session is already dead (e.g. computer woke from sleep after hours)
                logoutNow();
                return;
            }
        } catch (error) {
            // If offline, don't force logout immediately; keep local session until timer
            console.warn('Session keep-alive ping failed:', error);
        } finally {
            setIsRefreshing(false);
        }
    }, [activeWarningMs, isRefreshing, logoutNow]);

    // Initialize storage timestamp if missing
    useEffect(() => {
        if (!enabled) return;

        const current = localStorage.getItem(STORAGE_KEY);
        if (!current) {
            recordActivity(true);
        }
    }, [enabled, recordActivity]);

    // Listen to user interaction events across window
    useEffect(() => {
        if (!enabled) return;

        const handleInteraction = () => {
            recordActivity(false);
        };

        const events = [
            'mousemove',
            'mousedown',
            'keydown',
            'scroll',
            'touchstart',
            'pointerdown',
            'wheel',
        ];

        events.forEach((evt) => {
            window.addEventListener(evt, handleInteraction, { passive: true });
        });

        return () => {
            events.forEach((evt) => {
                window.removeEventListener(evt, handleInteraction);
            });
        };
    }, [enabled, recordActivity]);

    // Cross-tab synchronization via storage events
    useEffect(() => {
        if (!enabled) return;

        const handleStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_LOGOUT_EVENT && e.newValue) {
                // Another tab logged out
                sessionStorage.setItem('is_logged_out', 'true');
                window.location.replace(`${route('login')}?reason=inactivity`);
            } else if (e.key === STORAGE_RESET_EVENT || e.key === STORAGE_KEY) {
                // Another tab was active or clicked "Stay Logged In"
                if (isWarningRef.current) {
                    setIsWarning(false);
                    setRemainingSeconds(Math.floor(activeWarningMs / 1000));
                }
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [activeWarningMs, enabled]);

    // Periodic check timer (every 1 second)
    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            if (isLoggingOutRef.current) return;

            const now = Date.now();
            const lastActive = getLastActivity();
            const elapsed = now - lastActive;

            if (elapsed >= activeTimeoutMs) {
                // Total expired -> auto logout
                clearInterval(interval);
                logoutNow();
            } else if (elapsed >= warningThresholdMs) {
                // In warning window
                const remainingMs = Math.max(0, activeTimeoutMs - elapsed);
                const secs = Math.ceil(remainingMs / 1000);
                setIsWarning(true);
                setRemainingSeconds(secs);
            } else {
                // User was active (possibly in another tab)
                if (isWarningRef.current) {
                    setIsWarning(false);
                    setRemainingSeconds(Math.floor(activeWarningMs / 1000));
                }
            }
        }, 1000);

        return () => {
            clearInterval(interval);
        };
    }, [
        activeTimeoutMs,
        activeWarningMs,
        enabled,
        getLastActivity,
        logoutNow,
        warningThresholdMs,
    ]);

    const totalWarningSeconds = Math.floor(activeWarningMs / 1000);
    const percentRemaining = Math.max(
        0,
        Math.min(100, (remainingSeconds / totalWarningSeconds) * 100),
    );
    const idleMinutesBeforeWarning = Math.max(
        1,
        Math.round(warningThresholdMs / 60000),
    );

    return {
        isWarning,
        remainingSeconds,
        totalWarningSeconds,
        percentRemaining,
        idleMinutesBeforeWarning,
        isLoggingOut,
        isRefreshing,
        stayLoggedIn,
        logoutNow,
    };
}
