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
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->increments('id');
            $table->integer('sy_id');
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->string('type', 30); // holiday, break, suspension, special_event
            $table->date('start_date');
            $table->date('end_date');
            $table->boolean('is_school_day')->default(false);
            $table->timestamps();

            $table->unique(['sy_id', 'title', 'start_date']);
            $table->index(['sy_id', 'start_date', 'end_date']);

            $table->foreign('sy_id')->references('sy_id')->on('school_year')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};
