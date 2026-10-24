<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;

class School_Year extends Model
{
    public $timestamps = false;

    protected $table = 'school_year';

    protected $primaryKey = 'sy_id';

    protected $fillable = [
        'sy_label',
        'start_date',
        'end_date',
        'sem1_start_date',
        'sem1_end_date',
        'sem2_start_date',
        'sem2_end_date',
        'is_active',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'sem1_start_date' => 'date',
            'sem1_end_date' => 'date',
            'sem2_start_date' => 'date',
            'sem2_end_date' => 'date',
            'is_active' => 'boolean',
            'is_deleted' => 'boolean',
        ];
    }

    /**
     * Determine the semester for a given date.
     *
     * Prioritizes explicit 1st and 2nd semester date boundaries. If not defined,
     * falls back to the school year midpoint calculation.
     */
    public function getSemester(CarbonInterface|string|null $date = null): string
    {
        $targetDate = $date ? Carbon::parse($date)->startOfDay() : now()->startOfDay();

        // 1. Explicit 1st Semester range
        if ($this->sem1_start_date && $this->sem1_end_date) {
            $sem1Start = Carbon::parse($this->sem1_start_date)->startOfDay();
            $sem1End = Carbon::parse($this->sem1_end_date)->endOfDay();
            if ($targetDate->gte($sem1Start) && $targetDate->lte($sem1End)) {
                return 'First Semester';
            }
        }

        // 2. Explicit 2nd Semester range
        if ($this->sem2_start_date && $this->sem2_end_date) {
            $sem2Start = Carbon::parse($this->sem2_start_date)->startOfDay();
            $sem2End = Carbon::parse($this->sem2_end_date)->endOfDay();
            if ($targetDate->gte($sem2Start) && $targetDate->lte($sem2End)) {
                return 'Second Semester';
            }
        }

        // 3. One-sided explicit boundaries
        if ($this->sem1_end_date && $targetDate->lte(Carbon::parse($this->sem1_end_date)->endOfDay())) {
            return 'First Semester';
        }
        if ($this->sem2_start_date && $targetDate->gte(Carbon::parse($this->sem2_start_date)->startOfDay())) {
            return 'Second Semester';
        }

        // 4. Fallback to school year midpoint calculation
        if ($this->start_date && $this->end_date) {
            $syStart = Carbon::parse($this->start_date)->startOfDay();
            $syEnd = Carbon::parse($this->end_date)->endOfDay();
            $midpoint = $syStart->copy()->addDays((int) ($syStart->diffInDays($syEnd) / 2));

            return $targetDate->lte($midpoint) ? 'First Semester' : 'Second Semester';
        }

        return 'First Semester';
    }
}
