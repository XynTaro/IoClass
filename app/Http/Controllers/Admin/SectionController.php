<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Section;
use Closure;
use Illuminate\Http\Request;

class SectionController extends Controller
{
    public function index(Request $request)
    {
        $archived = $request->boolean('archived');

        $sections = Section::select('sect_id', 'sect_name', 'gr_level', 'is_deleted')
            ->where('is_deleted', $archived)
            ->orderBy('sect_id', 'desc')
            ->paginate(8);

        return inertia('Admin/Section/Index', [
            'sections' => $sections,
            'archived' => $archived,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sect_name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, Closure $fail) use ($request): void {
                    $sectName = trim((string) preg_replace('/\s+/', ' ', (string) $value));
                    $grLevel = trim((string) $request->input('gr_level', ''));

                    if ($sectName === '') {
                        return;
                    }

                    $exists = Section::query()
                        ->where('is_deleted', false)
                        ->whereRaw('LOWER(TRIM(sect_name)) = LOWER(?)', [$sectName])
                        ->when($grLevel !== '', function ($q) use ($grLevel): void {
                            $q->whereRaw('LOWER(TRIM(gr_level)) = LOWER(?)', [$grLevel]);
                        })
                        ->exists();

                    if ($exists) {
                        $fail('This section is already registered.');
                    }
                },
            ],
            'gr_level' => 'required|string|max:20',
        ], [
            'sect_name.required' => 'Section name is required.',
            'gr_level.required' => 'Grade level is required.',
        ]);

        Section::create($validated);

        return redirect()->route('admin.section.index')
            ->with('success', 'Section successfully added.');
    }

    public function update(Request $request, int $id)
    {
        $section = Section::findOrFail($id);

        $validated = $request->validate([
            'sect_name' => [
                'required',
                'string',
                'max:100',
                function (string $attribute, mixed $value, Closure $fail) use ($request, $section): void {
                    $sectName = trim((string) preg_replace('/\s+/', ' ', (string) $value));
                    $grLevel = trim((string) $request->input('gr_level', $section->gr_level));

                    if ($sectName === '') {
                        return;
                    }

                    $exists = Section::query()
                        ->where('sect_id', '!=', $section->sect_id)
                        ->where('is_deleted', false)
                        ->whereRaw('LOWER(TRIM(sect_name)) = LOWER(?)', [$sectName])
                        ->when($grLevel !== '', function ($q) use ($grLevel): void {
                            $q->whereRaw('LOWER(TRIM(gr_level)) = LOWER(?)', [$grLevel]);
                        })
                        ->exists();

                    if ($exists) {
                        $fail('This section is already registered.');
                    }
                },
            ],
            'gr_level' => 'required|string|max:20',
        ], [
            'sect_name.required' => 'Section name is required.',
            'gr_level.required' => 'Grade level is required.',
        ]);

        $section->update($validated);

        return redirect()->route('admin.section.index')
            ->with('success', 'Section updated successfully.');
    }

    public function destroy(Section $section)
    {
        $section->update(['is_deleted' => true]);

        return redirect()->route('admin.section.index')
            ->with('success', 'Section archived successfully.');
    }

    public function restore(int $id)
    {
        $section = Section::findOrFail($id);
        $section->update(['is_deleted' => false]);

        return redirect()->back()
            ->with('success', 'Section restored successfully.');
    }

    public function forceDelete(int $id)
    {
        $section = Section::findOrFail($id);
        $section->delete();

        return redirect()->back()
            ->with('success', 'Section permanently deleted.');
    }
}
