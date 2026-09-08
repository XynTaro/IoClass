<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class SessionKeepAliveController extends Controller
{
    /**
     * Touch the current session and verify that the user is authenticated.
     */
    public function __invoke(Request $request): JsonResponse
    {
        $isAuthenticated = Auth::guard('admin')->check()
            || Auth::guard('teacher')->check()
            || Auth::guard('web')->check();

        if (! $isAuthenticated) {
            return response()->json([
                'status' => 'unauthenticated',
                'message' => 'Your session has expired. Please log in again.',
            ], 401);
        }

        // Touch the session to refresh its last activity
        $request->session()->put('last_keep_alive_at', now()->timestamp);

        return response()->json([
            'status' => 'active',
            'timestamp' => now()->timestamp,
        ]);
    }
}
