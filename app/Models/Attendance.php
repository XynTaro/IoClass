<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Attendance extends Model
{
    protected $table = 'attendance';

    protected $primaryKey = 'att_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'stu_id',
        'session_id',
        'subj_id',
        'sect_id',
        'sy_id',
        'att_date',
        'time_in',
        'status',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'att_date' => 'date',
            'time_in' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'stu_id', 'stu_id');
    }
}
