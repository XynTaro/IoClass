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
        Schema::create('class_schedule', function (Blueprint $table) {
            $table->increments('schedule_id');
            $table->integer('tch_id');
            $table->integer('subj_id');
            $table->integer('sect_id');
            $table->integer('room_id');
            $table->integer('sy_id');
            $table->string('day_of_week', 15)->nullable();
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();

            $table->foreign('tch_id')->references('tch_id')->on('teacher');
            $table->foreign('subj_id')->references('subj_id')->on('subject');
            $table->foreign('sect_id')->references('sect_id')->on('section');
            $table->foreign('room_id')->references('room_id')->on('room');
            $table->foreign('sy_id')->references('sy_id')->on('school_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('class_schedule');
    }
};
