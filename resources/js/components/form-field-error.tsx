import React from 'react';

/**
 * Format and clean field error messages.
 * Strips accidental duplicate labels (e.g., "First name First name is required." -> "First name is required.")
 * and turns raw backend messages ("The fname field is required.") into clean sentences.
 */
export function formatFieldError(message?: string, label?: string): string {
    if (!message) {
        return '';
    }

    let text = message.trim();

    // 1. Convert raw Laravel-style messages: "The <field> field is required."
    if (label) {
        text = text.replace(/^The\s+[a-zA-Z0-9_.]+\s+field\s+/i, `${label} `);
        text = text.replace(/^The\s+[a-zA-Z0-9_.]+\s+/i, `${label} `);
    }

    // 2. Strip duplicated label at the start:
    // e.g. "First name First name is required." -> "First name is required."
    // e.g. "Email Email is required." -> "Email is required."
    if (label) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp(`^${escaped}\\s+${escaped}\\b`, 'i'), label);
    }

    // Handle generic word duplication at start, e.g. "Section Section ..."
    text = text.replace(/^([A-Za-z0-9\s]+?)\s+\1\b/i, '$1');

    return text;
}

/** Legacy helper preserved for backwards compatibility */
export function getErrorRest(message: string, label?: string): string {
    return formatFieldError(message, label);
}

export function FormFieldError({
    label,
    message,
    className = '',
}: {
    label?: string;
    message?: string;
    className?: string;
}): React.JSX.Element | null {
    if (!message) {
        return null;
    }

    const text = formatFieldError(message, label);
    if (!text) {
        return null;
    }

    return (
        <p
            className={`mt-1.5 text-xs text-red-600 dark:text-red-400 ${className}`.trim()}
            role="alert"
        >
            {text}
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
