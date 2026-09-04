import React from 'react';

/** Strip Laravel-style prefixes so we can show "**Label** rest…" in red below the field. */
export function getErrorRest(message: string): string {
    const msg = message.trim();
    const afterField = msg.replace(/^The\s.+?\s+field\s+/i, '').trim();
    let rest = afterField;
    if (afterField === msg) {
        rest = msg.replace(/^The\s+\S+(?:\s+\S+)?\s+/, '').trim();
    }
    if (!rest) {
        return msg;
    }
    return rest.charAt(0).toLowerCase() + rest.slice(1);
}

export function FormFieldError({
    label,
    message,
}: {
    label: string;
    message?: string;
}): React.JSX.Element | null {
    if (!message) {
        return null;
    }
    const rest = getErrorRest(message);
    return (
        <p className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
            <strong className="font-semibold">{label}</strong>{' '}
            <span className="font-normal">{rest}</span>
        </p>
    );
}

export function inputErrorClass(hasError: boolean): string {
    return hasError
        ? 'border-red-500 bg-neutral-50 text-foreground focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:bg-neutral-950/40'
        : '';
}

/** For native `<select>` elements (same visual language as inputs). */
export function selectErrorClass(hasError: boolean): string {
    return hasError
        ? 'border-red-500 bg-neutral-50 dark:bg-neutral-950/40 focus-visible:ring-red-500/25'
        : '';
}
