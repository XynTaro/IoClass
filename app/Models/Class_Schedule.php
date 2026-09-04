<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Class_Schedule extends Model
{
    protected $table = 'class_schedule';

    protected $primaryKey = 'schedule_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tch_id',
        'subj_id',
        'sect_id',
        'room_id',
        'sy_id',
        'day_of_week',
        'start_time',
        'end_time',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_time' => 'datetime:H:i',
            'end_time' => 'datetime:H:i',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'tch_id', 'tch_id');
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'subj_id', 'subj_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'sect_id', 'sect_id');
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class, 'room_id', 'room_id');
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(School_Year::class, 'sy_id', 'sy_id');
    }
}
