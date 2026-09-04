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
        Schema::create('adviser', function (Blueprint $table) {
            $table->increments('adviser_id');
            $table->integer('tch_id');
            $table->integer('sect_id');
            $table->integer('sy_id');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->nullable()->default(true);

            $table->foreign('tch_id')->references('tch_id')->on('teacher');
            $table->foreign('sect_id')->references('sect_id')->on('section');
            $table->foreign('sy_id')->references('sy_id')->on('school_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('adviser');
    }
};
