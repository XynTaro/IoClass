<?php

namespace App\Http\Requests\Api;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class RfidRegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'rfid_uid' => ['required', 'string', 'max:100'],
            'type' => ['required', 'in:teacher,student'],
            'name' => ['required', 'string', 'max:100'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('rfid_uid')) {
            $this->merge([
                'rfid_uid' => strtoupper(trim((string) $this->input('rfid_uid'))),
            ]);
        }

        if ($this->has('type')) {
            $this->merge([
                'type' => strtolower(trim((string) $this->input('type'))),
            ]);
        }

        if ($this->has('name')) {
            $this->merge([
                'name' => trim((string) $this->input('name')),
            ]);
        }
    }
}
