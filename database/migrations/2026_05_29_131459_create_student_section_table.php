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
        if (Schema::hasTable('student_section')) {
            return;
        }

        Schema::create('student_section', function (Blueprint $table) {
            $table->increments('stu_sect_id');
            $table->integer('stu_id');
            $table->integer('sect_id');
            $table->integer('sy_id')->nullable();

            $table->unique(['stu_id', 'sect_id', 'sy_id']);

            $table->foreign('stu_id')->references('stu_id')->on('student')->onDelete('cascade');
            $table->foreign('sect_id')->references('sect_id')->on('section')->onDelete('cascade');
            $table->foreign('sy_id')->references('sy_id')->on('school_year')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student_section');
    }
};
