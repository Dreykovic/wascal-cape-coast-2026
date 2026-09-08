<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

// Suppression du concept de comité : plus de connexion par code partagé par comité.
// La galerie devient un espace de gestion unique (super-admin + Club d'anglais).
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('gallery_codes');
    }

    public function down(): void
    {
        Schema::create('gallery_codes', function ($table) {
            $table->string('owner')->primary();
            $table->string('code_hash')->nullable();
            $table->timestamps();
        });
    }
};
