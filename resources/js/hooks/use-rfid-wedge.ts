import { useEffect, useRef } from 'react';
import { normalizeRfidUid } from '@/lib/rfid';

const SCAN_GAP_MS = 120;
const MIN_UID_LENGTH = 4;

type WedgeSubscriber = {
    enabled: boolean;
    captureGlobal: boolean;
    onScan: (uid: string) => void;
};

const subscribers = new Map<string, WedgeSubscriber>();
let activeInputId: string | null = null;
let bufferRef = '';
let lastKeyAt = 0;
let burstFirstAt = 0;
let listenerAttached = false;

function isRapidWedgeBurst(uidLength: number): boolean {
    if (uidLength < MIN_UID_LENGTH) {
        return false;
    }

    const burstMs = lastKeyAt - burstFirstAt;

    return burstMs <= Math.max(SCAN_GAP_MS, uidLength * SCAN_GAP_MS);
}

export function setActiveRfidWedgeInput(inputId: string | null): void {
    activeInputId = inputId;
}

function hasGlobalCapture(): boolean {
    return [...subscribers.values()].some((sub) => sub.enabled && sub.captureGlobal);
}

function isRfidInput(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && target.dataset.rfidInput === 'true';
}

function isOtherTypingTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false;
    }

    if (isRfidInput(target)) {
        return false;
    }

    const tag = target.tagName;

    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
    }

    return target.isContentEditable;
}

function isScanTerminator(key: string): boolean {
    return key === 'Enter' || key === 'Tab';
}

function dispatchScan(uid: string, target: EventTarget | null): void {
    if (isRfidInput(target) && target instanceof HTMLElement) {
        const sub = subscribers.get(target.id);

        if (sub?.enabled) {
            sub.onScan(uid);

            return;
        }
    }

    if (activeInputId !== null) {
        const active = subscribers.get(activeInputId);

        if (active?.enabled && active.captureGlobal) {
            active.onScan(uid);

            return;
        }
    }

    for (const sub of subscribers.values()) {
        if (sub.enabled && sub.captureGlobal) {
            sub.onScan(uid);

            return;
        }
    }
}

function handleKeyDown(event: KeyboardEvent): void {
    const target = event.target;
    const globalCapture = hasGlobalCapture();

    if (isScanTerminator(event.key)) {
        const uid = normalizeRfidUid(bufferRef);

        bufferRef = '';

        if (uid.length < MIN_UID_LENGTH) {
            return;
        }

        if (isOtherTypingTarget(target) && !isRfidInput(target)) {
            if (!globalCapture || !isRapidWedgeBurst(uid.length)) {
                return;
            }
        }

        const hasActiveSubscriber = [...subscribers.values()].some(
            (sub) => sub.enabled && (sub.captureGlobal || isRfidInput(target)),
        );

        if (!hasActiveSubscriber) {
            return;
        }

        event.preventDefault();
        dispatchScan(uid, target);

        return;
    }

    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }

    const now = Date.now();

    if (isOtherTypingTarget(target) && !isRfidInput(target)) {
        if (!globalCapture) {
            bufferRef = '';

            return;
        }

        const gap = now - lastKeyAt;

        if (gap > SCAN_GAP_MS) {
            bufferRef = event.key;
            burstFirstAt = now;
        } else {
            bufferRef += event.key;

            if (bufferRef.length > 1) {
                event.preventDefault();
            }
        }

        lastKeyAt = now;

        return;
    }

    if (now - lastKeyAt > SCAN_GAP_MS) {
        bufferRef = '';
        burstFirstAt = now;
    }

    lastKeyAt = now;
    bufferRef += event.key;

    if (!isRfidInput(target) && globalCapture) {
        event.preventDefault();
    }
}

function ensureListener(): void {
    if (listenerAttached) {
        return;
    }

    window.addEventListener('keydown', handleKeyDown, true);
    listenerAttached = true;
}

function removeListenerIfIdle(): void {
    if (subscribers.size > 0 || !listenerAttached) {
        return;
    }

    window.removeEventListener('keydown', handleKeyDown, true);
    listenerAttached = false;
    bufferRef = '';
}

/**
 * Capture keyboard-wedge RFID reader input (rapid keys ending with Enter or Tab).
 * Only one field receives each scan (focused field, or first global-capture field).
 */
export function useRfidWedge(
    inputId: string,
    enabled: boolean,
    captureGlobal: boolean,
    onScan: (uid: string) => void,
): void {
    const onScanRef = useRef(onScan);

    onScanRef.current = onScan;

    useEffect(() => {
        if (!enabled) {
            subscribers.delete(inputId);

            if (activeInputId === inputId) {
                activeInputId = null;
            }

            removeListenerIfIdle();

            return;
        }

        subscribers.set(inputId, {
            enabled: true,
            captureGlobal,
            onScan: (uid) => onScanRef.current(uid),
        });

        ensureListener();

        return () => {
            subscribers.delete(inputId);

            if (activeInputId === inputId) {
                activeInputId = null;
            }

            removeListenerIfIdle();
        };
    }, [captureGlobal, enabled, inputId]);
}
