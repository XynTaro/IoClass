import { useCallback, useEffect, useState } from 'react';

export function isNetworkError(error: unknown): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return true;
    }
    if (!error) return false;

    const errStr =
        typeof error === 'object' && error !== null
            ? (error as { message?: string }).message || String(error)
            : String(error);

    return (
        errStr.includes('Failed to fetch') ||
        errStr.includes('NetworkError') ||
        errStr.includes('Network request failed') ||
        errStr.includes('ERR_INTERNET_DISCONNECTED') ||
        errStr.includes('ERR_NAME_NOT_RESOLVED') ||
        errStr.includes('ERR_CONNECTION_REFUSED') ||
        errStr.includes('ERR_CONNECTION_TIMED_OUT') ||
        errStr.includes('ERR_NETWORK_CHANGED') ||
        errStr.includes('The Internet connection appears to be offline') ||
        errStr.includes('Load failed') ||
        errStr.includes('abort')
    );
}

// Perform a lightweight check to verify actual internet connectivity
export async function testConnection(timeoutMs = 3500): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return false;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const response = await fetch(`/favicon.ico?_ping=${Date.now()}`, {
            method: 'HEAD',
            cache: 'no-store',
            signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response.status >= 200 && response.status < 500;
    } catch {
        return false;
    }
}

export function triggerConnectionError(options?: {
    message?: string;
    onRetry?: () => void;
}) {
    window.dispatchEvent(
        new CustomEvent('app:connection-error', {
            detail: options || {},
        }),
    );
}

export function useOnlineStatus() {
    const [isOnline, setIsOnline] = useState<boolean>(() => {
        return typeof navigator !== 'undefined' ? navigator.onLine : true;
    });
    const [wasOffline, setWasOffline] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setWasOffline(true);
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Auto-clear the "wasOffline" restored indicator after 4 seconds
    useEffect(() => {
        if (!wasOffline || !isOnline) return;

        const timer = setTimeout(() => {
            setWasOffline(false);
        }, 4000);

        return () => clearTimeout(timer);
    }, [wasOffline, isOnline]);

    const checkStatus = useCallback(async () => {
        setIsChecking(true);
        const online = await testConnection();
        setIsChecking(false);

        if (online) {
            if (!isOnline) {
                setIsOnline(true);
                setWasOffline(true);
            }
        } else {
            setIsOnline(false);
        }

        return online;
    }, [isOnline]);

    return {
        isOnline,
        wasOffline,
        isChecking,
        checkStatus,
    };
}
