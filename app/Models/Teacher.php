<?php

namespace App\Models;

use Database\Factories\TeacherFactory;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\Access\Authorizable;

class Teacher extends Model implements Authenticatable
{
    /** @use HasFactory<TeacherFactory> */
    use AuthenticatableTrait, Authorizable, HasFactory;

    protected $table = 'teacher';

    protected $primaryKey = 'tch_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'add_id',
        'tch_rfid_uid',
        'master_card',
        'tch_fname',
        'tch_mname',
        'tch_lname',
        'tch_email',
        'tch_pw',
        'contact_number',
        'is_deleted',
        'must_change_password',
        'avatar',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'tch_pw',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
            'must_change_password' => 'boolean',
            'tch_pw' => 'hashed',
            'tch_created' => 'datetime',
            'tch_updated' => 'datetime',
        ];
    }

    public function getAuthPassword(): string
    {
        return (string) $this->tch_pw;
    }
}
