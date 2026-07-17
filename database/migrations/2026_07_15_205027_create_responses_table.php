<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Réponses au sondage. Miroir de la table `responses` de l'app Node (db.js).
// Les tableaux (comité souhaité, activités, idées, talents) sont stockés en JSON.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('responses', function (Blueprint $table) {
            $table->id();
            $table->string('full_name');
            $table->string('delegation');
            $table->string('floor')->nullable();
            $table->json('committee_rank');       // 1 comité souhaité (tableau)
            $table->json('activities');           // activités cochées dans la liste
            $table->json('proposed_activities');  // idées libres proposées
            $table->json('talents');
            $table->string('english_level')->nullable();
            $table->string('dietary')->nullable();
            $table->text('notes')->nullable();
            $table->string('assigned_committee')->nullable(); // fixé à la main par l'admin (null = comité demandé)
            $table->timestamps();
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responses');
    }
};
