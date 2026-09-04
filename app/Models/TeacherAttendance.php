<?php

namespace App\Models;

use Database\Factories\TeacherAttendanceFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TeacherAttendance extends Model
{
    /** @use HasFactory<TeacherAttendanceFactory> */
    use HasFactory;

    protected $table = 'teacher_attendance';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tch_id',
        'att_date',
        'time_in',
        'status',
        'remarks',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'att_date' => 'date:Y-m-d',
            'time_in' => 'datetime',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'tch_id', 'tch_id');
    }
}
