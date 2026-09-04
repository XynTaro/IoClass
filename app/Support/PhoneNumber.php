<?php

namespace App\Support;

class PhoneNumber
{
    /**
     * Normalize PH mobile numbers to an 11-digit local form (09XXXXXXXXX) when possible.
     */
    public static function normalize(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '63') && strlen($digits) === 12) {
            return '0'.substr($digits, 2);
        }

        return $digits;
    }

    /**
     * Convert a PH mobile number to E.164 (+639XXXXXXXXX) for UniSMS.
     */
    public static function toE164(string $phone): string
    {
        $normalized = self::normalize($phone);

        if (str_starts_with($normalized, '0') && strlen($normalized) === 11) {
            return '+63'.substr($normalized, 1);
        }

        if (str_starts_with($normalized, '63') && strlen($normalized) === 12) {
            return '+'.$normalized;
        }

        if (str_starts_with($phone, '+') && strlen($normalized) >= 10) {
            return '+'.$normalized;
        }

        return '+'.$normalized;
    }

    /**
     * Mask a phone number for display, e.g. 0917***4567.
     */
    public static function mask(string $phone): string
    {
        $normalized = self::normalize($phone);
        $length = strlen($normalized);

        if ($length < 7) {
            return str_repeat('*', max($length, 4));
        }

        return substr($normalized, 0, 4).str_repeat('*', $length - 8).substr($normalized, -4);
    }
}
