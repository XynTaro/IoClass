<?php

namespace App\Http\Middleware;

use App\Support\RfidCaptureCache;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class VerifyRfidDeviceToken
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $allowedTokens = RfidCaptureCache::allowedDeviceTokens();

        // No tokens configured → open access (local/dev only)
        if (empty($allowedTokens)) {
            return $next($request);
        }

        $providedToken = (string) $request->header('X-Device-Token', '');

        foreach ($allowedTokens as $expected) {
            if (hash_equals($expected, $providedToken)) {
                return $next($request);
            }
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid device token.',
        ], 401);
    }
}
