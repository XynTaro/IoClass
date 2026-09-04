<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\DB;

class CalendarEvent extends Model
{
    protected $table = 'calendar_events';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'sy_id',
        'title',
        'description',
        'type',
        'start_date',
        'end_date',
        'is_school_day',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date:Y-m-d',
            'end_date' => 'date:Y-m-d',
            'is_school_day' => 'boolean',
        ];
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(School_Year::class, 'sy_id', 'sy_id');
    }

    /**
     * Scope to events that span a given date.
     */
    public function scopeForDate(Builder $query, string $date): Builder
    {
        $d = Carbon::parse($date)->toDateString();

        return $query->whereDate('start_date', '<=', $d)
            ->whereDate('end_date', '>=', $d);
    }

    /**
     * Scope to non-school-day events for a given school year.
     */
    public function scopeNonSchoolDays(Builder $query, int $syId): Builder
    {
        return $query->where('sy_id', $syId)
            ->where('is_school_day', false);
    }

    /**
     * Check whether a given date is a non-school day (holiday, break, suspension).
     *
     * Falls back to the active school year when $syId is null.
     */
    public static function isNonSchoolDay(string $date, ?int $syId = null): bool
    {
        if ($syId === null) {
            $syId = DB::table('school_year')
                ->where('is_active', true)
                ->value('sy_id');
        }

        if ($syId === null) {
            return false;
        }

        return static::query()
            ->where('sy_id', $syId)
            ->where('is_school_day', false)
            ->forDate($date)
            ->exists();
    }

    /**
     * Return the event title for a non-school day, or null if school is in session.
     *
     * @return array{title: string, type: string}|null
     */
    public static function nonSchoolDayInfo(string $date, ?int $syId = null): ?array
    {
        if ($syId === null) {
            $syId = DB::table('school_year')
                ->where('is_active', true)
                ->value('sy_id');
        }

        if ($syId === null) {
            return null;
        }

        $event = static::query()
            ->where('sy_id', $syId)
            ->where('is_school_day', false)
            ->forDate($date)
            ->first(['title', 'type']);

        if ($event === null) {
            return null;
        }

        return [
            'title' => $event->title,
            'type' => $event->type,
        ];
    }

    /**
     * Get all non-school-day dates within a date range for a school year.
     *
     * @return array<string, string> date => title
     */
    public static function nonSchoolDayDatesInRange(string $from, string $to, ?int $syId = null): array
    {
        if ($syId === null) {
            $syId = DB::table('school_year')
                ->where('is_active', true)
                ->value('sy_id');
        }

        if ($syId === null) {
            return [];
        }

        $events = static::query()
            ->where('sy_id', $syId)
            ->where('is_school_day', false)
            ->whereDate('start_date', '<=', $to)
            ->whereDate('end_date', '>=', $from)
            ->get(['title', 'start_date', 'end_date']);

        $result = [];

        foreach ($events as $event) {
            $current = $event->start_date->copy();
            $end = $event->end_date->copy();

            // Clamp to requested range
            if ($current->lt($from)) {
                $current = Carbon::parse($from);
            }
            if ($end->gt($to)) {
                $end = Carbon::parse($to);
            }

            while ($current->lte($end)) {
                $result[$current->toDateString()] = $event->title;
                $current->addDay();
            }
        }

        return $result;
    }
}
