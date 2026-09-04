<?php

namespace App\Models;

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
        'is_active',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_active' => 'boolean',
            'is_deleted' => 'boolean',
        ];
    }
}
