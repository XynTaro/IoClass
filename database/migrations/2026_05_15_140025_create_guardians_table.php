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
        Schema::create('parentguardian', function (Blueprint $table) {
            $table->increments('guardian_id');
            $table->string('name', 100)->nullable();
            $table->string('guardian_mname', 100)->nullable();
            $table->string('guardian_lname', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->boolean('is_deleted')->nullable()->default(false);
            $table->timestamp('is_created')->nullable()->useCurrent();
            $table->timestamp('is_updated')->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parentguardian');
        Schema::dropIfExists('guardians');
        Schema::dropIfExists('guardian');
    }
};
