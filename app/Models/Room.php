<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Room extends Model
{
    protected $table = 'room';

    public $timestamps = false;

    protected $primaryKey = 'room_id';

    protected $fillable = [
        'room_no',
        'building_id',
        'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
        ];
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class, 'building_id', 'building_id');
    }
}
