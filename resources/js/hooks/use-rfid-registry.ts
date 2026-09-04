import { useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { normalizeRfidUid, type RfidRegistry } from '@/lib/rfid';

const REGISTRY_TIMEOUT_MS = 20_000;

let cachedRegistry: RfidRegistry | null = null;
let inflightRequest: Promise<RfidRegistry> | null = null;

async function fetchRegistry(): Promise<RfidRegistry> {
    if (cachedRegistry !== null) {
        return cachedRegistry;
    }

    if (inflightRequest !== null) {
        return inflightRequest;
    }

    inflightRequest = (async () => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), REGISTRY_TIMEOUT_MS);

        try {
            const response = await fetch(route('admin.rfid.registry'), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                signal: controller.signal,
            });

            if (response.status === 401 || response.status === 419) {
                throw new Error('Session expired. Refresh the page and log in again.');
            }

            if (!response.ok) {
                throw new Error(`Server error (${response.status}). Could not load RFID registry.`);
            }

            const payload = (await response.json()) as { registry?: RfidRegistry };

            cachedRegistry = payload.registry ?? {};

            return cachedRegistry;
        } catch (error: unknown) {
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw new Error('Server took too long to respond. You can still type the RFID UID.');
            }

            if (error instanceof TypeError) {
                throw new Error('No response from server. Check that composer run dev is running.');
            }

            throw error;
        } finally {
            window.clearTimeout(timeoutId);
        }
    })().finally(() => {
        inflightRequest = null;
    });

    return inflightRequest;
}

export function invalidateRfidRegistryCache(): void {
    cachedRegistry = null;
}

export function useRfidRegistry(enabled: boolean): {
    registry: RfidRegistry;
    loading: boolean;
    error: string | null;
} {
    const [registry, setRegistry] = useState<RfidRegistry>(cachedRegistry ?? {});
    const [loading, setLoading] = useState(enabled && cachedRegistry === null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        if (cachedRegistry !== null) {
            setRegistry(cachedRegistry);
            setLoading(false);
            return;
        }

        let cancelled = false;

        setLoading(true);
        setError(null);

        fetchRegistry()
            .then((nextRegistry) => {
                if (!cancelled) {
                    setRegistry(nextRegistry);
                }
            })
            .catch((fetchError: unknown) => {
                if (!cancelled) {
                    setError(
                        fetchError instanceof Error
                            ? fetchError.message
                            : 'Unable to load RFID registry.',
                    );
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [enabled]);

    return { registry, loading, error };
}
