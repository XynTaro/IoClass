<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Align legacy attendance (session_id) with daily RFID/adviser tracking (att_date).
     */
    public function up(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        Schema::table('attendance', function (Blueprint $table) {
            if (! Schema::hasColumn('attendance', 'att_date')) {
                $table->date('att_date')->nullable();
            }
            if (! Schema::hasColumn('attendance', 'time_in')) {
                $table->dateTime('time_in')->nullable();
            }
            if (! Schema::hasColumn('attendance', 'sect_id')) {
                $table->integer('sect_id')->nullable();
            }
            if (! Schema::hasColumn('attendance', 'sy_id')) {
                $table->integer('sy_id')->nullable();
            }
        });

        if (Schema::hasColumn('attendance', 'session_id') && DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE attendance ALTER COLUMN session_id DROP NOT NULL');
        }

        if (DB::getDriverName() === 'pgsql' && Schema::hasColumn('attendance', 'att_date')) {
            DB::statement(
                'CREATE UNIQUE INDEX IF NOT EXISTS attendance_stu_id_att_date_unique '
                .'ON attendance (stu_id, att_date) WHERE att_date IS NOT NULL'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('attendance')) {
            return;
        }

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS attendance_stu_id_att_date_unique');
        }

        Schema::table('attendance', function (Blueprint $table) {
            if (Schema::hasColumn('attendance', 'sy_id')) {
                $table->dropColumn('sy_id');
            }
            if (Schema::hasColumn('attendance', 'sect_id')) {
                $table->dropColumn('sect_id');
            }
            if (Schema::hasColumn('attendance', 'time_in')) {
                $table->dropColumn('time_in');
            }
            if (Schema::hasColumn('attendance', 'att_date')) {
                $table->dropColumn('att_date');
            }
        });
    }
};
