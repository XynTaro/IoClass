<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\Request;

class AdminAddressController extends Controller
{
    public function index(Request $request)
    {
        $archived = $request->boolean('archived');

        $addresses = Address::select('add_id', 'region', 'province', 'municipality', 'barangay', 'add_type')
            ->orderBy('add_id', 'desc')
            ->paginate(8);

        return inertia('Admin/Address/Index', [
            'addresses' => $addresses,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            // Permanent address
            'perm_region' => 'nullable|string|max:100',
            'perm_province' => 'nullable|string|max:100',
            'perm_municipality' => 'nullable|string|max:100',
            'perm_barangay' => 'nullable|string|max:100',
            // Whether current address is the same as permanent
            'same_as_permanent' => 'boolean',
            // Current address (required only when same_as_permanent is false)
            'curr_region' => 'nullable|string|max:100',
            'curr_province' => 'nullable|string|max:100',
            'curr_municipality' => 'nullable|string|max:100',
            'curr_barangay' => 'nullable|string|max:100',
        ]);

        Address::create([
            'region' => $validated['perm_region'] ?? null,
            'province' => $validated['perm_province'] ?? null,
            'municipality' => $validated['perm_municipality'] ?? null,
            'barangay' => $validated['perm_barangay'] ?? null,
            'add_type' => 'permanent',
        ]);

        if (! ($validated['same_as_permanent'] ?? true)) {
            Address::create([
                'region' => $validated['curr_region'] ?? null,
                'province' => $validated['curr_province'] ?? null,
                'municipality' => $validated['curr_municipality'] ?? null,
                'barangay' => $validated['curr_barangay'] ?? null,
                'add_type' => 'current',
            ]);
        }

        return redirect()->route('admin.address.index')
            ->with('success', 'Address successfully added.');
    }

    public function update(Request $request, int $id)
    {
        $address = Address::findOrFail($id);

        $validated = $request->validate([
            'region' => 'nullable|string|max:100',
            'province' => 'nullable|string|max:100',
            'municipality' => 'nullable|string|max:100',
            'barangay' => 'nullable|string|max:100',
            'add_type' => 'nullable|string|in:current,permanent',
        ]);

        $address->update($validated);

        return redirect()->route('admin.address.index')
            ->with('success', 'Address updated successfully.');
    }

    public function destroy(Address $address)
    {
        $address->delete();

        return redirect()->back()
            ->with('success', 'Address deleted successfully.');
    }
}
