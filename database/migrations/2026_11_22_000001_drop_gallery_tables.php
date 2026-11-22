<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Retrait de la galerie : le one-page est illustré par les photos de la promotion (public/img/),
// il n'y a plus d'albums gérés depuis /admin. Les fichiers déjà téléversés dans le dossier
// d'uploads ne sont PAS supprimés par cette migration.
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('gallery_photos');
        Schema::dropIfExists('gallery_albums');
        DB::table('settings')->where('key', 'drive_all')->delete();
    }

    public function down(): void
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
        Schema::create('gallery_photos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('album_id')->index();
            $table->string('filename');
            $table->string('caption', 160)->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });
    }
};
