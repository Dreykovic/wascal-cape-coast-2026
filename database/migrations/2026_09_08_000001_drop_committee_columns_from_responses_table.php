<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Suppression du concept de comité : le sondage ne demande plus de comité souhaité,
// et l'admin ne réaffecte plus personne à un comité (répartition retirée).
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('responses', function (Blueprint $table) {
            $table->dropColumn(['committee_rank', 'assigned_committee']);
        });
    }

    public function down(): void
    {
        Schema::table('responses', function (Blueprint $table) {
            $table->json('committee_rank')->nullable();
            $table->string('assigned_committee')->nullable();
        });
    }
};
