<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Building;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class BuildingController extends Controller
{
    public function index(Request $request): Response
    {
        $archived = $request->boolean('archived');

        $buildings = Building::select('building_id', 'building_name', 'is_deleted')
            ->withCount(['rooms' => fn ($q) => $q->where('is_deleted', false)])
            ->where('is_deleted', $archived)
            ->orderBy('building_id', 'desc')
            ->paginate(8);

        return inertia('Admin/Building/Index', [
            'buildings' => $buildings,
            'archived' => $archived,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'building_name' => 'required|string|max:100|unique:building,building_name',
        ]);

        Building::create($validated);

        return redirect()->route('admin.building.index')
            ->with('success', 'Building added successfully.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $building = Building::findOrFail($id);

        $validated = $request->validate([
            'building_name' => 'required|string|max:100|unique:building,building_name,'.$building->building_id.',building_id',
        ]);

        $building->update($validated);

        return redirect()->route('admin.building.index')
            ->with('success', 'Building updated successfully.');
    }

    public function destroy(int $id): RedirectResponse
    {
        $building = Building::findOrFail($id);
        $building->update(['is_deleted' => true]);

        return redirect()->route('admin.building.index')
            ->with('success', 'Building archived successfully.');
    }

    public function restore(int $id): RedirectResponse
    {
        $building = Building::findOrFail($id);
        $building->update(['is_deleted' => false]);

        return redirect()->back()
            ->with('success', 'Building restored successfully.');
    }

    public function forceDelete(int $id): RedirectResponse
    {
        $building = Building::findOrFail($id);
        $building->delete();

        return redirect()->back()
            ->with('success', 'Building permanently deleted.');
    }
}
