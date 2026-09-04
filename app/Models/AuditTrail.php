<?php

namespace App\Models;

use Database\Factories\AuditTrailFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AuditTrail extends Model
{
    /** @use HasFactory<AuditTrailFactory> */
    use HasFactory;

    protected $table = 'audit_trail';

    protected $primaryKey = 'audit_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'actor_type',
        'actor_id',
        'actor_name',
        'action',
        'description',
        'properties',
        'created_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'properties' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Record an audit trail entry for a teacher or admin action.
     *
     * @param  array<string, mixed>  $properties
     */
    public static function record(
        Admin|Teacher $actor,
        string $action,
        string $description,
        array $properties = [],
    ): self {
        $isTeacher = $actor instanceof Teacher;

        $nameParts = $isTeacher
            ? [$actor->tch_fname, $actor->tch_mname, $actor->tch_lname]
            : [$actor->fname, $actor->mname, $actor->lname];

        $actorName = collect($nameParts)->filter()->implode(' ');

        return self::create([
            'actor_type' => $isTeacher ? 'teacher' : 'admin',
            'actor_id' => $actor->getKey(),
            'actor_name' => $actorName !== ''
                ? $actorName
                : ($isTeacher ? $actor->tch_email : $actor->email),
            'action' => $action,
            'description' => $description,
            'properties' => $properties !== [] ? $properties : null,
            'created_at' => now(),
        ]);
    }
}
