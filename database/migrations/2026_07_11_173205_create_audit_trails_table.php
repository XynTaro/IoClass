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
        Schema::create('audit_trail', function (Blueprint $table) {
            $table->increments('audit_id');
            $table->string('actor_type', 20)->index();
            $table->unsignedInteger('actor_id')->nullable();
            $table->string('actor_name', 200)->nullable();
            $table->string('action', 100)->index();
            $table->string('description', 500)->nullable();
            $table->json('properties')->nullable();
            $table->timestamp('created_at')->nullable()->useCurrent()->index();

            $table->index(['actor_type', 'actor_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('audit_trail');
    }
};
