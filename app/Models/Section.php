<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Section extends Model
{
    protected $table = 'section';

    public $timestamps = false;

    protected $primaryKey = 'sect_id';

    protected $fillable = [
        'sect_name',
        'gr_level',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
        ];
    }

    public function schedules(): HasMany
    {
        return $this->hasMany(Class_Schedule::class, 'sect_id', 'sect_id');
    }
}
