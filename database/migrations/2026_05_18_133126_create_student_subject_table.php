<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_subject', function (Blueprint $table) {
            $table->increments('stu_subj_id');
            $table->integer('stu_id');
            $table->integer('subj_id');
            $table->integer('sy_id')->nullable();
            $table->timestamp('enrolled_at')->nullable()->useCurrent();

            $table->unique(['stu_id', 'subj_id', 'sy_id']);

            $table->foreign('stu_id')->references('stu_id')->on('student')->onDelete('cascade');
            $table->foreign('subj_id')->references('subj_id')->on('subject')->onDelete('cascade');
            $table->foreign('sy_id')->references('sy_id')->on('school_year')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_subject');
    }
};
