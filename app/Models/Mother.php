<?php

namespace App\Models;

use Database\Factories\MotherFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Mother extends Model
{
    /** @use HasFactory<MotherFactory> */
    use HasFactory;

    protected $table = 'mother';

    protected $primaryKey = 'mother_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'mother_name',
        'mother_mname',
        'mother_lname',
        'email',
        'contact_number',
        'is_deleted',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
            'is_created' => 'datetime',
            'is_updated' => 'datetime',
        ];
    }
}
