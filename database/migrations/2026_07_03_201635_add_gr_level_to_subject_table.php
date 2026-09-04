<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('subject', function (Blueprint $table) {
            $table->string('gr_level', 20)->nullable()->after('subj_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subject', function (Blueprint $table) {
            $table->dropColumn('gr_level');
        });
    }
};
