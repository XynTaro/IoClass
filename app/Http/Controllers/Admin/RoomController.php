<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Building;
use App\Models\Room;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Response;

class RoomController extends Controller
{
    public function index(Request $request): Response
    {
        $archived = $request->boolean('archived');

        $rooms = Room::select('room_id', 'room_no', 'building_id', 'is_deleted')
            ->with('building:building_id,building_name')
            ->where('is_deleted', $archived)
            ->orderBy('room_id', 'desc')
            ->paginate(8);

        $buildings = Building::where('is_deleted', false)
            ->orderBy('building_name')
            ->get(['building_id', 'building_name']);

        return inertia('Admin/Room/Index', [
            'rooms' => $rooms,
            'buildings' => $buildings,
            'archived' => $archived,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'room_no' => 'required|string|max:20|unique:room,room_no',
            'building_id' => 'required|integer|exists:building,building_id',
        ]);

        Room::create([
            'room_no' => $validated['room_no'],
            'building_id' => $validated['building_id'],
            'is_deleted' => false,
        ]);

        return redirect()->route('admin.room.index')
            ->with('success', 'Room successfully added.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        $room = Room::findOrFail($id);

        $validated = $request->validate([
            'room_no' => 'required|string|max:20|unique:room,room_no,'.$room->room_id.',room_id',
            'building_id' => 'required|integer|exists:building,building_id',
        ]);

        $room->update($validated);

        return redirect()->route('admin.room.index')
            ->with('success', 'Room updated successfully.');
    }

    public function destroy(Room $room): RedirectResponse
    {
        $room->update(['is_deleted' => true]);

        return redirect()->route('admin.room.index')
            ->with('success', 'Room archived successfully.');
    }

    public function restore(int $id): RedirectResponse
    {
        $room = Room::findOrFail($id);
        $room->update(['is_deleted' => false]);

        return redirect()->back()
            ->with('success', 'Room restored successfully.');
    }

    public function forceDelete(int $id): RedirectResponse
    {
        $room = Room::findOrFail($id);
        $room->delete();

        return redirect()->back()
            ->with('success', 'Room permanently deleted.');
    }
}
