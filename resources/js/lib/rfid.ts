export function normalizeRfidUid(value: string): string {
    return value.trim().toUpperCase().replace(/[\s:-]/g, '');
}

export type RfidRegistryEntry = {
    type: 'student' | 'teacher';
    name: string;
};

export type RfidRegistry = Record<string, RfidRegistryEntry>;

export function lookupRfidConflict(
    registry: RfidRegistry,
    uid: string,
    excludeUid = '',
): RfidRegistryEntry | null {
    const normalized = normalizeRfidUid(uid);
    const normalizedExclude = normalizeRfidUid(excludeUid);

    if (normalized === '' || normalized === normalizedExclude) {
        return null;
    }

    return registry[normalized] ?? null;
}
