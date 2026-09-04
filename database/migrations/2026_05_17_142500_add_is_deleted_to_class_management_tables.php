<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('section', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false)->after('gr_level');
        });

        Schema::table('room', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false)->after('building');
        });

        Schema::table('subject', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false)->after('subj_name');
        });

        Schema::table('school_year', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false)->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('section', function (Blueprint $table) {
            $table->dropColumn('is_deleted');
        });

        Schema::table('room', function (Blueprint $table) {
            $table->dropColumn('is_deleted');
        });

        Schema::table('subject', function (Blueprint $table) {
            $table->dropColumn('is_deleted');
        });

        Schema::table('school_year', function (Blueprint $table) {
            $table->dropColumn('is_deleted');
        });
    }
};
