<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Allows advisers to set "absent/excused" without requiring a time_in.
        DB::statement('ALTER TABLE attendance ALTER COLUMN time_in DROP NOT NULL');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Best-effort revert. Will fail if nulls exist in production.
        DB::statement('ALTER TABLE attendance ALTER COLUMN time_in SET NOT NULL');
    }
};
