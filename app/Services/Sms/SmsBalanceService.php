<?php

namespace App\Services\Sms;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsBalanceService
{
    /**
     * Get remaining SMS messages/credits, cached for performance.
     */
    public function getRemainingMessages(): ?int
    {
        $cacheKey = 'sms_remaining_balance';

        try {
            return Cache::remember($cacheKey, now()->addMinutes(5), function (): ?int {
                return $this->fetchFromProvider();
            });
        } catch (\Throwable $e) {
            Log::warning('Failed to fetch SMS balance from provider', [
                'error' => $e->getMessage(),
            ]);

            return Cache::get($cacheKey);
        }
    }

    /**
     * Fetch balance directly from the configured provider without caching.
     */
    public function fetchFromProvider(): ?int
    {
        $iprogsmsToken = (string) config('services.iprogsms.token');
        if ($iprogsmsToken !== '') {
            return $this->fetchIprogSmsBalance($iprogsmsToken);
        }

        $unismsKey = (string) config('services.unisms.key');
        if ($unismsKey !== '') {
            return $this->fetchUniSmsBalance($unismsKey);
        }

        return null;
    }

    protected function fetchIprogSmsBalance(string $token): ?int
    {
        $baseUrl = rtrim((string) config('services.iprogsms.base_url', 'https://www.iprogsms.com'), '/');

        try {
            $response = Http::timeout(3)
                ->connectTimeout(2)
                ->baseUrl($baseUrl)
                ->acceptJson()
                ->get('/api/v1/account/sms_credits', [
                    'api_token' => $token,
                ]);

            if (! $response->successful()) {
                return null;
            }

            $balance = $response->json('data.load_balance');
            if ($balance === null) {
                return null;
            }

            return (int) floor((float) $balance);
        } catch (\Throwable $e) {
            Log::warning('Error querying IPROG SMS balance', ['error' => $e->getMessage()]);

            return null;
        }
    }

    protected function fetchUniSmsBalance(string $apiKey): ?int
    {
        $baseUrl = rtrim((string) config('services.unisms.base_url', 'https://unismsapi.com/api'), '/');

        try {
            $response = Http::timeout(3)
                ->connectTimeout(2)
                ->baseUrl($baseUrl)
                ->withBasicAuth($apiKey, '')
                ->acceptJson()
                ->get('/account');

            if (! $response->successful()) {
                return null;
            }

            $credits = $response->json('sms_credits');
            if ($credits === null) {
                return null;
            }

            return (int) $credits;
        } catch (\Throwable $e) {
            Log::warning('Error querying UniSMS balance', ['error' => $e->getMessage()]);

            return null;
        }
    }
}
