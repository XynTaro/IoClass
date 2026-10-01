import { router } from '@inertiajs/react';
import {
    AlertCircle,
    BookOpen,
    Check,
    GraduationCap,
    Loader2,
    Mail,
    Pencil,
    Phone,
    Plus,
    Search,
    Trash2,
    User,
    Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { route } from 'ziggy-js';
import { ModalHeader } from '@/components/modal-header';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn, formatContactNumberInput } from '@/lib/utils';

export interface SubjectDetails {
    subj_id: number;
    subj_code: string | null;
    subj_name: string | null;
    gr_level: string | null;
    is_deleted: boolean;
}

export interface TeacherItem {
    tch_id: number;
    tch_fname: string;
    tch_mname: string | null;
    tch_lname: string;
    tch_email: string | null;
    contact_number: string | null;
}

export interface EnrolledStudentItem {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_mname: string | null;
    stu_lname: string;
    enrolled_at: string | null;
}

export interface SectionStudentItem {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_mname: string | null;
    stu_lname: string;
}

export interface SectionItem {
    sect_id: number;
    sect_name: string;
    gr_level: string | null;
    students: SectionStudentItem[];
}

export interface SubjectDataPayload {
    subject: SubjectDetails;
    teachers: TeacherItem[];
    enrolledStudents: EnrolledStudentItem[];
    sections: SectionItem[];
    gradeLevels?: string[];
}

interface SubjectViewModalProps {
    open: boolean;
    onClose: () => void;
    subjectId: number | null;
    onEdit?: (subject: SubjectDetails) => void;
    onDataUpdated?: () => void;
}

function SubjectContent({
    subjectId,
    onClose,
    onEdit,
    onDataUpdated,
}: {
    subjectId: number;
    onClose: () => void;
    onEdit?: (subject: SubjectDetails) => void;
    onDataUpdated?: () => void;
}) {
    const [data, setData] = useState<SubjectDataPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'students'>('overview');

    // Students tab search
    const [studentSearch, setStudentSearch] = useState('');

    // Add students dialog state
    const [addStudentsOpen, setAddStudentsOpen] = useState(false);
    const [addSearch, setAddSearch] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
    const [isAttaching, setIsAttaching] = useState(false);
    const [removingStudentId, setRemovingStudentId] = useState<number | null>(null);

    useEffect(() => {
        let ignore = false;
        const controller = new AbortController();

        async function load() {
            try {
                const res = await fetch(route('admin.subject.show', { id: subjectId }), {
                    signal: controller.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                if (!res.ok) {
                    throw new Error('Failed to load subject details.');
                }
                const payload: SubjectDataPayload = await res.json();
                if (!ignore) {
                    setData(payload);
                    setLoading(false);
                }
            } catch (err: unknown) {
                if (!ignore && (err as Error)?.name !== 'AbortError') {
                    setFetchError(err instanceof Error ? err.message : 'Error loading subject data.');
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            ignore = true;
            controller.abort();
        };
    }, [subjectId]);

    const refetch = async () => {
        try {
            const res = await fetch(route('admin.subject.show', { id: subjectId }), {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (!res.ok) throw new Error('Failed to load subject details.');
            const payload: SubjectDataPayload = await res.json();
            setData(payload);
        } catch (err: unknown) {
            setFetchError(err instanceof Error ? err.message : 'Error loading subject data.');
        }
    };

    const fullName = (t: { tch_fname?: string; tch_mname?: string | null; tch_lname?: string }) =>
        [t.tch_fname, t.tch_mname, t.tch_lname].filter(Boolean).join(' ');

    const studentFullName = (s: { stu_fname?: string; stu_mname?: string | null; stu_lname?: string }) =>
        [s.stu_fname, s.stu_mname, s.stu_lname].filter(Boolean).join(' ');

    // Filter enrolled students in tab
    const filteredEnrolledStudents = useMemo(() => {
        if (!data?.enrolledStudents) return [];
        const q = studentSearch.trim().toLowerCase();
        if (!q) return data.enrolledStudents;
        return data.enrolledStudents.filter((s) => {
            const name = studentFullName(s).toLowerCase();
            const lrn = (s.lrn ?? '').toLowerCase();
            return name.includes(q) || lrn.includes(q);
        });
    }, [data?.enrolledStudents, studentSearch]);

    // Filter available sections for enrolling
    const filteredAddSections = useMemo(() => {
        if (!data?.sections) return [];
        const q = addSearch.trim().toLowerCase();
        if (!q) return data.sections;
        return data.sections
            .map((sec) => ({
                ...sec,
                students: sec.students.filter((s) => {
                    const name = studentFullName(s).toLowerCase();
                    const lrn = (s.lrn ?? '').toLowerCase();
                    return name.includes(q) || lrn.includes(q);
                }),
            }))
            .filter((sec) => sec.students.length > 0);
    }, [data?.sections, addSearch]);

    const toggleStudentSelection = (stuId: number) => {
        setSelectedStudentIds((prev) =>
            prev.includes(stuId) ? prev.filter((id) => id !== stuId) : [...prev, stuId],
        );
    };

    const toggleSectionSelection = (sec: SectionItem) => {
        const ids = sec.students.map((s) => s.stu_id);
        const allSelected = ids.every((id) => selectedStudentIds.includes(id));
        setSelectedStudentIds((prev) =>
            allSelected
                ? prev.filter((id) => !ids.includes(id))
                : [...new Set([...prev, ...ids])],
        );
    };

    const handleAttachStudents = () => {
        if (!subjectId || selectedStudentIds.length === 0) return;
        setIsAttaching(true);
        router.post(
            route('admin.subject.students.attach', subjectId),
            { student_ids: selectedStudentIds },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    setAddStudentsOpen(false);
                    setSelectedStudentIds([]);
                    setAddSearch('');
                    refetch();
                    onDataUpdated?.();
                },
                onFinish: () => setIsAttaching(false),
            },
        );
    };

    const handleDetachStudent = (stuId: number) => {
        if (!subjectId) return;
        if (!confirm('Remove this student from the subject?')) return;
        setRemovingStudentId(stuId);
        router.delete(
            route('admin.subject.students.detach', { id: subjectId, studentId: stuId }),
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    refetch();
                    onDataUpdated?.();
                },
                onFinish: () => setRemovingStudentId(null),
            },
        );
    };

    return (
        <div className="space-y-4 p-6 pt-4">
            {loading && !data ? (
                <div className="space-y-6">
                    <ModalHeader
                        icon={BookOpen}
                        tone="emerald"
                        title="Subject Details"
                        description="Loading details, teachers, and enrolled students..."
                    />
                    <div className="flex h-56 flex-col items-center justify-center gap-3 text-muted-foreground">
                        <Loader2 className="size-8 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-medium">Fetching subject information...</span>
                    </div>
                </div>
            ) : fetchError ? (
                <div className="space-y-4">
                    <ModalHeader
                        icon={BookOpen}
                        tone="emerald"
                        title="Subject Details"
                        description="Unable to load subject information"
                    />
                    <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                        <AlertCircle className="size-5 shrink-0" />
                        <span>{fetchError}</span>
                    </div>
                </div>
            ) : data ? (
                <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                            <ModalHeader
                                icon={BookOpen}
                                tone="emerald"
                                title={data.subject.subj_name ?? 'Subject Details'}
                                description="Subject information, assigned faculty, and enrolled students"
                            />
                            <div className="flex flex-wrap items-center gap-2 pl-13">
                                {data.subject.subj_code && (
                                    <span className="inline-flex items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                                        {data.subject.subj_code}
                                    </span>
                                )}
                                {data.subject.gr_level && (
                                    <span className="inline-flex items-center rounded-md border border-border/60 bg-muted px-2 py-0.5 text-xs font-medium text-foreground/80">
                                        {data.subject.gr_level}
                                    </span>
                                )}
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                        data.subject.is_deleted
                                            ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
                                    )}
                                >
                                    <span
                                        className={cn(
                                            'size-1.5 rounded-full',
                                            data.subject.is_deleted
                                                ? 'bg-red-500'
                                                : 'bg-emerald-500',
                                        )}
                                    />
                                    {data.subject.is_deleted ? 'Archived' : 'Active'}
                                </span>
                            </div>
                        </div>
                        {onEdit && !data.subject.is_deleted && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-5 sm:mt-6 h-8 rounded-xl text-xs font-medium"
                                onClick={() => {
                                    onClose();
                                    onEdit(data.subject);
                                }}
                            >
                                <Pencil className="mr-1.5 size-3.5" />
                                Edit Subject
                            </Button>
                        )}
                    </div>

                    {/* Custom Tabs */}
                    <div className="flex border-b border-border/40">
                        <button
                            type="button"
                            onClick={() => setActiveTab('overview')}
                            className={cn(
                                'flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-all',
                                activeTab === 'overview'
                                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Users className="size-3.5" />
                            Assigned Teachers
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                {data.teachers.length}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('students')}
                            className={cn(
                                'ml-3 flex cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-xs font-semibold transition-all',
                                activeTab === 'students'
                                    ? 'border-emerald-600 text-emerald-700 dark:border-emerald-400 dark:text-emerald-400'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <GraduationCap className="size-3.5" />
                            Enrolled Students
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                                {data.enrolledStudents.length}
                            </span>
                        </button>
                    </div>

                    {/* Tab 1: Overview & Teachers */}
                    {activeTab === 'overview' && (
                        <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
                            {/* Quick Stat Highlights */}
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                                    <span className="text-[11px] font-medium text-muted-foreground">Grade Level</span>
                                    <p className="mt-0.5 text-sm font-bold text-foreground">
                                        {data.subject.gr_level ?? '—'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                                    <span className="text-[11px] font-medium text-muted-foreground">Teachers</span>
                                    <p className="mt-0.5 text-sm font-bold text-foreground">
                                        {data.teachers.length} assigned
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border/80 bg-muted/30 p-3">
                                    <span className="text-[11px] font-medium text-muted-foreground">Students</span>
                                    <p className="mt-0.5 text-sm font-bold text-foreground">
                                        {data.enrolledStudents.length} enrolled
                                    </p>
                                </div>
                            </div>

                            {/* Teacher List */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 border-b border-border/20 pb-1.5">
                                    <Users className="size-4 text-emerald-600 dark:text-emerald-400" />
                                    <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                        Assigned Faculty ({data.teachers.length})
                                    </span>
                                </div>

                                {data.teachers.length === 0 ? (
                                    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 py-8 text-center text-muted-foreground">
                                        <User className="size-8 opacity-30" />
                                        <p className="text-xs font-medium">No teachers assigned to this subject yet.</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Teachers are linked when schedule slots are added in Schedule Management.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/40 rounded-xl border border-border bg-card/40 dark:bg-card/10">
                                        {data.teachers.map((teacher) => (
                                            <div
                                                key={teacher.tch_id}
                                                className="flex flex-wrap items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                        {teacher.tch_fname.charAt(0)}
                                                        {teacher.tch_lname.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-foreground">
                                                            {fullName(teacher)}
                                                        </p>
                                                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                                            {teacher.tch_email && (
                                                                <span className="flex items-center gap-1">
                                                                    <Mail className="size-3" />
                                                                    {teacher.tch_email}
                                                                </span>
                                                            )}
                                                            {teacher.contact_number && (
                                                                <span className="flex items-center gap-1">
                                                                    <Phone className="size-3" />
                                                                    {formatContactNumberInput(teacher.contact_number)}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Enrolled Students */}
                    {activeTab === 'students' && (
                        <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                            <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by student name or LRN…"
                                        value={studentSearch}
                                        onChange={(e) => setStudentSearch(e.target.value)}
                                        className="h-8.5 rounded-xl pl-8.5 text-xs"
                                    />
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => setAddStudentsOpen(true)}
                                    className="h-8.5 rounded-xl bg-emerald-600 px-3 text-xs text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
                                >
                                    <Plus className="mr-1 size-3.5" />
                                    Add Students
                                </Button>
                            </div>

                            {data.enrolledStudents.length === 0 ? (
                                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/80 py-10 text-center text-muted-foreground">
                                    <GraduationCap className="size-8 opacity-30" />
                                    <p className="text-xs font-medium">No students enrolled in this subject yet.</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAddStudentsOpen(true)}
                                        className="mt-1 h-7.5 rounded-lg text-xs"
                                    >
                                        <Plus className="mr-1 size-3.5" />
                                        Enroll Students
                                    </Button>
                                </div>
                            ) : filteredEnrolledStudents.length === 0 ? (
                                <div className="py-8 text-center text-xs text-muted-foreground">
                                    No enrolled students found matching "{studentSearch}".
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40 rounded-xl border border-border bg-card/40 dark:bg-card/10">
                                    {filteredEnrolledStudents.map((student) => (
                                        <div
                                            key={student.stu_id}
                                            className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30"
                                        >
                                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                                    {student.stu_fname.charAt(0)}
                                                    {student.stu_lname.charAt(0)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-semibold text-foreground">
                                                        {studentFullName(student)}
                                                    </p>
                                                    {student.lrn && (
                                                        <span className="font-mono text-[11px] text-muted-foreground">
                                                            LRN: {student.lrn}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="size-8 shrink-0 rounded-lg p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                disabled={removingStudentId === student.stu_id}
                                                onClick={() => handleDetachStudent(student.stu_id)}
                                                title="Remove student from subject"
                                            >
                                                {removingStudentId === student.stu_id ? (
                                                    <Loader2 className="size-3.5 animate-spin" />
                                                ) : (
                                                    <Trash2 className="size-3.5" />
                                                )}
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : null}

            <DialogFooter className="flex justify-end gap-2 border-t border-border/20 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={onClose}
                >
                    Close
                </Button>
            </DialogFooter>

            {/* Sub-Dialog: Add Students to Subject */}
            <Dialog open={addStudentsOpen} onOpenChange={setAddStudentsOpen}>
                <DialogContent className="max-h-[85vh] max-w-lg flex flex-col gap-0 p-0 sm:max-w-xl">
                    <DialogHeader className="px-6 pt-5 pb-3">
                        <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                            <GraduationCap className="size-5 text-emerald-600 dark:text-emerald-400" />
                            Enroll Students into Subject
                        </DialogTitle>
                    </DialogHeader>

                    <div className="px-6 pb-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Filter students by name or LRN…"
                                value={addSearch}
                                onChange={(e) => setAddSearch(e.target.value)}
                                className="h-9 rounded-xl pl-9 text-xs"
                            />
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto border-y border-border/40 px-6 py-3">
                        {filteredAddSections.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                                <GraduationCap className="size-8 opacity-25" />
                                <p className="text-xs">No available students found to enroll.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredAddSections.map((sec) => {
                                    const secStudentIds = sec.students.map((s) => s.stu_id);
                                    const allChecked =
                                        sec.students.length > 0 &&
                                        secStudentIds.every((id) => selectedStudentIds.includes(id));
                                    const someChecked =
                                        secStudentIds.some((id) => selectedStudentIds.includes(id)) &&
                                        !allChecked;

                                    return (
                                        <div key={sec.sect_id} className="rounded-xl border border-border/80 bg-card/60 p-3">
                                            <div className="mb-2 flex items-center justify-between border-b border-border/30 pb-2">
                                                <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-foreground">
                                                    <Checkbox
                                                        checked={allChecked ? true : someChecked ? 'indeterminate' : false}
                                                        onCheckedChange={() => toggleSectionSelection(sec)}
                                                    />
                                                    <span>
                                                        {sec.gr_level ? `${sec.gr_level} — ` : ''}
                                                        {sec.sect_name}
                                                    </span>
                                                </label>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {sec.students.length} student{sec.students.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            <div className="grid gap-1 sm:grid-cols-2">
                                                {sec.students.map((s) => {
                                                    const checked = selectedStudentIds.includes(s.stu_id);
                                                    return (
                                                        <label
                                                            key={s.stu_id}
                                                            className={cn(
                                                                'flex cursor-pointer items-center gap-2 rounded-lg p-2 text-xs transition-colors',
                                                                checked
                                                                    ? 'bg-emerald-500/10 font-medium text-emerald-800 dark:text-emerald-300'
                                                                    : 'hover:bg-muted/40',
                                                            )}
                                                        >
                                                            <Checkbox
                                                                checked={checked}
                                                                onCheckedChange={() => toggleStudentSelection(s.stu_id)}
                                                            />
                                                            <span className="truncate">
                                                                {studentFullName(s)}
                                                                {s.lrn && (
                                                                    <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                                                                        ({s.lrn})
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex items-center justify-between gap-2 border-t border-border/20 px-6 py-3">
                        <span className="text-xs text-muted-foreground">
                            {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                onClick={() => setAddStudentsOpen(false)}
                                disabled={isAttaching}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="rounded-xl bg-emerald-600 text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-95"
                                disabled={selectedStudentIds.length === 0 || isAttaching}
                                onClick={handleAttachStudents}
                            >
                                {isAttaching ? (
                                    <>
                                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                        Enrolling…
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-1.5 size-3.5" />
                                        Enroll {selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function SubjectViewModal({
    open,
    onClose,
    subjectId,
    onEdit,
    onDataUpdated,
}: SubjectViewModalProps) {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-lg overflow-hidden p-0 sm:max-w-2xl">
                {open && subjectId ? (
                    <SubjectContent
                        key={subjectId}
                        subjectId={subjectId}
                        onClose={onClose}
                        onEdit={onEdit}
                        onDataUpdated={onDataUpdated}
                    />
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
