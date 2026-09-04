<?php

namespace App\Models;

use Database\Factories\AdminFactory;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\Access\Authorizable;

class Admin extends Model implements Authenticatable
{
    /** @use HasFactory<AdminFactory> */
    use AuthenticatableTrait, Authorizable, HasFactory;

    protected $table = 'admin';

    protected $primaryKey = 'admin_id';

    public $incrementing = true;

    protected $keyType = 'int';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'add_id',
        'fname',
        'mname',
        'lname',
        'email',
        'pw',
        'contact_number',
        'is_deleted',
        'must_change_password',
        'avatar',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'pw',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
            'must_change_password' => 'boolean',
            'pw' => 'hashed',
        ];
    }

    /**
     * Column used for password verification (not `password`).
     */
    public function getAuthPassword(): string
    {
        return (string) $this->pw;
    }
}
