import { CreditCard, Loader2, Radio } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRfidRegistry } from '@/hooks/use-rfid-registry';
import { setActiveRfidWedgeInput, useRfidWedge } from '@/hooks/use-rfid-wedge';
import { useWirelessRfidCapture } from '@/hooks/use-wireless-rfid-capture';
import { lookupRfidConflict, normalizeRfidUid } from '@/lib/rfid';
import { cn } from '@/lib/utils';

interface RfidUidInputProps {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    helperText?: string;
    excludeUid?: string;
    required?: boolean;
    placeholder?: string;
    className?: string;
    enabled?: boolean;
    autoFocus?: boolean;
    captureGlobalScan?: boolean;
    wirelessCapture?: boolean;
    onConflictChange?: (hasConflict: boolean) => void;
    onWirelessListeningChange?: (listening: boolean) => void;
}

export default function RfidUidInput({
    id,
    label,
    value,
    onChange,
    error,
    helperText,
    excludeUid,
    required = false,
    placeholder = 'Tap RFID card to scan',
    className,
    enabled = true,
    autoFocus = false,
    captureGlobalScan = false,
    wirelessCapture = false,
    onConflictChange,
    onWirelessListeningChange,
}: RfidUidInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [justScanned, setJustScanned] = useState(false);
    const [wirelessListening, setWirelessListening] = useState(false);
    const { registry, loading, error: registryError } = useRfidRegistry(enabled);

    const normalizedValue = normalizeRfidUid(value);
    const normalizedExclude = excludeUid ? normalizeRfidUid(excludeUid) : '';

    const conflict = useMemo(
        () => lookupRfidConflict(registry, normalizedValue, normalizedExclude),
        [normalizedExclude, normalizedValue, registry],
    );

    const hasError = Boolean(error || conflict);

    useEffect(() => {
        onConflictChange?.(conflict !== null);
    }, [conflict, onConflictChange]);

    useEffect(() => {
        if (!enabled || !autoFocus) {
            return;
        }

        const timer = window.setTimeout(() => {
            inputRef.current?.focus();
        }, 100);

        return () => window.clearTimeout(timer);
    }, [autoFocus, enabled]);

    useEffect(() => {
        if (!enabled) {
            setWirelessListening(false);
            onWirelessListeningChange?.(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled]);

    useEffect(() => {
        if (wirelessCapture) {
            setWirelessListening(true);
            onWirelessListeningChange?.(true);
        } else {
            setWirelessListening(false);
            onWirelessListeningChange?.(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [wirelessCapture]);

    const applyScan = (uid: string) => {
        onChange(uid);
        setJustScanned(true);
        window.setTimeout(() => setJustScanned(false), 1500);
        setWirelessListening(false);
        onWirelessListeningChange?.(false);
        inputRef.current?.focus();
    };

    useRfidWedge(id, enabled, captureGlobalScan, applyScan);

    const { available: wirelessAvailable } = useWirelessRfidCapture(
        enabled && wirelessCapture && wirelessListening,
        applyScan,
    );

    return (
        <div className={className}>
            <Label
                htmlFor={id}
                className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground"
            >
                <span>
                    {label}
                    {required ? ' *' : ''}
                </span>
                {wirelessCapture && enabled && (
                    <Button
                        type="button"
                        variant={wirelessListening ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 gap-1.5 px-2 text-[11px] font-normal"
                        onClick={() => {
                            const next = !wirelessListening;
                            setActiveRfidWedgeInput(id);
                            setWirelessListening(next);
                            onWirelessListeningChange?.(next);
                            inputRef.current?.focus();
                        }}
                    >
                        <Radio className={cn('h-3 w-3', wirelessListening && 'animate-pulse')} />
                        {wirelessListening ? 'Listening…' : 'Resume scan'}
                    </Button>
                )}
            </Label>

            <div className="relative">
                <CreditCard className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    ref={inputRef}
                    id={id}
                    data-rfid-input="true"
                    value={value}
                    onFocus={() => setActiveRfidWedgeInput(id)}
                    onBlur={() => {
                        window.setTimeout(() => {
                            if (document.activeElement?.id !== id) {
                                setActiveRfidWedgeInput(null);
                            }
                        }, 0);
                    }}
                    readOnly
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                        }
                    }}
                    placeholder={placeholder}
                    required={required}
                    autoComplete="off"
                    spellCheck={false}
                    aria-readonly="true"
                    aria-invalid={hasError}
                    className={cn(
                        'pl-9 font-mono uppercase tracking-wide',
                        justScanned &&
                            !hasError &&
                            'border-emerald-500 ring-1 ring-emerald-500/30',
                        hasError &&
                            'border-red-500 bg-neutral-50 text-foreground focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:bg-neutral-950/40',
                    )}
                />
                {loading && (
                    <Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
            </div>

            {wirelessCapture && enabled && wirelessListening && (
                <p className="mt-1 text-xs text-sky-600 dark:text-sky-400">
                    {wirelessAvailable === false
                        ? 'Set RFID_DEVICE_TOKEN in .env to enable ESP32 wireless capture.'
                        : 'Ready — tap the card on your ESP32 reader now.'}
                </p>
            )}

            {captureGlobalScan && enabled && !error && !conflict && !wirelessListening && (
                <p className="mt-1 text-xs text-muted-foreground">
                    USB reader: tap the card while this modal is open (works from any field).
                </p>
            )}

            {helperText && !error && !conflict && (
                <p className="mt-1 text-xs text-muted-foreground">{helperText}</p>
            )}

            {registryError && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                    {registryError}
                </p>
            )}

            {conflict && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    Already registered to {conflict.type}{' '}
                    <span className="font-medium">{conflict.name}</span>.
                </p>
            )}

            {error && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                    {error}
                </p>
            )}

            {!error && !conflict && normalizedValue !== '' && (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                    {justScanned ? 'Card scanned — ' : ''}UID ready: {normalizedValue}
                </p>
            )}
        </div>
    );
}
