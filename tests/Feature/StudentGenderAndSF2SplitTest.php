
<?php

use App\Models\Admin;
use App\Models\Student;
use App\Models\Teacher;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

test('admin can create a student with gender and optional photo', function () {
    Storage::fake('public');

    $admin = Admin::create([
        'adm_fname' => 'Super',
        'adm_lname' => 'Admin',
        'adm_email' => 'admin.gender@example.com',
        'adm_pw' => 'password123',
    ]);

    $sectionId = DB::table('section')->insertGetId([
        'sect_name' => 'Diamond',
        'gr_level' => '10',
        'is_deleted' => false,
    ], 'sect_id');

    $photoFile = UploadedFile::fake()->image('student_avatar.jpg', 200, 200);

    $response = $this->actingAs($admin, 'admin')->post(route('admin.student.store'), [
        'stu_fname' => 'Maria',
        'stu_mname' => 'Santos',
        'stu_lname' => 'Clara',
        'gender' => 'female',
        'lrn' => '123456789012',
        'sect_id' => $sectionId,
        'rfid_uid' => 'RFIDFEMALE01',
        'photo' => $photoFile,
    ]);

    $response->assertRedirect();

    $student = Student::where('rfid_uid', 'RFIDFEMALE01')->first();
    expect($student)->not->toBeNull();
    expect($student->gender)->toBe('female');
    expect($student->photo)->not->toBeNull();
    Storage::disk('public')->assertExists($student->photo);
});

test('admin can update student gender and replace photo', function () {
    Storage::fake('public');

    $admin = Admin::create([
        'adm_fname' => 'Super',
        'adm_lname' => 'Admin',
        'adm_email' => 'admin.update.gender@example.com',
        'adm_pw' => 'password123',
    ]);

    $sectionId = DB::table('section')->insertGetId([
        'sect_name' => 'Emerald',
        'gr_level' => '9',
        'is_deleted' => false,
    ], 'sect_id');

    $oldPhoto = UploadedFile::fake()->image('old.png');
    $oldPath = Storage::disk('public')->putFile('students', $oldPhoto);

    $student = Student::create([
        'stu_fname' => 'Juan',
        'stu_lname' => 'Dela Cruz',
        'gender' => 'male',
        'photo' => $oldPath,
        'rfid_uid' => 'RFIDUPDATE01',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $newPhoto = UploadedFile::fake()->image('new.jpg');

    $response = $this->actingAs($admin, 'admin')->put(route('admin.student.update', ['id' => $student->stu_id]), [
        'stu_fname' => 'Juan',
        'stu_lname' => 'Dela Cruz',
        'rfid_uid' => 'RFIDUPDATE01',
        'gender' => 'male',
        'photo' => $newPhoto,
    ]);

    $response->assertSessionHasNoErrors();
    $response->assertRedirect();

    $student->refresh();
    expect($student->photo)->not->toBe($oldPath);
    Storage::disk('public')->assertMissing($oldPath);
    Storage::disk('public')->assertExists($student->photo);
});

test('teacher sf2 report segregates male and female students and exports excel correctly', function () {
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'start_date' => '2025-06-01',
        'end_date' => '2026-05-31',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Sapphire',
        'gr_level' => '8',
        'is_deleted' => false,
    ], 'sect_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Grace',
        'tch_lname' => 'Perez',
        'tch_email' => 'grace.perez.sf2@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
        'must_change_password' => false,
    ]);

    DB::table('adviser')->insert([
        'tch_id' => $teacher->tch_id,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'is_active' => true,
    ]);

    // Create male students
    $maleStudent1 = Student::create([
        'stu_fname' => 'Aaron',
        'stu_lname' => 'Alvarez',
        'gender' => 'male',
        'rfid_uid' => 'MALE01',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $maleStudent2 = Student::create([
        'stu_fname' => 'Ben',
        'stu_lname' => 'Bautista',
        'gender' => 'male',
        'rfid_uid' => 'MALE02',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    // Create female students
    $femaleStudent1 = Student::create([
        'stu_fname' => 'Catherine',
        'stu_lname' => 'Cortez',
        'gender' => 'female',
        'rfid_uid' => 'FEMALE01',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    $femaleStudent2 = Student::create([
        'stu_fname' => 'Diana',
        'stu_lname' => 'Domingo',
        'gender' => 'female',
        'rfid_uid' => 'FEMALE02',
        'status' => 'active',
        'is_deleted' => false,
    ]);

    // Enroll in section
    foreach ([$maleStudent1, $maleStudent2, $femaleStudent1, $femaleStudent2] as $st) {
        DB::table('student_section')->insert([
            'stu_id' => $st->stu_id,
            'sect_id' => $sectId,
            'sy_id' => $syId,
        ]);
    }

    // Insert sample attendance in October 2025 (e.g. 2025-10-06 is Monday)
    DB::table('attendance')->insert([
        [
            'stu_id' => $maleStudent1->stu_id,
            'sect_id' => $sectId,
            'att_date' => '2025-10-06',
            'status' => 'present',
        ],
        [
            'stu_id' => $femaleStudent1->stu_id,
            'sect_id' => $sectId,
            'att_date' => '2025-10-06',
            'status' => 'present',
        ],
        [
            'stu_id' => $femaleStudent2->stu_id,
            'sect_id' => $sectId,
            'att_date' => '2025-10-06',
            'status' => 'absent',
        ],
    ]);

    // Verify index returns segregated data
    $response = $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.index', [
            'sy_id' => $syId,
            'month' => 10,
        ]))
        ->assertOk();

    $response->assertInertia(fn ($page) => $page
        ->component('Teacher/SF2-REPORTS/index')
        ->has('rows', 4)
        ->has('maleSummaryByDay')
        ->has('femaleSummaryByDay')
        ->has('summaryByDay')
    );

    // Verify SF2 export returns spreadsheet download
    $exportResponse = $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.sf2-reports.export', [
            'sy_id' => $syId,
            'month' => 10,
        ]))
        ->assertOk()
        ->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    expect($exportResponse->headers->get('content-disposition'))->toContain('attachment');
});
