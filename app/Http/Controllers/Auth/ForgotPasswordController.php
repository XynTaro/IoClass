<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ResetPasswordWithOtpRequest;
use App\Http\Requests\Auth\SendPasswordResetOtpRequest;
use App\Http\Requests\Auth\VerifyPasswordResetOtpRequest;
use App\Services\PasswordResetOtpService;
use App\Support\PhoneNumber;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ForgotPasswordController extends Controller
{
    private const SESSION_EMAIL = 'password_reset.email';

    private const SESSION_PHONE = 'password_reset.phone';

    private const SESSION_MASKED_PHONE = 'password_reset.masked_phone';

    private const SESSION_ACCOUNT = 'password_reset.account';

    private const SESSION_VERIFIED_AT = 'password_reset.verified_at';

    public function __construct(private PasswordResetOtpService $passwordResetOtps) {}

    public function create(): Response
    {
        return Inertia::render('forgot-password', [
            'status' => session('status'),
        ]);
    }

    public function send(SendPasswordResetOtpRequest $request): RedirectResponse
    {
        $email = $request->validated('email');
        $account = $this->passwordResetOtps->findAccountByEmail($email);

        $request->session()->put(self::SESSION_EMAIL, $email);
        $request->session()->forget([self::SESSION_ACCOUNT, self::SESSION_VERIFIED_AT]);

        // Always continue so callers cannot enumerate registered emails.
        if ($account !== null) {
            try {
                $code = $this->passwordResetOtps->sendOtp($account);
            } catch (\Throwable $exception) {
                report($exception);

                return back()->withErrors([
                    'email' => __('We could not send a verification code right now. Please try again later.'),
                ]);
            }

            $request->session()->put([
                self::SESSION_PHONE => $account['phone'],
                self::SESSION_MASKED_PHONE => PhoneNumber::mask($account['phone']),
            ]);

            $redirect = redirect()
                ->route('password.otp.show')
                ->with('status', __('If that email is registered with a contact number, a verification code has been sent by SMS.'));

            if ($this->shouldExposeDebugOtp()) {
                $redirect->with('debug_otp', $code);
            }

            return $redirect;
        }

        $request->session()->forget([self::SESSION_PHONE, self::SESSION_MASKED_PHONE]);

        return redirect()
            ->route('password.otp.show')
            ->with('status', __('If that email is registered with a contact number, a verification code has been sent by SMS.'));
    }

    public function showVerify(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has(self::SESSION_EMAIL)) {
            return redirect()->route('password.request');
        }

        return Inertia::render('forgot-password-verify', [
            'maskedPhone' => $request->session()->get(self::SESSION_MASKED_PHONE),
            'status' => session('status'),
            'debugOtp' => $this->shouldExposeDebugOtp()
                ? session('debug_otp')
                : null,
        ]);
    }

    public function verify(VerifyPasswordResetOtpRequest $request): RedirectResponse
    {
        $phone = $request->session()->get(self::SESSION_PHONE);

        if (! is_string($phone) || $phone === '') {
            return redirect()
                ->route('password.otp.show')
                ->withErrors([
                    'code' => __('This verification code is invalid or has expired.'),
                ]);
        }

        $account = $this->passwordResetOtps->verifyOtp($phone, $request->validated('code'));

        $request->session()->put([
            self::SESSION_ACCOUNT => [
                'type' => $account['type'],
                'id' => $account['id'],
            ],
            self::SESSION_VERIFIED_AT => now()->timestamp,
        ]);
        $request->session()->forget('debug_otp');

        return redirect()->route('password.reset.show');
    }

    public function resend(Request $request): RedirectResponse
    {
        $email = $request->session()->get(self::SESSION_EMAIL);

        if (! is_string($email) || $email === '') {
            return redirect()->route('password.request');
        }

        $account = $this->passwordResetOtps->findAccountByEmail($email);

        if ($account !== null) {
            try {
                $code = $this->passwordResetOtps->sendOtp($account);
            } catch (\Throwable $exception) {
                report($exception);

                return back()->withErrors([
                    'code' => __('We could not resend a verification code right now. Please try again later.'),
                ]);
            }

            $request->session()->put([
                self::SESSION_PHONE => $account['phone'],
                self::SESSION_MASKED_PHONE => PhoneNumber::mask($account['phone']),
            ]);

            $redirect = redirect()
                ->route('password.otp.show')
                ->with('status', __('If that email is registered with a contact number, a new verification code has been sent by SMS.'));

            if ($this->shouldExposeDebugOtp()) {
                $redirect->with('debug_otp', $code);
            }

            return $redirect;
        }

        return redirect()
            ->route('password.otp.show')
            ->with('status', __('If that email is registered with a contact number, a new verification code has been sent by SMS.'));
    }

    public function showReset(Request $request): Response|RedirectResponse
    {
        if (! $this->hasVerifiedResetSession($request)) {
            return redirect()->route('password.request');
        }

        return Inertia::render('forgot-password-reset', [
            'maskedPhone' => $request->session()->get(self::SESSION_MASKED_PHONE),
        ]);
    }

    public function reset(ResetPasswordWithOtpRequest $request): RedirectResponse
    {
        if (! $this->hasVerifiedResetSession($request)) {
            return redirect()->route('password.request');
        }

        /** @var array{type: string, id: int} $account */
        $account = $request->session()->get(self::SESSION_ACCOUNT);

        $this->passwordResetOtps->resetPassword($account, $request->validated('password'));

        $request->session()->forget([
            self::SESSION_EMAIL,
            self::SESSION_PHONE,
            self::SESSION_MASKED_PHONE,
            self::SESSION_ACCOUNT,
            self::SESSION_VERIFIED_AT,
            'debug_otp',
        ]);

        return redirect()
            ->route('login')
            ->with('status', __('Your password has been reset. You can sign in now.'));
    }

    private function hasVerifiedResetSession(Request $request): bool
    {
        $account = $request->session()->get(self::SESSION_ACCOUNT);
        $verifiedAt = $request->session()->get(self::SESSION_VERIFIED_AT);

        if (! is_array($account) || ! isset($account['type'], $account['id']) || ! is_int($verifiedAt)) {
            return false;
        }

        return now()->timestamp - $verifiedAt <= 900;
    }

    /**
     * Only expose OTPs on-screen when SMS is stubbed (no UniSMS key) or in tests.
     */
    private function shouldExposeDebugOtp(): bool
    {
        return app()->runningUnitTests() || blank(config('services.unisms.key'));
    }
}
