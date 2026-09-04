<?php

namespace App\Models;

use Database\Factories\FatherFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Father extends Model
{
    /** @use HasFactory<FatherFactory> */
    use HasFactory;

    protected $table = 'father';

    protected $primaryKey = 'f_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'father_name',
        'father_mname',
        'father_lname',
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
            'father_created' => 'datetime',
            'father_updated' => 'datetime',
        ];
    }
}
