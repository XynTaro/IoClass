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
        Schema::create('address', function (Blueprint $table) {
            $table->increments('add_id');
            $table->string('region', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('municipality', 100)->nullable();
            $table->string('barangay', 100)->nullable();
            $table->enum('add_type', ['current', 'permanent'])->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('address');
    }
};
