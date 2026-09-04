<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Building extends Model
{
    protected $table = 'building';

    protected $primaryKey = 'building_id';

    public $timestamps = false;

    protected $fillable = [
        'building_name',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
        ];
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class, 'building_id', 'building_id');
    }
}
