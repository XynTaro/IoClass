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
        Schema::create('parent', function (Blueprint $table) {
            $table->increments('parent_id');
            $table->integer('add_id')->nullable();
            $table->integer('stu_par_id');
            $table->integer('f_id')->nullable();
            $table->integer('mother_id')->nullable();
            $table->integer('guardian_id')->nullable();

            $table->foreign('add_id')->references('add_id')->on('address');
            $table->foreign('stu_par_id')->references('stu_id')->on('student');
            $table->foreign('f_id')->references('f_id')->on('father');
            $table->foreign('mother_id')->references('mother_id')->on('mother');
            $table->foreign('guardian_id')->references('guardian_id')->on('parentguardian');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parent');
    }
};
