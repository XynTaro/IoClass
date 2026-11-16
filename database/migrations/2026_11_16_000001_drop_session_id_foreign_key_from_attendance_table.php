<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop the legacy foreign key constraint on attendance.session_id
     * referencing attendance_session(session_id), since attendance sessions
     * are now tracked via class_schedule and per-subject daily records.
     */
    public function up(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_session_id_fkey');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Legacy constraint intentionally not restored.
    }
};
