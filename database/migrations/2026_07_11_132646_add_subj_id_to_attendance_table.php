<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Switch attendance from one-per-day to one-per-subject-per-day.
     *
     * - Add nullable subj_id column (null = whole-day / advisory record)
     * - Drop the old (stu_id, att_date) unique index
     * - Add new (stu_id, att_date, subj_id) unique index so the same student
     *   can have one record per subject per day while still being unique.
     */
    public function up(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        Schema::table('attendance', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance', 'subj_id')) {
                $table->unsignedInteger('subj_id')->nullable()->after('session_id');
            }
        });

        if (DB::getDriverName() === 'pgsql') {
            // Drop old daily-unique index
            DB::statement('DROP INDEX IF EXISTS attendance_stu_id_att_date_unique');

            // New per-subject unique index — treats NULL subj_id as distinct
            // so advisory (whole-day) records don't clash with subject records.
            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS attendance_stu_id_att_date_subj_id_unique '
                .'ON attendance (stu_id, att_date, subj_id) WHERE att_date IS NOT NULL AND subj_id IS NOT NULL'
            );

            // Separate partial index for advisory (subj_id IS NULL) records.
            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS attendance_stu_id_att_date_no_subj_unique '
                .'ON attendance (stu_id, att_date) WHERE att_date IS NOT NULL AND subj_id IS NULL'
            );
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS attendance_stu_id_att_date_subj_id_unique');
            DB::statement('DROP INDEX IF EXISTS attendance_stu_id_att_date_no_subj_unique');

            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS attendance_stu_id_att_date_unique '
                .'ON attendance (stu_id, att_date) WHERE att_date IS NOT NULL'
            );
        }

        Schema::table('attendance', function (Blueprint $table) {
            if (Schema::hasColumn('attendance', 'subj_id')) {
                $table->dropColumn('subj_id');
            }
        });
    }
};
