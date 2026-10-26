<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasColumn('teacher', 'status')) {
            Schema::table('teacher', function (Blueprint $table) {
                $table->string('status', 20)->default('active')->after('contact_number');
            });
        }

        DB::table('teacher')->where('is_deleted', true)->update(['status' => 'inactive']);
        DB::table('teacher')->where('is_deleted', false)->update(['status' => 'active']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasColumn('teacher', 'status')) {
            Schema::table('teacher', function (Blueprint $table) {
                $table->dropColumn('status');
            });
        }
    }
};
