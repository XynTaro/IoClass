<?php

namespace App\Services;

use App\Contracts\SmsSender;
use App\Models\Admin;
use App\Models\PasswordResetOtp;
use App\Models\Teacher;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class PasswordResetOtpService
{
    public const ACCOUNT_ADMIN = 'admin';

    public const ACCOUNT_TEACHER = 'teacher';

    private const OTP_LENGTH = 6;

    private const OTP_TTL_MINUTES = 10;

    private const MAX_ATTEMPTS = 5;

    public function __construct(private SmsSender $sms) {}

    /**
     * Find an admin or teacher by login email, then use their stored contact number for SMS.
     * Admins are checked first. Returns null when the email is unknown or has no contact number.
     *
     * @return array{type: string, id: int, phone: string, email: string}|null
     */
    public function findAccountByEmail(string $email): ?array
    {
        $email = Str::lower(trim($email));

        if ($email === '') {
            return null;
        }

        $admin = Admin::query()
            ->where(function ($query): void {
                $query->where('is_deleted', false)->orWhereNull('is_deleted');
            })
            ->whereRaw('LOWER(email) = ?', [$email])
            ->first(['admin_id', 'email', 'contact_number']);

        if ($admin !== null) {
            $phone = PhoneNumber::normalize((string) ($admin->contact_number ?? ''));

            if ($phone === '') {
                return null;
            }

            return [
                'type' => self::ACCOUNT_ADMIN,
                'id' => (int) $admin->admin_id,
                'phone' => $phone,
                'email' => (string) $admin->email,
            ];
        }

        $teacher = Teacher::query()
            ->where(function ($query): void {
                $query->where('is_deleted', false)->orWhereNull('is_deleted');
            })
            ->whereRaw('LOWER(tch_email) = ?', [$email])
            ->first(['tch_id', 'tch_email', 'contact_number']);

        if ($teacher !== null) {
            $phone = PhoneNumber::normalize((string) ($teacher->contact_number ?? ''));

            if ($phone === '') {
                return null;
            }

            return [
                'type' => self::ACCOUNT_TEACHER,
                'id' => (int) $teacher->tch_id,
                'phone' => $phone,
                'email' => (string) $teacher->tch_email,
            ];
        }

        return null;
    }

    /**
     * Create an OTP and send it via SMS. Returns the plain OTP for local/debug use only.
     *
     * @param  array{type: string, id: int, phone: string, email?: string}  $account
     */
    public function sendOtp(array $account): string
    {
        $code = $this->generateCode();

        PasswordResetOtp::query()
            ->where('phone', $account['phone'])
            ->whereNull('verified_at')
            ->delete();

        PasswordResetOtp::query()->create([
            'phone' => $account['phone'],
            'account_type' => $account['type'],
            'account_id' => $account['id'],
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
        ]);

        $this->sms->send(
            $account['phone'],
            "Your IoClass password reset code is {$code}. It expires in ".self::OTP_TTL_MINUTES.' minutes.',
        );

        return $code;
    }

    /**
     * @return array{type: string, id: int, phone: string}
     */
    public function verifyOtp(string $phone, string $code): array
    {
        $normalized = PhoneNumber::normalize($phone);

        $otp = PasswordResetOtp::query()
            ->where('phone', $normalized)
            ->whereNull('verified_at')
            ->latest('id')
            ->first();

        if ($otp === null || $otp->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => __('This verification code is invalid or has expired.'),
            ]);
        }

        if ($otp->attempts >= self::MAX_ATTEMPTS) {
            throw ValidationException::withMessages([
                'code' => __('Too many invalid attempts. Please request a new code.'),
            ]);
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');

            throw ValidationException::withMessages([
                'code' => __('This verification code is invalid or has expired.'),
            ]);
        }

        $otp->forceFill([
            'verified_at' => now(),
        ])->save();

        return [
            'type' => $otp->account_type,
            'id' => (int) $otp->account_id,
            'phone' => $otp->phone,
        ];
    }

    /**
     * @param  array{type: string, id: int}  $account
     */
    public function resetPassword(array $account, string $password): void
    {
        if ($account['type'] === self::ACCOUNT_ADMIN) {
            $admin = Admin::query()
                ->where('admin_id', $account['id'])
                ->where('is_deleted', false)
                ->first();

            if ($admin === null) {
                throw new InvalidArgumentException('Admin account not found.');
            }

            $admin->forceFill([
                'pw' => $password,
            ])->save();

            return;
        }

        if ($account['type'] === self::ACCOUNT_TEACHER) {
            $teacher = Teacher::query()
                ->where('tch_id', $account['id'])
                ->where('is_deleted', false)
                ->first();

            if ($teacher === null) {
                throw new InvalidArgumentException('Teacher account not found.');
            }

            $teacher->forceFill([
                'tch_pw' => $password,
                'must_change_password' => false,
            ])->save();

            return;
        }

        throw new InvalidArgumentException('Unsupported account type.');
    }

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), self::OTP_LENGTH, '0', STR_PAD_LEFT);
    }
}
