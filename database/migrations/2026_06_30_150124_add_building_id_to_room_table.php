<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('room', function (Blueprint $table) {
            $table->unsignedInteger('building_id')->nullable()->after('room_no');
            $table->foreign('building_id')->references('building_id')->on('building')->nullOnDelete();
        });

        // Migrate existing building text values into the building table
        $existingBuildings = DB::table('room')
            ->whereNotNull('building')
            ->where('building', '!=', '')
            ->distinct()
            ->pluck('building');

        foreach ($existingBuildings as $name) {
            $buildingId = DB::table('building')->insertGetId([
                'building_name' => $name,
                'is_deleted' => false,
            ], 'building_id');

            DB::table('room')->where('building', $name)->update(['building_id' => $buildingId]);
        }

        Schema::table('room', function (Blueprint $table) {
            $table->dropColumn('building');
        });
    }

    public function down(): void
    {
        Schema::table('room', function (Blueprint $table) {
            $table->string('building', 100)->nullable();
        });

        Schema::table('room', function (Blueprint $table) {
            $table->dropForeign(['building_id']);
            $table->dropColumn('building_id');
        });
    }
};
