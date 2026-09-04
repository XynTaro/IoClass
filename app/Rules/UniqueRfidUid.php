<?php

namespace App\Rules;

use App\Support\RfidUid;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class UniqueRfidUid implements ValidationRule
{
    public function __construct(
        private ?int $ignoreStudentId = null,
        private ?int $ignoreTeacherId = null,
    ) {}

    /**
     * @param  Closure(string, ?string=): void  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $normalized = RfidUid::normalize(is_string($value) ? $value : null);

        if ($normalized === null) {
            return;
        }

        if (RfidUid::isTaken($normalized, $this->ignoreStudentId, $this->ignoreTeacherId)) {
            $fail('This RFID card is already registered to another person.');
        }
    }
}
