<?php

namespace App\Models;

use Database\Factories\AddressFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Address extends Model
{
    /** @use HasFactory<AddressFactory> */
    use HasFactory;

    protected $table = 'address';

    protected $primaryKey = 'add_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'region',
        'province',
        'municipality',
        'barangay',
        'add_type', // 'current' or 'permanent'
    ];
}
