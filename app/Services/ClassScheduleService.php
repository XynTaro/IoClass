<?php

namespace App\Services;

use App\Models\Adviser;
use App\Models\Class_Schedule;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ClassScheduleService
{
    /**
     * @return list<string>
     */
    public static function daysOfWeek(): array
    {
        return [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function slotValidationRules(string $prefix = 'schedules'): array
    {
        $days = implode(',', self::daysOfWeek());

        return [
            $prefix => 'nullable|array',
            "{$prefix}.*.sect_id" => 'required|integer|exists:section,sect_id',
            "{$prefix}.*.room_id" => 'required|integer|exists:room,room_id',
            "{$prefix}.*.subj_id" => 'required|integer|exists:subject,subj_id',
            "{$prefix}.*.days" => 'required|array|min:1',
            "{$prefix}.*.days.*" => "required|string|in:{$days}",
            "{$prefix}.*.start_time" => 'required|date_format:H:i',
            "{$prefix}.*.end_time" => 'required|date_format:H:i',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function adviserValidationRules(): array
    {
        return [
            'is_adviser' => 'boolean',
            'adviser_sect_id' => 'nullable|required_if:is_adviser,true,1|integer|exists:section,sect_id',
        ];
    }

    /**
     * @param  list<array{sect_id: int, room_id: int, subj_id: int, days: list<string>, start_time: string, end_time: string}>  $slots
     */
    public function createFromSlots(int $teacherId, array $slots): int
    {
        $syId = DB::table('school_year')->where('is_active', true)->value('sy_id');

        if ($syId === null) {
            throw ValidationException::withMessages([
                'schedules' => 'No active school year is configured.',
            ]);
        }

        $this->assertValidSlotTimes($slots, 'schedules');
        $this->assertNoIntraBatchConflicts($teacherId, $slots, 'schedules');
        $this->assertNoDatabaseConflicts($teacherId, $slots, $syId, null, 'schedules');

        $created = 0;

        foreach ($slots as $slot) {
            foreach ($slot['days'] as $day) {
                Class_Schedule::create([
                    'tch_id' => $teacherId,
                    'sect_id' => $slot['sect_id'],
                    'room_id' => $slot['room_id'],
                    'subj_id' => $slot['subj_id'],
                    'sy_id' => $syId,
                    'day_of_week' => $day,
                    'start_time' => $slot['start_time'],
                    'end_time' => $slot['end_time'],
                ]);

                $created++;
            }
        }

        return $created;
    }

    /**
     * @param  array{sect_id: int, room_id: int, subj_id: int, day_of_week: string, start_time: string, end_time: string, tch_id?: int}  $data
     */
    public function updateSchedule(Class_Schedule $schedule, array $data): Class_Schedule
    {
        $syId = $schedule->sy_id ?? DB::table('school_year')->where('is_active', true)->value('sy_id');

        if ($syId === null) {
            throw ValidationException::withMessages([
                'start_time' => 'No active school year is configured.',
            ]);
        }

        $teacherId = (int) ($data['tch_id'] ?? $schedule->tch_id);
        $slot = [
            'sect_id' => (int) $data['sect_id'],
            'room_id' => (int) $data['room_id'],
            'subj_id' => (int) $data['subj_id'],
            'days' => [$data['day_of_week']],
            'start_time' => $data['start_time'],
            'end_time' => $data['end_time'],
        ];

        $this->assertValidSlotTimes([$slot], '');
        $this->assertNoDatabaseConflicts($teacherId, [$slot], $syId, $schedule->schedule_id, '');

        $schedule->update([
            'tch_id' => $teacherId,
            'sect_id' => $slot['sect_id'],
            'room_id' => $slot['room_id'],
            'subj_id' => $slot['subj_id'],
            'day_of_week' => $data['day_of_week'],
            'start_time' => $slot['start_time'],
            'end_time' => $slot['end_time'],
        ]);

        return $schedule;
    }

    public function createAdviser(int $teacherId, int $sectionId): void
    {
        $syId = DB::table('school_year')->where('is_active', true)->value('sy_id');

        if ($syId === null) {
            throw ValidationException::withMessages([
                'adviser_sect_id' => 'No active school year is configured.',
            ]);
        }

        Adviser::create([
            'tch_id' => $teacherId,
            'sect_id' => $sectionId,
            'sy_id' => $syId,
            'is_active' => true,
        ]);
    }

    /**
     * @param  list<array{sect_id: int, room_id: int, subj_id: int, days: list<string>, start_time: string, end_time: string}>  $slots
     */
    private function assertValidSlotTimes(array $slots, string $prefix = 'schedules'): void
    {
        foreach ($slots as $index => $slot) {
            if ($slot['end_time'] <= $slot['start_time']) {
                $fieldKey = $prefix !== '' ? "{$prefix}.{$index}.end_time" : 'end_time';

                throw ValidationException::withMessages([
                    $fieldKey => 'End time must be after start time.',
                ]);
            }
        }
    }

    /**
     * @param  list<array{sect_id: int, room_id: int, subj_id: int, days: list<string>, start_time: string, end_time: string}>  $slots
     */
    private function assertNoIntraBatchConflicts(int $teacherId, array $slots, string $prefix = 'schedules'): void
    {
        /** @var list<array{slot_index: int, tch_id: int, sect_id: int, room_id: int, subj_id: int, day: string, start_time: string, end_time: string}> $items */
        $items = [];

        foreach ($slots as $slotIndex => $slot) {
            $startTime = $this->normalizeTimeWithSeconds($slot['start_time']);
            $endTime = $this->normalizeTimeWithSeconds($slot['end_time']);
            $sectId = (int) $slot['sect_id'];
            $roomId = (int) $slot['room_id'];
            $subjId = (int) $slot['subj_id'];

            foreach ($slot['days'] as $day) {
                $items[] = [
                    'slot_index' => $slotIndex,
                    'tch_id' => $teacherId,
                    'sect_id' => $sectId,
                    'room_id' => $roomId,
                    'subj_id' => $subjId,
                    'day' => $day,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                ];
            }
        }

        $count = count($items);

        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                $a = $items[$i];
                $b = $items[$j];

                if ($a['day'] !== $b['day']) {
                    continue;
                }

                if ($a['start_time'] < $b['end_time'] && $a['end_time'] > $b['start_time']) {
                    $bIndex = $b['slot_index'];
                    $aSlotLabel = '#'.($a['slot_index'] + 1);
                    $bSlotLabel = '#'.($bIndex + 1);
                    $aDisplayTime = $this->normalizeTime($a['start_time']).' and '.$this->normalizeTime($a['end_time']);

                    if ($a['sect_id'] === $b['sect_id']) {
                        $key = $prefix !== '' ? "{$prefix}.{$bIndex}.sect_id" : 'sect_id';

                        throw ValidationException::withMessages([
                            $key => "Schedule slot {$bSlotLabel} conflicts with slot {$aSlotLabel}: Section already has a class scheduled on {$a['day']} between {$aDisplayTime}.",
                        ]);
                    }

                    if ($a['room_id'] === $b['room_id']) {
                        $key = $prefix !== '' ? "{$prefix}.{$bIndex}.room_id" : 'room_id';

                        throw ValidationException::withMessages([
                            $key => "Schedule slot {$bSlotLabel} conflicts with slot {$aSlotLabel}: Room is already assigned on {$a['day']} between {$aDisplayTime}.",
                        ]);
                    }

                    if ($a['tch_id'] === $b['tch_id']) {
                        $key = $prefix !== '' ? "{$prefix}.{$bIndex}.start_time" : 'start_time';

                        throw ValidationException::withMessages([
                            $key => "Schedule slot {$bSlotLabel} conflicts with slot {$aSlotLabel}: Teacher is already scheduled on {$a['day']} between {$aDisplayTime}.",
                        ]);
                    }
                }
            }
        }
    }

    /**
     * @param  list<array{sect_id: int, room_id: int, subj_id: int, days: list<string>, start_time: string, end_time: string}>  $slots
     */
    private function assertNoDatabaseConflicts(
        int $teacherId,
        array $slots,
        int $syId,
        ?int $ignoreScheduleId = null,
        string $prefix = 'schedules'
    ): void {
        foreach ($slots as $slotIndex => $slot) {
            $startTime = $this->normalizeTimeWithSeconds($slot['start_time']);
            $endTime = $this->normalizeTimeWithSeconds($slot['end_time']);
            $sectId = (int) $slot['sect_id'];
            $roomId = (int) $slot['room_id'];

            foreach ($slot['days'] as $day) {
                $query = Class_Schedule::with(['teacher', 'section', 'room', 'subject'])
                    ->where('sy_id', $syId)
                    ->where('day_of_week', $day)
                    ->where('start_time', '<', $endTime)
                    ->where('end_time', '>', $startTime)
                    ->where(function ($q) use ($teacherId, $sectId, $roomId) {
                        $q->where('tch_id', $teacherId)
                            ->orWhere('sect_id', $sectId)
                            ->orWhere('room_id', $roomId);
                    });

                if ($ignoreScheduleId !== null) {
                    $query->where('schedule_id', '!=', $ignoreScheduleId);
                }

                $conflict = $query->first();

                if ($conflict !== null) {
                    $cStart = $this->extractTime($conflict, 'start_time');
                    $cEnd = $this->extractTime($conflict, 'end_time');
                    $sectionName = $conflict->section?->sect_name ?? "Section #{$conflict->sect_id}";
                    $roomName = $conflict->room?->room_no ?? "Room #{$conflict->room_id}";
                    $subjectName = $conflict->subject?->subj_name ?? ($conflict->subject?->subj_code ?? "Subject #{$conflict->subj_id}");
                    $teacherName = $conflict->teacher
                        ? trim("{$conflict->teacher->tch_fname} {$conflict->teacher->tch_lname}")
                        : "Teacher #{$conflict->tch_id}";

                    $keyPrefix = $prefix !== '' ? "{$prefix}.{$slotIndex}." : '';

                    if ($conflict->tch_id === $teacherId) {
                        throw ValidationException::withMessages([
                            "{$keyPrefix}start_time" => "Teacher {$teacherName} already has a class on {$day} ({$cStart} - {$cEnd}) with Section {$sectionName} in Room {$roomName}.",
                        ]);
                    }

                    if ($conflict->sect_id === $sectId) {
                        throw ValidationException::withMessages([
                            "{$keyPrefix}sect_id" => "Section {$sectionName} already has {$subjectName} on {$day} ({$cStart} - {$cEnd}) in Room {$roomName}.",
                        ]);
                    }

                    if ($conflict->room_id === $roomId) {
                        throw ValidationException::withMessages([
                            "{$keyPrefix}room_id" => "Room {$roomName} is already occupied by Section {$sectionName} on {$day} ({$cStart} - {$cEnd}).",
                        ]);
                    }
                }
            }
        }
    }

    private function normalizeTime(string $time): string
    {
        $parts = explode(':', $time);
        $h = str_pad($parts[0] ?? '00', 2, '0', STR_PAD_LEFT);
        $m = str_pad($parts[1] ?? '00', 2, '0', STR_PAD_LEFT);

        return "{$h}:{$m}";
    }

    private function normalizeTimeWithSeconds(string $time): string
    {
        $parts = explode(':', $time);
        $h = str_pad($parts[0] ?? '00', 2, '0', STR_PAD_LEFT);
        $m = str_pad($parts[1] ?? '00', 2, '0', STR_PAD_LEFT);
        $s = str_pad($parts[2] ?? '00', 2, '0', STR_PAD_LEFT);

        return "{$h}:{$m}:{$s}";
    }

    private function extractTime(Class_Schedule $schedule, string $attribute): string
    {
        $raw = $schedule->getRawOriginal($attribute);

        if ($raw !== null && $raw !== '') {
            return $this->normalizeTime((string) $raw);
        }

        $value = $schedule->{$attribute};

        if ($value instanceof Carbon) {
            return $value->format('H:i');
        }

        if (is_string($value) && $value !== '') {
            return $this->normalizeTime($value);
        }

        return '';
    }
}
