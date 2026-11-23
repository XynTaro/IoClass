<?php

namespace App\Models;

use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class School_Year extends Model
{
    public const STATUS_CURRENT = 'current';

    public const STATUS_UPCOMING = 'upcoming';

    public const STATUS_ENDED = 'ended';

    public const STATUS_UNSCHEDULED = 'unscheduled';

    public const LAST_SYNCED_CACHE_KEY = 'school_year:last_synced_date';

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

    /**
     * Determine the temporal tracking status for a school year date range against a reference date.
     *
     * @return 'current'|'upcoming'|'ended'|'unscheduled'
     */
    public static function statusForDates(
        CarbonInterface|string|null $startDate,
        CarbonInterface|string|null $endDate,
        CarbonInterface|string|null $date = null,
    ): string {
        if (! $startDate || ! $endDate) {
            return self::STATUS_UNSCHEDULED;
        }

        $targetDate = ($date ? Carbon::parse($date) : now())->startOfDay();
        $start = Carbon::parse($startDate)->startOfDay();
        $end = Carbon::parse($endDate)->endOfDay();

        if ($targetDate->lt($start)) {
            return self::STATUS_UPCOMING;
        }

        if ($targetDate->gt($end)) {
            return self::STATUS_ENDED;
        }

        return self::STATUS_CURRENT;
    }

    /**
     * Determine whether a start/end date range covers the reference date (defaults to today).
     */
    public static function datesCoverDate(
        CarbonInterface|string $startDate,
        CarbonInterface|string $endDate,
        CarbonInterface|string|null $date = null,
    ): bool {
        return self::statusForDates($startDate, $endDate, $date) === self::STATUS_CURRENT;
    }

    /**
     * Get the temporal tracking status for this school year relative to the given date.
     *
     * @return 'current'|'upcoming'|'ended'|'unscheduled'
     */
    public function getTrackingStatus(CarbonInterface|string|null $date = null): string
    {
        return self::statusForDates($this->start_date, $this->end_date, $date);
    }

    /**
     * Check whether this school year's date range covers the given date (defaults to today).
     */
    public function coversDate(CarbonInterface|string|null $date = null): bool
    {
        return $this->getTrackingStatus($date) === self::STATUS_CURRENT;
    }

    /**
     * Check whether this school year has not yet started as of the given date.
     */
    public function isUpcoming(CarbonInterface|string|null $date = null): bool
    {
        return $this->getTrackingStatus($date) === self::STATUS_UPCOMING;
    }

    /**
     * Check whether this school year has already ended as of the given date.
     */
    public function isEnded(CarbonInterface|string|null $date = null): bool
    {
        return $this->getTrackingStatus($date) === self::STATUS_ENDED;
    }

    /**
     * Synchronize the active school year flag based on the given date (defaults to today).
     *
     * Deactivates deleted, upcoming, and ended school years (when explicit dates exist),
     * and activates the non-deleted school year whose date range covers the target date.
     */
    public static function syncActiveForDate(CarbonInterface|string|null $date = null): ?self
    {
        $targetDate = ($date ? Carbon::parse($date) : now())->toDateString();

        self::where('is_deleted', true)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        self::where('is_active', true)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->where(function ($query) use ($targetDate): void {
                $query->whereDate('start_date', '>', $targetDate)
                    ->orWhereDate('end_date', '<', $targetDate);
            })
            ->update(['is_active' => false]);

        $activeCurrent = self::where('is_deleted', false)
            ->where('is_active', true)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereDate('start_date', '<=', $targetDate)
            ->whereDate('end_date', '>=', $targetDate)
            ->orderByDesc('start_date')
            ->orderByDesc('sy_id')
            ->first();

        if ($activeCurrent) {
            self::where('is_active', true)
                ->where('sy_id', '!=', $activeCurrent->sy_id)
                ->update(['is_active' => false]);

            Cache::put(self::LAST_SYNCED_CACHE_KEY, $targetDate, now()->endOfDay());

            return $activeCurrent;
        }

        $matchingCurrent = self::where('is_deleted', false)
            ->whereNotNull('start_date')
            ->whereNotNull('end_date')
            ->whereDate('start_date', '<=', $targetDate)
            ->whereDate('end_date', '>=', $targetDate)
            ->orderByDesc('start_date')
            ->orderByDesc('sy_id')
            ->first();

        if ($matchingCurrent) {
            self::where('is_active', true)
                ->where('sy_id', '!=', $matchingCurrent->sy_id)
                ->update(['is_active' => false]);

            $matchingCurrent->update(['is_active' => true]);

            Cache::put(self::LAST_SYNCED_CACHE_KEY, $targetDate, now()->endOfDay());

            return $matchingCurrent->fresh();
        }

        Cache::put(self::LAST_SYNCED_CACHE_KEY, $targetDate, now()->endOfDay());

        return null;
    }

    /**
     * Run date-based active school year synchronization at most once per calendar day.
     */
    public static function syncActiveIfNeeded(): void
    {
        $today = now()->toDateString();

        if (Cache::get(self::LAST_SYNCED_CACHE_KEY) === $today) {
            return;
        }

        self::syncActiveForDate($today);
    }

    /**
     * Clear the cached sync marker so the next check re-evaluates immediately.
     */
    public static function forgetSyncCache(): void
    {
        Cache::forget(self::LAST_SYNCED_CACHE_KEY);
    }
}
