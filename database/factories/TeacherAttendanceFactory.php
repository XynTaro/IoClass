<?php

namespace Database\Factories;

use App\Models\Teacher;
use App\Models\TeacherAttendance;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TeacherAttendance>
 */
class TeacherAttendanceFactory extends Factory
{
    protected $model = TeacherAttendance::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'tch_id' => Teacher::factory(),
            'att_date' => now()->toDateString(),
            'time_in' => now(),
            'status' => 'present',
            'remarks' => null,
        ];
    }
}
