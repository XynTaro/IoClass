import type { InertiaLinkProps } from '@inertiajs/react';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function formatNameInput(value: string): string {
    // 1. Disallow space before the first letter (remove leading whitespace)
    const noLeadingSpace = value.replace(/^\s+/, '');
    // 2. Allow letters, spaces, hyphens, dots, and apostrophes only
    const lettersOnly = noLeadingSpace.replace(/[^a-zA-Z\s\-\.\']/g, '');
    // 3. Capitalize first letter of each word (after space, hyphen, etc.)
    return lettersOnly.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatContactNumberInput(value: string): string {
    const noLeadingSpace = value.replace(/^\s+/, '');
    if (noLeadingSpace.startsWith('+')) {
        return '+' + noLeadingSpace.slice(1).replace(/\D/g, '');
    }
    return noLeadingSpace.replace(/\D/g, '');
}

export function formatEmailInput(value: string): string {
    return value.replace(/^\s+/, '').replace(/\s+/g, '').toLowerCase();
}

export function formatLrnInput(value: string): string {
    return value.replace(/\D/g, '');
}
