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
        Schema::create('teacher', function (Blueprint $table) {
            $table->increments('tch_id');
            $table->integer('add_id')->nullable();
            $table->string('tch_rfid_uid', 100)->nullable();
            $table->string('tch_fname', 100)->nullable();
            $table->string('tch_mname', 100)->nullable();
            $table->string('tch_lname', 100)->nullable();
            $table->string('tch_email', 150)->nullable();
            $table->string('tch_pw', 255)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->boolean('is_deleted')->nullable()->default(false);
            $table->timestamp('tch_created')->nullable()->useCurrent();
            $table->timestamp('tch_updated')->nullable()->useCurrent();
            $table->string('master_card', 20)->nullable();

            $table->foreign('add_id')->references('add_id')->on('address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher');
    }
};
