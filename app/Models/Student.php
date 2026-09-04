<?php

namespace App\Models;

use Database\Factories\StudentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Student extends Model
{
    /** @use HasFactory<StudentFactory> */
    use HasFactory;

    protected $table = 'student';

    protected $primaryKey = 'stu_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'add_id',
        'rfid_uid',
        'lrn',
        'stu_fname',
        'stu_mname',
        'stu_lname',
        'gender',
        'photo',
        'status',
        'is_deleted',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_deleted' => 'boolean',
            'stu_created' => 'datetime',
            'stu_updated' => 'datetime',
        ];
    }
}
