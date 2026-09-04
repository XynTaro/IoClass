<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordResetOtp extends Model
{
    /**
     * @var list<string>
     */
    protected $fillable = [
        'phone',
        'account_type',
        'account_id',
        'code_hash',
        'attempts',
        'expires_at',
        'verified_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'verified_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }
}
