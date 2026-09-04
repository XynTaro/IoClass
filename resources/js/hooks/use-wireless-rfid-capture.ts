import { useEffect, useRef, useState } from 'react';
import { route } from 'ziggy-js';
import { normalizeRfidUid } from '@/lib/rfid';

const LISTEN_DURATION_MS = 120_000;

type LastCaptureResponse = {
    available: boolean;
    uid: string | null;
    captured_at: number | null;
};

export function useWirelessRfidCapture(
    listening: boolean,
    onScan: (uid: string) => void,
): {
    available: boolean | null;
    waiting: boolean;
} {
    const onScanRef = useRef(onScan);
    const sinceRef = useRef(Math.floor(Date.now() / 1000));
    const lastUidRef = useRef<string | null>(null);
    const [available, setAvailable] = useState<boolean | null>(null);

    onScanRef.current = onScan;

    useEffect(() => {
        if (!listening) {
            setAvailable(null);

            return;
        }

        sinceRef.current = Math.floor(Date.now() / 1000);
        lastUidRef.current = null;

        const stopAt = Date.now() + LISTEN_DURATION_MS;
        let cancelled = false;

        // Sequential polling: wait for each response before scheduling the next
        // so slow connections (e.g. remote DB) don't pile up concurrent requests.
        const MIN_DELAY_MS = 2000;
        let cancelWait: (() => void) | null = null;

        const delay = (ms: number): Promise<void> =>
            new Promise<void>((resolve) => {
                const t = window.setTimeout(resolve, ms);
                cancelWait = () => {
                    window.clearTimeout(t);
                    resolve();
                };
            });

        const loop = async (): Promise<void> => {
            while (!cancelled && Date.now() < stopAt) {
                const start = Date.now();

                try {
                    const response = await fetch(
                        `${route('admin.rfid.lastCapture')}?since=${sinceRef.current}`,
                        {
                            headers: {
                                Accept: 'application/json',
                                'X-Requested-With': 'XMLHttpRequest',
                            },
                            credentials: 'same-origin',
                        },
                    );

                    if (response.ok && !cancelled) {
                        const payload = (await response.json()) as LastCaptureResponse;

                        setAvailable(payload.available);

                        if (payload.available && payload.uid !== null && payload.captured_at !== null) {
                            const uid = normalizeRfidUid(payload.uid);

                            if (uid !== '' && uid !== lastUidRef.current) {
                                lastUidRef.current = uid;
                                sinceRef.current = payload.captured_at;
                                onScanRef.current(uid);
                            }
                        }
                    }
                } catch {
                    // Ignore transient network errors while polling.
                }

                // Wait at least MIN_DELAY_MS between requests, accounting for
                // however long the request itself took.
                const elapsed = Date.now() - start;
                await delay(Math.max(0, MIN_DELAY_MS - elapsed));
            }
        };

        void loop();

        return () => {
            cancelled = true;
            cancelWait?.();
        };
    }, [listening]);

    return {
        available,
        waiting: listening,
    };
}
