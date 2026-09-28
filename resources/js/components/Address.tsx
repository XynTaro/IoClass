import { useForm } from '@inertiajs/react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { route } from 'ziggy-js';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { inputErrorClass } from '@/components/form-field-error';

// ---------------------------------------------------------------------------
// PSGC Public API
// ---------------------------------------------------------------------------
const PSGC = 'https://psgc.gitlab.io/api';

interface PsgcItem {
    code: string;
    name: string;
}

function sorted(items: PsgcItem[]): PsgcItem[] {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Cascade hook — one instance per address section (exported for reuse)
// ---------------------------------------------------------------------------
interface CascadeLoading {
    regions: boolean;
    provinces: boolean;
    municipalities: boolean;
    barangays: boolean;
}

export function useCascade() {
    const [regions, setRegions] = useState<PsgcItem[]>([]);
    const [provinces, setProvinces] = useState<PsgcItem[]>([]);
    const [municipalities, setMunicipalities] = useState<PsgcItem[]>([]);
    const [barangays, setBarangays] = useState<PsgcItem[]>([]);
    const [hasProvinces, setHasProvinces] = useState(true);

    const [regionCode, setRegionCode] = useState('');
    const [provinceCode, setProvinceCode] = useState('');
    const [municipalityCode, setMunicipalityCode] = useState('');

    const [loading, setLoading] = useState<CascadeLoading>({
        regions: false,
        provinces: false,
        municipalities: false,
        barangays: false,
    });

    useEffect(() => {
        setLoading((l) => ({ ...l, regions: true }));
        fetch(`${PSGC}/regions/`)
            .then((r) => r.json())
            .then((d: PsgcItem[]) => setRegions(sorted(d)))
            .finally(() => setLoading((l) => ({ ...l, regions: false })));
    }, []);

    const selectRegion = useCallback(async (code: string) => {
        setRegionCode(code);
        setProvinceCode('');
        setMunicipalityCode('');
        setProvinces([]);
        setMunicipalities([]);
        setBarangays([]);
        setHasProvinces(true);

        if (!code) return;

        setLoading((l) => ({ ...l, provinces: true }));
        try {
            const provs: PsgcItem[] = await fetch(
                `${PSGC}/regions/${code}/provinces/`,
            ).then((r) => r.json());

            if (provs.length > 0) {
                setProvinces(sorted(provs));
                setHasProvinces(true);
            } else {
                // NCR / no-province region — fetch cities directly from region
                setHasProvinces(false);
                setLoading((l) => ({ ...l, municipalities: true }));
                try {
                    const muns: PsgcItem[] = await fetch(
                        `${PSGC}/regions/${code}/cities-municipalities/`,
                    ).then((r) => r.json());
                    setMunicipalities(sorted(muns));
                } finally {
                    setLoading((l) => ({ ...l, municipalities: false }));
                }
            }
        } finally {
            setLoading((l) => ({ ...l, provinces: false }));
        }
    }, []);

    const selectProvince = useCallback(async (code: string) => {
        setProvinceCode(code);
        setMunicipalityCode('');
        setMunicipalities([]);
        setBarangays([]);

        if (!code) return;

        setLoading((l) => ({ ...l, municipalities: true }));
        try {
            const muns: PsgcItem[] = await fetch(
                `${PSGC}/provinces/${code}/cities-municipalities/`,
            ).then((r) => r.json());
            setMunicipalities(sorted(muns));
        } finally {
            setLoading((l) => ({ ...l, municipalities: false }));
        }
    }, []);

    const selectMunicipality = useCallback(async (code: string) => {
        setMunicipalityCode(code);
        setBarangays([]);

        if (!code) return;

        setLoading((l) => ({ ...l, barangays: true }));
        try {
            const brgys: PsgcItem[] = await fetch(
                `${PSGC}/cities-municipalities/${code}/barangays/`,
            ).then((r) => r.json());
            setBarangays(sorted(brgys));
        } finally {
            setLoading((l) => ({ ...l, barangays: false }));
        }
    }, []);

    const reset = useCallback(() => {
        setRegionCode('');
        setProvinceCode('');
        setMunicipalityCode('');
        setProvinces([]);
        setMunicipalities([]);
        setBarangays([]);
        setHasProvinces(true);
    }, []);

    return {
        regions,
        provinces,
        municipalities,
        barangays,
        hasProvinces,
        regionCode,
        provinceCode,
        municipalityCode,
        selectRegion,
        selectProvince,
        selectMunicipality,
        reset,
        loading,
    };
}

export type CascadeState = ReturnType<typeof useCascade>;

// ---------------------------------------------------------------------------
// Address section — renders Region → Province → Municipality → Barangay
// ---------------------------------------------------------------------------
export interface AddressErrors {
    region?: string;
    province?: string;
    municipality?: string;
    barangay?: string;
}

export function validateAddress(
    addr: {
        region: string;
        province: string;
        municipality: string;
        barangay: string;
    },
    hasProvinces: boolean,
): AddressErrors {
    const errors: AddressErrors = {};
    if (!addr.region?.trim()) {
        errors.region = 'Region is required.';
    }
    if (hasProvinces && !addr.province?.trim()) {
        errors.province = 'Province is required.';
    }
    if (!addr.municipality?.trim()) {
        errors.municipality = 'City / Municipality is required.';
    }
    if (!addr.barangay?.trim()) {
        errors.barangay = 'Barangay is required.';
    }
    return errors;
}

interface AddressSectionProps {
    title: string;
    cascade: CascadeState;
    barangayValue: string;
    onRegionChange: (code: string, name: string) => void;
    onProvinceChange: (code: string, name: string) => void;
    onMunicipalityChange: (code: string, name: string) => void;
    onBarangayChange: (name: string) => void;
    required?: boolean;
    errors?: AddressErrors;
}

export function AddressSection({
    title,
    cascade,
    barangayValue,
    onRegionChange,
    onProvinceChange,
    onMunicipalityChange,
    onBarangayChange,
    required = false,
    errors,
}: AddressSectionProps) {
    const {
        regions,
        provinces,
        municipalities,
        barangays,
        hasProvinces,
        regionCode,
        provinceCode,
        municipalityCode,
        loading,
    } = cascade;

    const loadingLabel = (text: string) => (
        <span className="flex items-center gap-1.5 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            {text}
        </span>
    );

    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">{title}</p>

            {/* Region */}
            <div>
                <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                    Region {required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                    value={regionCode}
                    onValueChange={(code) => {
                        const name =
                            regions.find((r) => r.code === code)?.name ?? '';
                        cascade.selectRegion(code);
                        onRegionChange(code, name);
                    }}
                    disabled={loading.regions}
                >
                    <SelectTrigger className={inputErrorClass(Boolean(errors?.region))}>
                        {loading.regions ? (
                            loadingLabel('Loading regions…')
                        ) : (
                            <SelectValue placeholder="Select region" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {regions.map((r) => (
                            <SelectItem key={r.code} value={r.code}>
                                {r.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors?.region && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.region}
                    </p>
                )}
            </div>

            {/* Province — hidden for regions without provinces (e.g. NCR) */}
            {hasProvinces && (
                <div>
                    <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                        Province {required && <span className="text-destructive">*</span>}
                    </Label>
                    <Select
                        value={provinceCode}
                        onValueChange={(code) => {
                            const name =
                                provinces.find((p) => p.code === code)?.name ??
                                '';
                            cascade.selectProvince(code);
                            onProvinceChange(code, name);
                        }}
                        disabled={!regionCode || loading.provinces}
                    >
                        <SelectTrigger className={inputErrorClass(Boolean(errors?.province))}>
                            {loading.provinces ? (
                                loadingLabel('Loading provinces…')
                            ) : (
                                <SelectValue placeholder="Select province" />
                            )}
                        </SelectTrigger>
                        <SelectContent>
                            {provinces.map((p) => (
                                <SelectItem key={p.code} value={p.code}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors?.province && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                            {errors.province}
                        </p>
                    )}
                </div>
            )}

            {/* City / Municipality */}
            <div>
                <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                    City / Municipality {required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                    value={municipalityCode}
                    onValueChange={(code) => {
                        const name =
                            municipalities.find((m) => m.code === code)?.name ??
                            '';
                        cascade.selectMunicipality(code);
                        onMunicipalityChange(code, name);
                    }}
                    disabled={
                        (hasProvinces && !provinceCode) ||
                        !regionCode ||
                        loading.municipalities
                    }
                >
                    <SelectTrigger className={inputErrorClass(Boolean(errors?.municipality))}>
                        {loading.municipalities ? (
                            loadingLabel('Loading cities…')
                        ) : (
                            <SelectValue placeholder="Select city / municipality" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {municipalities.map((m) => (
                            <SelectItem key={m.code} value={m.code}>
                                {m.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors?.municipality && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.municipality}
                    </p>
                )}
            </div>

            {/* Barangay */}
            <div>
                <Label className="mb-1 inline-block text-xs font-medium text-muted-foreground">
                    Barangay {required && <span className="text-destructive">*</span>}
                </Label>
                <Select
                    value={barangayValue}
                    onValueChange={onBarangayChange}
                    disabled={!municipalityCode || loading.barangays}
                >
                    <SelectTrigger className={inputErrorClass(Boolean(errors?.barangay))}>
                        {loading.barangays ? (
                            loadingLabel('Loading barangays…')
                        ) : (
                            <SelectValue placeholder="Select barangay" />
                        )}
                    </SelectTrigger>
                    <SelectContent>
                        {barangays.map((b) => (
                            <SelectItem key={b.code} value={b.name}>
                                {b.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors?.barangay && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.barangay}
                    </p>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Form data
// ---------------------------------------------------------------------------
export interface AddressFormData {
    perm_region: string;
    perm_province: string;
    perm_municipality: string;
    perm_barangay: string;
    same_as_permanent: boolean;
    curr_region: string;
    curr_province: string;
    curr_municipality: string;
    curr_barangay: string;
}

const emptyForm: AddressFormData = {
    perm_region: '',
    perm_province: '',
    perm_municipality: '',
    perm_barangay: '',
    same_as_permanent: true,
    curr_region: '',
    curr_province: '',
    curr_municipality: '',
    curr_barangay: '',
};

// ---------------------------------------------------------------------------
// Pending admin data passed from step 1 (exported for use in AdminModal)
// ---------------------------------------------------------------------------
export interface PendingAdminData {
    fname: string;
    mname: string;
    lname: string;
    email: string;
    contact_number: string;
    pw?: string;
    pw_confirmation?: string;
}

// Admin-field keys so we can detect server errors from step 1
const ADMIN_FIELDS: (keyof PendingAdminData)[] = [
    'fname', 'mname', 'lname', 'email', 'contact_number',
];

// ---------------------------------------------------------------------------
// Pending teacher data passed from step 1 (exported for use in TeacherModal)
// ---------------------------------------------------------------------------
export interface PendingTeacherData {
    tch_rfid_uid: string;
    master_card: string;
    tch_fname: string;
    tch_mname: string;
    tch_lname: string;
    tch_email: string;
    contact_number: string;
    tch_pw?: string;
    tch_pw_confirmation?: string;
}

// Teacher-field keys so we can detect server errors from step 1
const TEACHER_FIELDS: (keyof PendingTeacherData)[] = [
    'tch_rfid_uid', 'master_card', 'tch_fname', 'tch_mname', 'tch_lname',
    'tch_email', 'contact_number',
];

// ---------------------------------------------------------------------------
// AddressModal — public export
// ---------------------------------------------------------------------------
interface AddressModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess?: () => void;
    title?: string;
    description?: string;
    cancelLabel?: string;
    /** When provided the modal is in wizard step-2 mode: saves admin+address together */
    adminData?: PendingAdminData;
    /** When provided the modal is in wizard step-2 mode: saves teacher+address together */
    teacherData?: PendingTeacherData;
    /** Shows a Back button that returns to step 1 */
    onBack?: () => void;
    /**
     * Collect-only mode: called with the filled form data instead of
     * submitting to the server (used when address is step 2 of 3+).
     */
    onNext?: (data: AddressFormData) => void;
    required?: boolean;
}

export default function AddressModal({
    open,
    onClose,
    onSuccess,
    title = 'Add Address',
    description,
    cancelLabel = 'Cancel',
    adminData,
    teacherData,
    onBack,
    onNext,
    required = false,
}: AddressModalProps) {
    const form = useForm<AddressFormData>(emptyForm);

    const permCascade = useCascade();
    const currCascade = useCascade();
    const [permErrors, setPermErrors] = useState<AddressErrors>({});
    const [currErrors, setCurrErrors] = useState<AddressErrors>({});
    const [stepError, setStepError] = useState<string | null>(null);

    // Reset everything when modal closes
    useEffect(() => {
        if (!open) {
            form.reset();
            permCascade.reset();
            currCascade.reset();
            setPermErrors({});
            setCurrErrors({});
            setStepError(null);
        }
    }, [open]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (required) {
            const pErrors = validateAddress(
                {
                    region: form.data.perm_region,
                    province: form.data.perm_province,
                    municipality: form.data.perm_municipality,
                    barangay: form.data.perm_barangay,
                },
                permCascade.hasProvinces,
            );

            let cErrors: AddressErrors = {};
            if (!form.data.same_as_permanent) {
                cErrors = validateAddress(
                    {
                        region: form.data.curr_region,
                        province: form.data.curr_province,
                        municipality: form.data.curr_municipality,
                        barangay: form.data.curr_barangay,
                    },
                    currCascade.hasProvinces,
                );
            }

            if (
                Object.keys(pErrors).length > 0 ||
                Object.keys(cErrors).length > 0
            ) {
                setPermErrors(pErrors);
                setCurrErrors(cErrors);
                setStepError(
                    'Please complete all required address fields before proceeding.',
                );
                return;
            }

            setPermErrors({});
            setCurrErrors({});
            setStepError(null);
        }

        // Collect-only mode — pass data to parent without submitting
        if (onNext) {
            onNext(form.data);
            return;
        }

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            form.setError('perm_region', 'No internet connection. Your entered data has been kept safe. Please check your connection and try again.');
            return;
        }

        if (teacherData) {
            // Wizard mode — save teacher + address in one atomic request
            form.transform((data) => ({ ...teacherData, ...data }));
            form.post(route('admin.teacher.storeWithAddress'), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    sessionStorage.removeItem('ioclass_draft_teacher_create');
                    onSuccess?.();
                    onClose();
                },
                onError: () => {},
            });
        } else if (adminData) {
            // Wizard mode — save admin + address in one atomic request
            form.transform((data) => ({ ...adminData, ...data }));
            form.post(route('admin.admin.storeWithAddress'), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
                onError: () => {},
            });
        } else {
            // Standalone address creation
            form.post(route('admin.address.store'), {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    onSuccess?.();
                    onClose();
                },
                onError: () => {},
            });
        }
    };

    // Admin-field errors coming back from the server (step-1 data issue)
    const adminErrors = ADMIN_FIELDS
        .filter((k) => Boolean((form.errors as Record<string, string>)[k]))
        .map((k) => (form.errors as Record<string, string>)[k]);

    // Teacher-field errors coming back from the server (step-1 data issue)
    const teacherErrors = TEACHER_FIELDS
        .filter((k) => Boolean((form.errors as Record<string, string>)[k]))
        .map((k) => (form.errors as Record<string, string>)[k]);

    const step1Errors = teacherData ? teacherErrors : adminErrors;

    // Helpers to update permanent address fields and reset downstream
    const setPermField = (
        field: keyof AddressFormData,
        value: string | boolean,
    ) => {
        form.setData(field, value as string);
    };

    const handlePermRegion = (_code: string, name: string) => {
        form.setData({
            ...form.data,
            perm_region: name,
            perm_province: '',
            perm_municipality: '',
            perm_barangay: '',
        });
        setPermErrors((prev) => ({
            ...prev,
            region: undefined,
            province: undefined,
            municipality: undefined,
            barangay: undefined,
        }));
        setStepError(null);
    };

    const handlePermProvince = (_code: string, name: string) => {
        form.setData({
            ...form.data,
            perm_province: name,
            perm_municipality: '',
            perm_barangay: '',
        });
        setPermErrors((prev) => ({
            ...prev,
            province: undefined,
            municipality: undefined,
            barangay: undefined,
        }));
        setStepError(null);
    };

    const handlePermMunicipality = (_code: string, name: string) => {
        form.setData({
            ...form.data,
            perm_municipality: name,
            perm_barangay: '',
        });
        setPermErrors((prev) => ({
            ...prev,
            municipality: undefined,
            barangay: undefined,
        }));
        setStepError(null);
    };

    const handlePermBarangay = (name: string) => {
        setPermField('perm_barangay', name);
        setPermErrors((prev) => ({
            ...prev,
            barangay: undefined,
        }));
        setStepError(null);
    };

    // Helpers to update current address fields and reset downstream
    const handleCurrRegion = (_code: string, name: string) => {
        form.setData({
            ...form.data,
            curr_region: name,
            curr_province: '',
            curr_municipality: '',
            curr_barangay: '',
        });
        setCurrErrors((prev) => ({
            ...prev,
            region: undefined,
            province: undefined,
            municipality: undefined,
            barangay: undefined,
        }));
        setStepError(null);
    };

    const handleCurrProvince = (_code: string, name: string) => {
        form.setData({
            ...form.data,
            curr_province: name,
            curr_municipality: '',
            curr_barangay: '',
        });
        setCurrErrors((prev) => ({
            ...prev,
            province: undefined,
            municipality: undefined,
            barangay: undefined,
        }));
        setStepError(null);
    };

    const handleCurrMunicipality = (_code: string, name: string) => {
        form.setData({
            ...form.data,
            curr_municipality: name,
            curr_barangay: '',
        });
        setCurrErrors((prev) => ({
            ...prev,
            municipality: undefined,
            barangay: undefined,
        }));
        setStepError(null);
    };

    const handleCurrBarangay = (name: string) => {
        form.setData('curr_barangay', name);
        setCurrErrors((prev) => ({
            ...prev,
            barangay: undefined,
        }));
        setStepError(null);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold">
                        {title}
                    </DialogTitle>
                    {description ? (
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    ) : required ? (
                        <p className="text-xs text-muted-foreground">
                            Home address — required
                        </p>
                    ) : null}
                </DialogHeader>

                {stepError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/50 dark:bg-red-950/40">
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-sm text-red-700 dark:text-red-400">
                            {stepError}
                        </p>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="max-h-[72vh] space-y-5 overflow-y-auto pr-1"
                >
                    {/* Step-1 server errors (wizard mode only) */}
                    {(adminData || teacherData) && step1Errors.length > 0 && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                            <p className="mb-1 font-semibold">
                                Please go back and fix the following:
                            </p>
                            <ul className="list-inside list-disc space-y-0.5">
                                {step1Errors.map((msg, i) => (
                                    <li key={i}>{msg}</li>
                                ))}
                            </ul>
                            {onBack && (
                                <button
                                    type="button"
                                    onClick={onBack}
                                    className="mt-2 underline hover:no-underline"
                                >
                                    ← Go back
                                </button>
                            )}
                        </div>
                    )}

                    {/* Permanent address */}
                    <AddressSection
                        title="Permanent Address"
                        cascade={permCascade}
                        barangayValue={form.data.perm_barangay}
                        required={required}
                        errors={permErrors}
                        onRegionChange={handlePermRegion}
                        onProvinceChange={handlePermProvince}
                        onMunicipalityChange={handlePermMunicipality}
                        onBarangayChange={handlePermBarangay}
                    />

                    {/* Same-address checkbox */}
                    <div className="flex items-center gap-2 rounded-md border px-3 py-2.5">
                        <Checkbox
                            id="same_as_permanent"
                            checked={form.data.same_as_permanent}
                            onCheckedChange={(checked) => {
                                const isSame = Boolean(checked);
                                form.setData(
                                    'same_as_permanent',
                                    isSame,
                                );
                                if (isSame) {
                                    currCascade.reset();
                                    form.setData({
                                        ...form.data,
                                        same_as_permanent: true,
                                        curr_region: '',
                                        curr_province: '',
                                        curr_municipality: '',
                                        curr_barangay: '',
                                    });
                                    setCurrErrors({});
                                    setStepError(null);
                                }
                            }}
                        />
                        <Label
                            htmlFor="same_as_permanent"
                            className="cursor-pointer text-sm"
                        >
                            Current address is the same as permanent address
                        </Label>
                    </div>

                    {/* Current address — shown only when not same */}
                    {!form.data.same_as_permanent && (
                        <div className="space-y-3 rounded-md border p-3">
                            <AddressSection
                                title="Current Address"
                                cascade={currCascade}
                                barangayValue={form.data.curr_barangay}
                                required={required}
                                errors={currErrors}
                                onRegionChange={handleCurrRegion}
                                onProvinceChange={handleCurrProvince}
                                onMunicipalityChange={handleCurrMunicipality}
                                onBarangayChange={handleCurrBarangay}
                            />
                        </div>
                    )}
                </form>

                <DialogFooter>
                    {onBack ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onBack}
                            disabled={form.processing}
                        >
                            ← Back
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={form.processing}
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    <Button
                        type="submit"
                        disabled={form.processing}
                        onClick={handleSubmit}
                    >
                        {form.processing
                            ? 'Saving…'
                            : onNext
                              ? 'Next →'
                              : adminData || teacherData
                                ? 'Save'
                                : 'Save address'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
