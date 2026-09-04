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
        Schema::create('admin', function (Blueprint $table) {
            $table->increments('admin_id');
            $table->integer('add_id')->nullable();
            $table->string('fname', 100)->nullable();
            $table->string('mname', 100)->nullable();
            $table->string('lname', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('pw', 255)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->boolean('is_deleted')->nullable()->default(false);
            $table->timestamp('created_at')->nullable()->useCurrent();
            $table->timestamp('updated_at')->nullable()->useCurrent();

            $table->foreign('add_id')->references('add_id')->on('address');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('admin');
    }
};
