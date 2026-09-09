<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Étapes du séjour à UCC (section « Parcours » du one-page) : le carnet de bord chronologique qui remplace
// la logique de comités. Chaque étape porte une étiquette d'activité (couleur, cf.
// config('wascal.gallery_owners')) et un texte rédigé au passé par le Club d'anglais.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('journey_stages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('tag')->nullable();       // clé de config('wascal.gallery_owners'), ou null
            $table->string('date_label')->nullable(); // texte libre : "Semaine 1", "12-14 sept. 2026"…
            $table->text('body')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->index('sort_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('journey_stages');
    }
};
