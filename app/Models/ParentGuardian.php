<?php

namespace App\Models;

use Database\Factories\ParentGuardianFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParentGuardian extends Model
{
    /** @use HasFactory<ParentGuardianFactory> */
    use HasFactory;

    protected $table = 'parent';

    protected $primaryKey = 'parent_id';

    public $incrementing = true;

    protected $keyType = 'int';

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'add_id',
        'stu_par_id',
        'f_id',
        'mother_id',
        'guardian_id',
        'main_contact',
    ];

    /**
     * Resolve the primary contact number, honoring the designated main contact first
     * and falling back to guardian, mother, then father for legacy records.
     */
    public function resolvePrimaryPhone(): ?string
    {
        $selected = match ($this->main_contact) {
            'father' => $this->father?->contact_number,
            'mother' => $this->mother?->contact_number,
            'guardian' => $this->guardian?->contact_number,
            default => null,
        };

        if (filled($selected)) {
            return (string) $selected;
        }

        $fallback = $this->guardian?->contact_number
            ?? $this->mother?->contact_number
            ?? $this->father?->contact_number;

        return filled($fallback) ? (string) $fallback : null;
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'stu_par_id', 'stu_id');
    }

    public function father(): BelongsTo
    {
        return $this->belongsTo(Father::class, 'f_id', 'f_id');
    }

    public function mother(): BelongsTo
    {
        return $this->belongsTo(Mother::class, 'mother_id', 'mother_id');
    }

    public function guardian(): BelongsTo
    {
        return $this->belongsTo(Guardian::class, 'guardian_id', 'guardian_id');
    }
}
