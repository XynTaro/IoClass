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
        Schema::create('attendance', function (Blueprint $table) {
            $table->increments('att_id');
            $table->integer('stu_id');
            $table->unsignedInteger('session_id')->nullable();
            $table->integer('sect_id')->nullable();
            $table->integer('sy_id')->nullable();
            $table->date('att_date')->nullable();
            $table->dateTime('time_in')->nullable();
            $table->string('status', 20)->default('present');

            $table->unique(['stu_id', 'att_date']);

            $table->foreign('stu_id')->references('stu_id')->on('student')->onDelete('cascade');
            $table->foreign('sect_id')->references('sect_id')->on('section')->onDelete('set null');
            $table->foreign('sy_id')->references('sy_id')->on('school_year')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
