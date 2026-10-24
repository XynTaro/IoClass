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
        Schema::table('school_year', function (Blueprint $table) {
            $table->date('sem1_start_date')->nullable()->after('end_date');
            $table->date('sem1_end_date')->nullable()->after('sem1_start_date');
            $table->date('sem2_start_date')->nullable()->after('sem1_end_date');
            $table->date('sem2_end_date')->nullable()->after('sem2_start_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_year', function (Blueprint $table) {
            $table->dropColumn([
                'sem1_start_date',
                'sem1_end_date',
                'sem2_start_date',
                'sem2_end_date',
            ]);
        });
    }
};
