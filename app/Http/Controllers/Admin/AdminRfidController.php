<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\RfidCaptureCache;
use App\Support\RfidRegistryCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Handles admin-facing RFID endpoints used during student/teacher enrollment.
 *
 * - registry()    – returns every registered RFID UID so the frontend can
 *                    validate duplicates in real-time.
 * - lastCapture() – polls for the most recent card tap captured by an
 *                    ESP32 reader, allowing the admin to auto-fill a UID.
 */
class AdminRfidController extends Controller
{
    /**
     * Return all registered RFID UIDs for admin form validation.
     *
     * @return array<string, array{type: string, name: string}>
     */
    public function registry(): JsonResponse
    {
        return response()->json([
            'registry' => RfidRegistryCache::get(),
        ]);
    }

    /**
     * Return the latest ESP32 capture for admin enrollment modals.
     */
    public function lastCapture(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'since' => ['required', 'integer', 'min:0'],
        ]);

        // Resolve the device tokens that this deployment trusts.
        $allowedTokens = RfidCaptureCache::allowedDeviceTokens();

        // No device tokens configured → RFID capture is unavailable.
        if (empty($allowedTokens)) {
            return response()->json([
                'available' => false,
                'uid' => null,
                'captured_at' => null,
            ]);
        }

        // Fetch the most recent capture from any allowed device since the given timestamp.
        $capture = RfidCaptureCache::latest($allowedTokens, (int) $validated['since']);

        // Device is online but no new card has been tapped since the given timestamp.
        if ($capture === null) {
            return response()->json([
                'available' => true,
                'uid' => null,
                'captured_at' => null,
            ]);
        }

        return response()->json([
            'available' => true,
            'uid' => $capture['uid'],
            'captured_at' => $capture['captured_at'],
        ]);
    }
}
