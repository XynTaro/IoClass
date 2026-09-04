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
        Schema::create('teacher_attendance', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('tch_id');
            $table->date('att_date');
            $table->dateTime('time_in')->nullable();
            $table->string('status', 20)->default('present');
            $table->string('remarks')->nullable();
            $table->timestamps();

            $table->unique(['tch_id', 'att_date']);
            $table->foreign('tch_id')->references('tch_id')->on('teacher')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_attendance');
    }
};
