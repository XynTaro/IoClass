<?php

namespace App\Models;

use Database\Factories\GuardianFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Guardian extends Model
{
    /** @use HasFactory<GuardianFactory> */
    use HasFactory;

    protected $table = 'parentguardian';

    protected $primaryKey = 'guardian_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'guardian_mname',
        'guardian_lname',
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
