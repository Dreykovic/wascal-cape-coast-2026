<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Albums de galerie. `owner` = clé du propriétaire (comité ou Club d'anglais),
// null = non rattaché (géré par le super-admin seulement).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gallery_albums', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('color')->default('#e85d1b');
            $table->string('drive_url', 600)->nullable();
            $table->string('owner')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gallery_albums');
    }
};
