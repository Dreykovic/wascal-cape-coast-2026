<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Codes d'accès des galeries de comité (un par propriétaire : 4 comités + Club d'anglais).
// code_hash = hash bcrypt du code partagé (NULL = pas de code = accès fermé).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_codes', function (Blueprint $table) {
            $table->string('owner')->primary();
            $table->string('code_hash')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gallery_codes');
    }
};
