<?php

namespace App\Http\Requests\Auth;

use App\Concerns\PasswordValidationRules;
use Illuminate\Contracts\Validation\Rule;
use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordWithOtpRequest extends FormRequest
{
    use PasswordValidationRules;

    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<Rule|array<mixed>|string>>
     */
    public function rules(): array
    {
        return [
            'password' => $this->passwordRules(),
        ];
    }
}
