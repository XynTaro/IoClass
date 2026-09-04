<?php

namespace App\Providers;

use App\Contracts\SmsSender;
use App\Services\Sms\LogSmsSender;
use App\Services\Sms\UniSmsSender;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(SmsSender::class, function (): SmsSender {
            if (filled(config('services.unisms.key'))) {
                return $this->app->make(UniSmsSender::class);
            }

            return $this->app->make(LogSmsSender::class);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );

        // Force HTTPS URL generation when behind a proxy/tunnel (e.g. Cloudflare Tunnel)
        if (config('app.env') !== 'production' && str_starts_with(config('app.url'), 'https://')) {
            URL::forceScheme('https');
        }
    }
}
