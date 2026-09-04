<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\CalendarEvent;
use App\Models\School_Year;
use App\Models\Student;
use App\Services\StudentAbsenceNotifier;
use App\Services\StudentAttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CalendarEventTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    private School_Year $schoolYear;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = Admin::factory()->create([
            'must_change_password' => false,
        ]);

        $this->schoolYear = School_Year::create([
            'sy_label' => '2026-2027',
            'start_date' => '2026-06-01',
            'end_date' => '2027-03-31',
            'is_active' => true,
            'is_deleted' => false,
        ]);
    }

    public function test_admin_can_view_calendar_events(): void
    {
        $response = $this->actingAs($this->admin, 'admin')
            ->get(route('admin.calendar.index'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page->component('Admin/Calendar/Index'));
    }

    public function test_admin_can_create_calendar_event(): void
    {
        $response = $this->actingAs($this->admin, 'admin')
            ->post(route('admin.calendar.store'), [
                'sy_id' => $this->schoolYear->sy_id,
                'title' => 'National Heroes Day',
                'description' => 'Regular Holiday',
                'type' => 'holiday',
                'start_date' => '2026-08-31',
                'end_date' => '2026-08-31',
                'is_school_day' => false,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('calendar_events', [
            'sy_id' => $this->schoolYear->sy_id,
            'title' => 'National Heroes Day',
            'type' => 'holiday',
            'is_school_day' => false,
        ]);
    }

    public function test_admin_can_update_calendar_event(): void
    {
        $event = CalendarEvent::create([
            'sy_id' => $this->schoolYear->sy_id,
            'title' => 'Foundation Day',
            'type' => 'special_event',
            'start_date' => '2026-09-15',
            'end_date' => '2026-09-15',
            'is_school_day' => true,
        ]);

        $response = $this->actingAs($this->admin, 'admin')
            ->put(route('admin.calendar.update', $event->id), [
                'title' => 'School Foundation Day',
                'type' => 'special_event',
                'start_date' => '2026-09-15',
                'end_date' => '2026-09-16',
                'is_school_day' => true,
            ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('calendar_events', [
            'id' => $event->id,
            'title' => 'School Foundation Day',
            'end_date' => '2026-09-16',
        ]);
    }

    public function test_admin_can_delete_calendar_event(): void
    {
        $event = CalendarEvent::create([
            'sy_id' => $this->schoolYear->sy_id,
            'title' => 'Typhoon Suspension',
            'type' => 'suspension',
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-01',
            'is_school_day' => false,
        ]);

        $response = $this->actingAs($this->admin, 'admin')
            ->delete(route('admin.calendar.destroy', $event->id));

        $response->assertRedirect();
        $this->assertDatabaseMissing('calendar_events', ['id' => $event->id]);
    }

    public function test_attendance_service_blocks_scans_on_non_school_days(): void
    {
        CalendarEvent::create([
            'sy_id' => $this->schoolYear->sy_id,
            'title' => 'Independence Day',
            'type' => 'holiday',
            'start_date' => '2026-06-12',
            'end_date' => '2026-06-12',
            'is_school_day' => false,
        ]);

        $student = Student::create([
            'lrn' => '123456789012',
            'stu_fname' => 'John',
            'stu_lname' => 'Doe',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $service = app(StudentAttendanceService::class);

        $result = $service->recordForStudent(
            $student,
            Carbon::parse('2026-06-12 08:30:00'),
        );

        $this->assertFalse($result['recorded']);
        $this->assertTrue($result['non_school_day']);
        $this->assertEquals('Independence Day', $result['event_title']);
        $this->assertDatabaseMissing('attendance', [
            'stu_id' => $student->stu_id,
            'att_date' => '2026-06-12',
        ]);
    }

    public function test_absence_notifier_skips_notifications_on_non_school_days(): void
    {
        CalendarEvent::create([
            'sy_id' => $this->schoolYear->sy_id,
            'title' => 'Christmas Break',
            'type' => 'break',
            'start_date' => '2026-12-20',
            'end_date' => '2026-12-31',
            'is_school_day' => false,
        ]);

        $student = Student::create([
            'lrn' => '123456789013',
            'stu_fname' => 'Jane',
            'stu_lname' => 'Doe',
            'status' => 'active',
            'is_deleted' => false,
        ]);
        $notifier = app(StudentAbsenceNotifier::class);

        $notified = $notifier->notify($student, '2026-12-25');
        $this->assertFalse($notified);
    }
}
