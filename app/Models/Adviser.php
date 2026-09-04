<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Adviser extends Model
{
    protected $table = 'adviser';

    protected $primaryKey = 'adviser_id';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'tch_id',
        'sect_id',
        'sy_id',
        'start_date',
        'end_date',
        'is_active',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class, 'tch_id', 'tch_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class, 'sect_id', 'sect_id');
    }

    public function schoolYear(): BelongsTo
    {
        return $this->belongsTo(School_Year::class, 'sy_id', 'sy_id');
    }
}
