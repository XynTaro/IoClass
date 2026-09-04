import { useCallback } from 'react';

export type GetInitialsFn = (fullName?: string | null) => string;

export function useInitials(): GetInitialsFn {
    return useCallback((fullName?: string | null): string => {
        // Handle undefined, null, or empty strings
        if (!fullName || fullName.trim() === '') {
            return '?';
        }

        // Split name into parts
        const names = fullName.trim().split(' ').filter(Boolean);

        // No valid names
        if (names.length === 0) {
            return '?';
        }

        // Single name
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }

        // First + last initials
        const firstInitial = names[0].charAt(0);
        const lastInitial = names[names.length - 1].charAt(0);

        return `${firstInitial}${lastInitial}`.toUpperCase();
    }, []);
}
