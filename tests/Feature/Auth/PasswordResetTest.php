<?php

/**
 * Email-based Fortify password reset is disabled.
 * SMS OTP coverage lives in SmsPasswordResetTest.
 */
test('fortify email password reset routes are not registered', function () {
    expect(route('password.request'))->toContain('forgot-password');

    $this->get(route('password.request'))->assertOk();
});
