<?php

use App\Http\Controllers\Admin\AdminAddressController;
use App\Http\Controllers\Admin\AdminAdminController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\AdminProfileController;
use App\Http\Controllers\Admin\AdminRfidController;
use App\Http\Controllers\Admin\AdminStudentController;
use App\Http\Controllers\Admin\AdminTeacherAttendanceController;
use App\Http\Controllers\Admin\AdminTeacherController;
use App\Http\Controllers\Admin\AuditTrailController;
use App\Http\Controllers\Admin\BuildingController;
use App\Http\Controllers\Admin\CalendarEventController;
use App\Http\Controllers\Admin\RoomController;
use App\Http\Controllers\Admin\ScheduleController;
use App\Http\Controllers\Admin\School_YearController;
use App\Http\Controllers\Admin\SectionController;
use App\Http\Controllers\Admin\SubjectController;
use App\Http\Controllers\Auth\ForgotPasswordController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\Teacher\TeacherAttendanceController;
use App\Http\Controllers\Teacher\TeacherDashboardController;
use App\Http\Controllers\Teacher\TeacherMyAttendanceController;
use App\Http\Controllers\Teacher\TeacherPasswordChangeController;
use App\Http\Controllers\Teacher\TeacherProfileController;
use App\Http\Controllers\Teacher\TeacherScheduleController;
use App\Http\Controllers\Teacher\TeacherSF2Controller;
use App\Http\Controllers\Teacher\TeacherStudentController;
use App\Http\Controllers\Teacher\TeacherStudentRecordController;
use App\Http\Controllers\Teacher\TeacherVerificationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('login', function () {
    return Inertia::render('login', [
        'status' => session('status'),
    ]);
})->name('login');

Route::post('login', [AuthController::class, 'login'])
    ->name('login.submit');

Route::post('/logout', [AuthController::class, 'logout'])
    ->name('logout');

Route::middleware('guest')->group(function () {
    Route::get('forgot-password', [ForgotPasswordController::class, 'create'])
        ->name('password.request');
    Route::post('forgot-password', [ForgotPasswordController::class, 'send'])
        ->middleware('throttle:password-reset-otp')
        ->name('password.otp.send');
    Route::get('forgot-password/verify', [ForgotPasswordController::class, 'showVerify'])
        ->name('password.otp.show');
    Route::post('forgot-password/verify', [ForgotPasswordController::class, 'verify'])
        ->middleware('throttle:password-reset-otp')
        ->name('password.otp.verify');
    Route::post('forgot-password/resend', [ForgotPasswordController::class, 'resend'])
        ->middleware('throttle:password-reset-otp')
        ->name('password.otp.resend');
    Route::get('forgot-password/reset', [ForgotPasswordController::class, 'showReset'])
        ->name('password.reset.show');
    Route::post('forgot-password/reset', [ForgotPasswordController::class, 'reset'])
        ->middleware('throttle:password-reset-otp')
        ->name('password.reset.update');
});

Route::middleware(['auth:admin', 'admin.password.changed', 'audit.admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index'])->name('dashboard');

    Route::get('/profile', [AdminProfileController::class, 'show'])->name('profile.show');
    Route::patch('/profile', [AdminProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [AdminProfileController::class, 'updatePassword'])->name('profile.password.update');
    Route::post('/profile/avatar', [AdminProfileController::class, 'updateAvatar'])->name('profile.avatar.update');

    Route::get('admin', [AdminAdminController::class, 'index'])->name('admin.index');
    Route::post('admin', [AdminAdminController::class, 'store'])->name('admin.store');
    Route::post('admin/complete', [AdminAdminController::class, 'storeWithAddress'])->name('admin.storeWithAddress');
    Route::put('admin/{admin}', [AdminAdminController::class, 'update'])->name('admin.update');
    Route::delete('admin/{admin}', [AdminAdminController::class, 'destroy'])->name('admin.destroy');
    Route::post('admin/{id}/restore', [AdminAdminController::class, 'restore'])->name('admin.restore');
    Route::delete('admin/{id}/force-delete', [AdminAdminController::class, 'forceDelete'])->name('admin.forceDelete');

    Route::get('teacher', [AdminTeacherController::class, 'index'])->name('teacher.index');
    Route::post('teacher', [AdminTeacherController::class, 'store'])->name('teacher.store');
    Route::post('teacher/complete', [AdminTeacherController::class, 'storeWithAddress'])->name('teacher.storeWithAddress');
    Route::put('teacher/{teacher}', [AdminTeacherController::class, 'update'])->name('teacher.update');
    Route::delete('teacher/{teacher}', [AdminTeacherController::class, 'destroy'])->name('teacher.destroy');
    Route::post('teacher/{id}/restore', [AdminTeacherController::class, 'restore'])->name('teacher.restore');
    Route::delete('teacher/{id}/force-delete', [AdminTeacherController::class, 'forceDelete'])->name('teacher.forceDelete');

    Route::get('teacher-attendance', [AdminTeacherAttendanceController::class, 'index'])->name('teacher-attendance.index');
    Route::put('teacher-attendance/{teacherId}', [AdminTeacherAttendanceController::class, 'update'])->name('teacher-attendance.update');

    Route::get('schedule', [ScheduleController::class, 'index'])->name('schedule.index');
    Route::get('schedule/section/{sectionId}', [ScheduleController::class, 'showSection'])->name('schedule.section.show');
    Route::post('schedule', [ScheduleController::class, 'store'])->name('schedule.store');
    Route::put('schedule/{schedule}', [ScheduleController::class, 'update'])->name('schedule.update');
    Route::delete('schedule/{schedule}', [ScheduleController::class, 'destroy'])->name('schedule.destroy');

    Route::get('address', [AdminAddressController::class, 'index'])->name('address.index');
    Route::post('address', [AdminAddressController::class, 'store'])->name('address.store');
    Route::put('address/{id}', [AdminAddressController::class, 'update'])->name('address.update');
    Route::delete('address/{address}', [AdminAddressController::class, 'destroy'])->name('address.destroy');

    Route::get('rfid/registry', [AdminRfidController::class, 'registry'])->name('rfid.registry');
    Route::get('rfid/last-capture', [AdminRfidController::class, 'lastCapture'])->name('rfid.lastCapture');

    Route::get('student', [AdminStudentController::class, 'index'])->name('student.index');
    Route::post('student', [AdminStudentController::class, 'store'])->name('student.store');
    Route::post('student/promote', [AdminStudentController::class, 'promote'])->name('student.promote');
    Route::put('student/{id}', [AdminStudentController::class, 'update'])->name('student.update');
    Route::delete('student/{student}', [AdminStudentController::class, 'destroy'])->name('student.destroy');
    Route::post('student/{id}/restore', [AdminStudentController::class, 'restore'])->name('student.restore');
    Route::delete('student/{id}/force-delete', [AdminStudentController::class, 'forceDelete'])->name('student.forceDelete');

    Route::get('subject', [SubjectController::class, 'index'])->name('subject.index');
    Route::get('subject/{id}', [SubjectController::class, 'show'])->name('subject.show');
    Route::post('subject', [SubjectController::class, 'store'])->name('subject.store');
    Route::put('subject/{id}', [SubjectController::class, 'update'])->name('subject.update');
    Route::delete('subject/{subject}', [SubjectController::class, 'destroy'])->name('subject.destroy');
    Route::post('subject/{id}/restore', [SubjectController::class, 'restore'])->name('subject.restore');
    Route::delete('subject/{id}/force-delete', [SubjectController::class, 'forceDelete'])->name('subject.forceDelete');
    Route::post('subject/{id}/students', [SubjectController::class, 'attachStudents'])->name('subject.students.attach');
    Route::delete('subject/{id}/students/{studentId}', [SubjectController::class, 'detachStudent'])->name('subject.students.detach');

    Route::get('building', [BuildingController::class, 'index'])->name('building.index');
    Route::post('building', [BuildingController::class, 'store'])->name('building.store');
    Route::put('building/{id}', [BuildingController::class, 'update'])->name('building.update');
    Route::delete('building/{id}', [BuildingController::class, 'destroy'])->name('building.destroy');
    Route::post('building/{id}/restore', [BuildingController::class, 'restore'])->name('building.restore');
    Route::delete('building/{id}/force-delete', [BuildingController::class, 'forceDelete'])->name('building.forceDelete');

    Route::get('room', [RoomController::class, 'index'])->name('room.index');
    Route::post('room', [RoomController::class, 'store'])->name('room.store');
    Route::put('room/{id}', [RoomController::class, 'update'])->name('room.update');
    Route::delete('room/{room}', [RoomController::class, 'destroy'])->name('room.destroy');
    Route::post('room/{id}/restore', [RoomController::class, 'restore'])->name('room.restore');
    Route::delete('room/{id}/force-delete', [RoomController::class, 'forceDelete'])->name('room.forceDelete');

    Route::get('section', [SectionController::class, 'index'])->name('section.index');
    Route::post('section', [SectionController::class, 'store'])->name('section.store');
    Route::put('section/{id}', [SectionController::class, 'update'])->name('section.update');
    Route::delete('section/{section}', [SectionController::class, 'destroy'])->name('section.destroy');
    Route::post('section/{id}/restore', [SectionController::class, 'restore'])->name('section.restore');
    Route::delete('section/{id}/force-delete', [SectionController::class, 'forceDelete'])->name('section.forceDelete');

    Route::get('calendar', [CalendarEventController::class, 'index'])->name('calendar.index');
    Route::post('calendar', [CalendarEventController::class, 'store'])->name('calendar.store');
    Route::put('calendar/{id}', [CalendarEventController::class, 'update'])->name('calendar.update');
    Route::delete('calendar/{id}', [CalendarEventController::class, 'destroy'])->name('calendar.destroy');

    Route::get('audit-trail', [AuditTrailController::class, 'index'])->name('audit-trail.index');

    Route::get('school-year', [School_YearController::class, 'index'])->name('school-year.index');
    Route::post('school-year', [School_YearController::class, 'store'])->name('school-year.store');
    Route::put('school-year/{id}', [School_YearController::class, 'update'])->name('school-year.update');
    Route::delete('school-year/{school_Year}', [School_YearController::class, 'destroy'])->name('school-year.destroy');
    Route::post('school-year/{id}/restore', [School_YearController::class, 'restore'])->name('school-year.restore');
    Route::delete('school-year/{id}/force-delete', [School_YearController::class, 'forceDelete'])->name('school-year.forceDelete');
});

Route::middleware(['auth:teacher'])->prefix('teacher')->name('teacher.')->group(function () {
    Route::get('/change-password', [TeacherPasswordChangeController::class, 'show'])->name('password.change');
    Route::post('/change-password', [TeacherPasswordChangeController::class, 'update'])->name('password.update');
});

Route::middleware(['auth:teacher', 'teacher.password.changed'])->prefix('teacher')->name('teacher.')->group(function () {
    Route::get('/profile', [TeacherProfileController::class, 'show'])->name('profile.show');
    Route::patch('/profile', [TeacherProfileController::class, 'update'])->name('profile.update');
    Route::put('/profile/password', [TeacherProfileController::class, 'updatePassword'])->name('profile.password.update');
    Route::post('/profile/avatar', [TeacherProfileController::class, 'updateAvatar'])->name('profile.avatar.update');

    Route::get('/dashboard', [TeacherDashboardController::class, 'index'])->name('dashboard');

    Route::get('students', [TeacherStudentController::class, 'index'])->name('students.index');

    Route::get('schedule', [TeacherScheduleController::class, 'index'])->name('schedule.index');

    Route::get('attendance', [TeacherAttendanceController::class, 'index'])->name('attendance.index');
    Route::get('my-attendance', [TeacherMyAttendanceController::class, 'index'])->name('my-attendance.index');

    Route::get('verification', [TeacherVerificationController::class, 'index'])->name('verification.index');
    Route::post('verification/confirm', [TeacherVerificationController::class, 'confirm'])->name('verification.confirm');

    Route::get('student-records', [TeacherStudentRecordController::class, 'index'])->name('student-records.index');
    Route::get('student-records/{student}', [TeacherStudentRecordController::class, 'show'])->name('student-records.show');

    Route::get('sf2-reports', [TeacherSF2Controller::class, 'index'])->name('sf2-reports.index');
    Route::get('sf2-reports/export', [TeacherSF2Controller::class, 'export'])->name('sf2-reports.export');
});

require __DIR__.'/settings.php';
