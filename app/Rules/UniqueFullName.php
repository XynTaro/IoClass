<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\DB;
use Illuminate\Translation\PotentiallyTranslatedString;

class UniqueFullName implements DataAwareRule, ValidationRule
{
    /**
     * All data under validation.
     *
     * @var array<string, mixed>
     */
    protected array $data = [];

    public function __construct(
        private string $entityType,
        private ?int $ignoreId = null,
        private bool $ignoreArchived = true,
    ) {}

    /**
     * Set the data under validation.
     *
     * @param  array<string, mixed>  $data
     */
    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $config = match ($this->entityType) {
            'admin' => [
                'table' => 'admin',
                'pk' => 'admin_id',
                'fname' => 'fname',
                'mname' => 'mname',
                'lname' => 'lname',
                'label' => 'An admin',
            ],
            'teacher' => [
                'table' => 'teacher',
                'pk' => 'tch_id',
                'fname' => 'tch_fname',
                'mname' => 'tch_mname',
                'lname' => 'tch_lname',
                'label' => 'A teacher',
            ],
            'student' => [
                'table' => 'student',
                'pk' => 'stu_id',
                'fname' => 'stu_fname',
                'mname' => 'stu_mname',
                'lname' => 'stu_lname',
                'label' => 'A student',
            ],
            default => throw new \InvalidArgumentException("Invalid entity type: {$this->entityType}"),
        };

        $rawFname = is_string($value) ? $value : ($this->data[$config['fname']] ?? null);
        $rawMname = $this->data[$config['mname']] ?? null;
        $rawLname = $this->data[$config['lname']] ?? null;

        // Fallback to existing record if updating and fields were not re-submitted
        if ($this->ignoreId !== null && ($rawLname === null || $rawMname === null)) {
            $existing = DB::table($config['table'])->where($config['pk'], $this->ignoreId)->first();
            if ($existing) {
                if ($rawLname === null) {
                    $rawLname = $existing->{$config['lname']} ?? null;
                }
                if ($rawMname === null && ! array_key_exists($config['mname'], $this->data)) {
                    $rawMname = $existing->{$config['mname']} ?? null;
                }
            }
        }

        $fname = is_string($rawFname) ? trim((string) preg_replace('/\s+/', ' ', $rawFname)) : '';
        $lname = is_string($rawLname) ? trim((string) preg_replace('/\s+/', ' ', $rawLname)) : '';
        $mname = is_string($rawMname) ? trim((string) preg_replace('/\s+/', ' ', $rawMname)) : '';

        // If either required first name or last name is missing, let standard required rules handle it
        if ($fname === '' || $lname === '') {
            return;
        }

        $query = DB::table($config['table'])
            ->whereRaw('LOWER(TRIM('.$config['fname'].')) = LOWER(?)', [$fname])
            ->whereRaw('LOWER(TRIM('.$config['lname'].')) = LOWER(?)', [$lname]);

        if ($mname !== '') {
            $query->whereRaw('LOWER(TRIM('.$config['mname'].')) = LOWER(?)', [$mname]);
        } else {
            $query->where(function ($q) use ($config): void {
                $q->whereNull($config['mname'])
                    ->orWhereRaw('TRIM('.$config['mname'].') = \'\'');
            });
        }

        if ($this->ignoreId !== null) {
            $query->where($config['pk'], '!=', $this->ignoreId);
        }

        if ($this->ignoreArchived) {
            $query->where(function ($q): void {
                $q->where('is_deleted', false)
                    ->orWhereNull('is_deleted');
            });
        }

        if ($query->exists()) {
            $fail("This {$this->entityType} is already registered.");
        }
    }
}
