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
        Schema::create('father', function (Blueprint $table) {
            $table->increments('f_id');
            $table->string('father_name', 100)->nullable();
            $table->string('father_mname', 100)->nullable();
            $table->string('father_lname', 100)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('contact_number', 20)->nullable();
            $table->boolean('is_deleted')->nullable()->default(false);
            $table->timestamp('father_created')->nullable()->useCurrent();
            $table->timestamp('father_updated')->nullable()->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('father');
        // Also drop the old singular table name if it exists
        Schema::dropIfExists('father');
    }
};
