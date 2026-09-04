<?php

use App\Models\Teacher;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config(['rfid.device_token' => null]);
});

/**
 * @return array{syId: int, sectId: int, subjId: int, teacher: Teacher}
 */
function seedVerificationAssignment(): array
{
    $syId = DB::table('school_year')->insertGetId([
        'sy_label' => '2025-2026',
        'is_active' => true,
        'is_deleted' => false,
    ], 'sy_id');

    $sectId = DB::table('section')->insertGetId([
        'sect_name' => 'Saturn',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'sect_id');

    $subjId = DB::table('subject')->insertGetId([
        'subj_code' => 'MATH7',
        'subj_name' => 'Mathematics 7',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'subj_id');

    $teacher = Teacher::create([
        'tch_fname' => 'Ava',
        'tch_lname' => 'Reyes',
        'tch_email' => 'ava.reyes.verify@example.com',
        'tch_pw' => 'password123',
        'is_deleted' => false,
    ]);

    $roomId = DB::table('room')->insertGetId([
        'room_no' => 'R-101',
        'is_deleted' => false,
    ], 'room_id');

    DB::table('class_schedule')->insert([
        'tch_id' => $teacher->tch_id,
        'subj_id' => $subjId,
        'sect_id' => $sectId,
        'room_id' => $roomId,
        'sy_id' => $syId,
        'day_of_week' => 'Monday',
        'start_time' => '08:00:00',
        'end_time' => '09:00:00',
    ]);

    return compact('syId', 'sectId', 'subjId', 'teacher');
}

test('subject teacher can see absent students for their scheduled subject', function () {
    ['syId' => $syId, 'sectId' => $sectId, 'subjId' => $subjId, 'teacher' => $teacher] = seedVerificationAssignment();

    $presentId = DB::table('student')->insertGetId([
        'lrn' => '111111111111',
        'rfid_uid' => 'VERIFP001',
        'stu_fname' => 'Leo',
        'stu_lname' => 'Diaz',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    $absentId = DB::table('student')->insertGetId([
        'lrn' => '222222222222',
        'rfid_uid' => 'VERIFA001',
        'stu_fname' => 'Mia',
        'stu_lname' => 'Santos',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        ['stu_id' => $presentId, 'sect_id' => $sectId, 'sy_id' => $syId],
        ['stu_id' => $absentId, 'sect_id' => $sectId, 'sy_id' => $syId],
    ]);

    DB::table('attendance')->insert([
        'stu_id' => $presentId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
        'subj_id' => $subjId,
        'att_date' => '2026-06-01',
        'status' => 'present',
        'time_in' => '08:05:00',
    ]);

    $this->actingAs($teacher, 'teacher')
        ->get(route('teacher.verification.index', [
            'date' => '2026-06-01',
            'subj_id' => $subjId,
            'sect_id' => $sectId,
        ]))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('Teacher/Verification/index')
            ->where('date', '2026-06-01')
            ->where('selected.subj_id', $subjId)
            ->where('selected.sect_id', $sectId)
            ->where('selected.subj_name', 'Mathematics 7')
            ->has('rows', 1)
            ->where('rows.0.stu_id', $absentId)
        );
});

test('subject teacher can excuse an absent student for a subject date', function () {
    ['syId' => $syId, 'sectId' => $sectId, 'subjId' => $subjId, 'teacher' => $teacher] = seedVerificationAssignment();

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '333333333333',
        'rfid_uid' => 'EXCUSE001',
        'stu_fname' => 'Nina',
        'stu_lname' => 'Lopez',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->post(route('teacher.verification.confirm'), [
            'date' => '2026-06-01',
            'subj_id' => $subjId,
            'sect_id' => $sectId,
            'rows' => [
                ['stu_id' => $stuId, 'status' => 'excused'],
            ],
        ])
        ->assertRedirect(route('teacher.verification.index', [
            'date' => '2026-06-01',
            'subj_id' => $subjId,
            'sect_id' => $sectId,
        ]));

    $record = DB::table('attendance')
        ->where('stu_id', $stuId)
        ->where('subj_id', $subjId)
        ->whereDate('att_date', '2026-06-01')
        ->first();

    expect($record)->not->toBeNull()
        ->and($record->status)->toBe('excused')
        ->and((int) $record->sect_id)->toBe($sectId);
});

test('teacher cannot verify a subject they do not teach', function () {
    ['syId' => $syId, 'sectId' => $sectId, 'teacher' => $teacher] = seedVerificationAssignment();

    $otherSubjId = DB::table('subject')->insertGetId([
        'subj_code' => 'SCI7',
        'subj_name' => 'Science 7',
        'gr_level' => 'Grade 7',
        'is_deleted' => false,
    ], 'subj_id');

    $stuId = DB::table('student')->insertGetId([
        'lrn' => '444444444444',
        'stu_fname' => 'Kai',
        'stu_lname' => 'Cruz',
        'status' => 'active',
        'is_deleted' => false,
    ], 'stu_id');

    DB::table('student_section')->insert([
        'stu_id' => $stuId,
        'sect_id' => $sectId,
        'sy_id' => $syId,
    ]);

    $this->actingAs($teacher, 'teacher')
        ->from(route('teacher.verification.index'))
        ->post(route('teacher.verification.confirm'), [
            'date' => '2026-06-01',
            'subj_id' => $otherSubjId,
            'sect_id' => $sectId,
            'rows' => [
                ['stu_id' => $stuId, 'status' => 'present'],
            ],
        ])
        ->assertRedirect(route('teacher.verification.index'))
        ->assertSessionHasErrors('verification');

    expect(DB::table('attendance')->where('stu_id', $stuId)->exists())->toBeFalse();
});
