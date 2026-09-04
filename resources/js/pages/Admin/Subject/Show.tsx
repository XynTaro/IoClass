import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft, BookOpen, Check, GraduationCap, Mail, Pencil, Phone, Plus, Search, Trash2, User } from 'lucide-react';
import { useState } from 'react';
import { route } from 'ziggy-js';
import SubjectModal from '@/components/SubjectModal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin/admin-layout';

interface Subject {
    subj_id: number;
    subj_code: string | null;
    subj_name: string | null;
    gr_level: string | null;
    is_deleted: boolean;
}

interface Teacher {
    tch_id: number;
    tch_fname: string;
    tch_mname: string | null;
    tch_lname: string;
    tch_email: string | null;
    contact_number: string | null;
}

interface EnrolledStudent {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_mname: string | null;
    stu_lname: string;
    enrolled_at: string | null;
}

interface SectionStudent {
    stu_id: number;
    lrn: string | null;
    stu_fname: string;
    stu_mname: string | null;
    stu_lname: string;
}

interface Section {
    sect_id: number;
    sect_name: string;
    gr_level: string | null;
    students: SectionStudent[];
}

export default function Show() {
    const { subject, teachers, enrolledStudents, sections, gradeLevels = [] } = usePage<{
        subject: Subject;
        teachers: Teacher[];
        enrolledStudents: EnrolledStudent[];
        sections: Section[];
        gradeLevels?: string[];
    }>().props;

    const [editOpen, setEditOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [processing, setProcessing] = useState(false);
    const [removingId, setRemovingId] = useState<number | null>(null);

    const handleSaveSuccess = () => {
        router.reload();
        setEditOpen(false);
    };

    const fullName = (s: { tch_fname?: string; tch_mname?: string | null; tch_lname?: string }) =>
        [s.tch_fname, s.tch_mname, s.tch_lname].filter(Boolean).join(' ');

    const filteredSections = sections
        .map((sec) => ({
            ...sec,
            students: search
                ? sec.students.filter((s) => {
                      const name = `${s.stu_fname} ${s.stu_mname ?? ''} ${s.stu_lname}`.toLowerCase();
                      const lrn = (s.lrn ?? '').toLowerCase();
                      const q = search.toLowerCase();
                      return name.includes(q) || lrn.includes(q);
                  })
                : sec.students,
        }))
        .filter((sec) => sec.students.length > 0);

    const totalAvailable = sections.reduce((n, s) => n + s.students.length, 0);

    const toggleSelect = (id: number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const toggleSection = (sec: Section) => {
        const ids = sec.students.map((s) => s.stu_id);
        const allSelected = ids.every((id) => selectedIds.includes(id));
        setSelectedIds((prev) =>
            allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])],
        );
    };

    const isSectionSelected = (sec: Section) =>
        sec.students.length > 0 && sec.students.every((s) => selectedIds.includes(s.stu_id));

    const isSectionPartial = (sec: Section) =>
        sec.students.some((s) => selectedIds.includes(s.stu_id)) && !isSectionSelected(sec);

    const handleAdd = () => {
        if (selectedIds.length === 0) return;
        setProcessing(true);
        router.post(
            route('admin.subject.students.attach', subject.subj_id),
            { student_ids: selectedIds },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setAddOpen(false);
                    setSelectedIds([]);
                    setSearch('');
                },
                onFinish: () => setProcessing(false),
            },
        );
    };

    const handleRemove = (studentId: number) => {
        if (!confirm('Remove this student from the subject?')) return;
        setRemovingId(studentId);
        router.delete(
            route('admin.subject.students.detach', { id: subject.subj_id, studentId }),
            {
                preserveScroll: true,
                onFinish: () => setRemovingId(null),
            },
        );
    };

    const handleDialogClose = (open: boolean) => {
        if (!open) {
            setAddOpen(false);
            setSelectedIds([]);
            setSearch('');
        }
    };

    return (
        <AdminLayout>
            <Head title={subject.subj_name ?? 'Subject'} />

            <div className="space-y-6 px-5 py-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('admin.subject.index')}
                            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Back
                        </Link>
                        <div>
                            <h1 className="text-2xl font-semibold">
                                {subject.subj_name ?? '-'}
                            </h1>
                            {subject.subj_code && (
                                <span className="font-mono text-sm text-muted-foreground">
                                    {subject.subj_code}
                                </span>
                            )}
                        </div>
                    </div>

                    <Button variant="outline" onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Subject
                    </Button>
                </div>

                {/* Subject Details */}
                <div className="rounded-lg border bg-card p-5 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-base font-semibold">Subject Details</h2>
                    </div>
                    <dl className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground">Subject Code</dt>
                            <dd className="mt-1 font-mono text-sm font-medium">{subject.subj_code ?? '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground">Subject Name</dt>
                            <dd className="mt-1 text-sm font-medium">{subject.subj_name ?? '-'}</dd>
                        </div>
                        <div>
                            <dt className="text-xs font-medium text-muted-foreground">Status</dt>
                            <dd className="mt-1">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${subject.is_deleted ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {subject.is_deleted ? 'Archived' : 'Active'}
                                </span>
                            </dd>
                        </div>
                    </dl>
                </div>

                {/* Assigned Teachers */}
                <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b px-5 py-4">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-base font-semibold">Assigned Teachers</h2>
                        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                            {teachers.length}
                        </span>
                    </div>

                    {teachers.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <User className="h-10 w-10 opacity-25" />
                            <p className="text-sm">No teachers assigned yet.</p>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {teachers.map((teacher) => (
                                <li key={teacher.tch_id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                        {teacher.tch_fname.charAt(0)}{teacher.tch_lname.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">{fullName(teacher)}</p>
                                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                            {teacher.tch_email && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Mail className="h-3 w-3" />
                                                    {teacher.tch_email}
                                                </span>
                                            )}
                                            {teacher.contact_number && (
                                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                    <Phone className="h-3 w-3" />
                                                    {teacher.contact_number}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Enrolled Students */}
                <div className="rounded-lg border bg-card shadow-sm">
                    <div className="flex items-center gap-2 border-b px-5 py-4">
                        <GraduationCap className="h-5 w-5 text-muted-foreground" />
                        <h2 className="text-base font-semibold">Enrolled Students</h2>
                        <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                            {enrolledStudents.length}
                        </span>
                        <Button size="sm" onClick={() => setAddOpen(true)} className="ml-2">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add Students
                        </Button>
                    </div>

                    {enrolledStudents.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                            <GraduationCap className="h-10 w-10 opacity-25" />
                            <p className="text-sm">No students enrolled yet.</p>
                            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Add Students
                            </Button>
                        </div>
                    ) : (
                        <ul className="divide-y">
                            {enrolledStudents.map((student) => (
                                <li key={student.stu_id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                        {student.stu_fname.charAt(0)}{student.stu_lname.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium">
                                            {[student.stu_fname, student.stu_mname, student.stu_lname].filter(Boolean).join(' ')}
                                        </p>
                                        {student.lrn && (
                                            <span className="font-mono text-xs text-muted-foreground">
                                                LRN: {student.lrn}
                                            </span>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                        disabled={removingId === student.stu_id}
                                        onClick={() => handleRemove(student.stu_id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Edit Subject Modal */}
            <SubjectModal
                open={editOpen}
                onClose={() => setEditOpen(false)}
                onSuccess={handleSaveSuccess}
                subject={subject}
                mode="edit"
                storeRoute="admin.subject.store"
                updateRoute="admin.subject.update"
                gradeLevels={gradeLevels}
            />

            {/* Add Students Dialog */}
            <Dialog open={addOpen} onOpenChange={handleDialogClose}>
                <DialogContent className="max-h-[90vh] max-w-lg flex flex-col gap-0 p-0">
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle>Add Students to Subject</DialogTitle>
                    </DialogHeader>

                    <div className="px-6 pb-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or LRN…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto border-y">
                        {filteredSections.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
                                <GraduationCap className="h-8 w-8 opacity-25" />
                                <p className="text-sm">
                                    {search ? 'No students match your search.' : 'All students are already enrolled.'}
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredSections.map((sec) => (
                                    <div key={sec.sect_id}>
                                        {/* Section header — click to toggle entire section */}
                                        <button
                                            type="button"
                                            className={`flex w-full cursor-pointer items-center gap-3 px-6 py-2.5 text-left transition-colors ${
                                                isSectionSelected(sec)
                                                    ? 'bg-primary/10'
                                                    : 'bg-muted/40 hover:bg-muted/70'
                                            }`}
                                            onClick={() => toggleSection(sec)}
                                        >
                                            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
                                                isSectionSelected(sec)
                                                    ? 'bg-primary text-primary-foreground'
                                                    : isSectionPartial(sec)
                                                      ? 'bg-primary/40 text-primary-foreground'
                                                      : 'border bg-background text-muted-foreground'
                                            }`}>
                                                {(isSectionSelected(sec) || isSectionPartial(sec)) && (
                                                    <Check className="h-3.5 w-3.5" />
                                                )}
                                            </div>
                                            <span className="text-sm font-semibold">
                                                {sec.gr_level ? `Grade ${sec.gr_level} — ` : ''}{sec.sect_name}
                                            </span>
                                            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                {sec.students.length} student{sec.students.length !== 1 ? 's' : ''}
                                            </span>
                                        </button>

                                        {/* Students in section */}
                                        <ul className="divide-y divide-border/50">
                                            {sec.students.map((student) => (
                                                <li
                                                    key={student.stu_id}
                                                    className={`flex cursor-pointer items-center gap-3 py-2.5 pr-6 pl-10 transition-colors ${
                                                        selectedIds.includes(student.stu_id)
                                                            ? 'bg-primary/10'
                                                            : 'hover:bg-muted/50'
                                                    }`}
                                                    onClick={() => toggleSelect(student.stu_id)}
                                                >
                                                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                                                        selectedIds.includes(student.stu_id)
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-primary/10 text-primary'
                                                    }`}>
                                                        {selectedIds.includes(student.stu_id)
                                                            ? <Check className="h-3.5 w-3.5" />
                                                            : <>{student.stu_fname.charAt(0)}{student.stu_lname.charAt(0)}</>
                                                        }
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-medium">
                                                        {[student.stu_fname, student.stu_mname, student.stu_lname].filter(Boolean).join(' ')}
                                                    </p>
                                                        {student.lrn && (
                                                            <span className="font-mono text-xs text-muted-foreground">
                                                                LRN: {student.lrn}
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-4">
                        <span className="mr-auto text-sm text-muted-foreground">
                            {selectedIds.length > 0 ? `${selectedIds.length} of ${totalAvailable} selected` : 'None selected'}
                        </span>
                        <Button variant="outline" onClick={() => handleDialogClose(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleAdd} disabled={selectedIds.length === 0 || processing}>
                            {processing ? 'Enrolling…' : `Enroll ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
