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
        Schema::create('student', function (Blueprint $table) {
            $table->increments('stu_id');
            $table->integer('add_id')->nullable();
            $table->string('rfid_uid', 100)->nullable();
            $table->string('lrn', 50)->nullable();
            $table->string('stu_fname', 100)->nullable();
            $table->string('stu_mname', 100)->nullable();
            $table->string('stu_lname', 100)->nullable();
            $table->string('status', 30)->nullable();
            $table->boolean('is_deleted')->nullable()->default(false);
            $table->timestamp('stu_created')->nullable()->useCurrent();
            $table->timestamp('stu_updated')->nullable()->useCurrent();

            $table->foreign('add_id')->references('add_id')->on('address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('student');
    }
};
