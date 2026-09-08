<?php

namespace Database\Seeders;

use App\Models\GalleryAlbum;
use Illuminate\Database\Seeder;

class GalleryOwnersSeeder extends Seeder
{
    // Crée un album par étiquette (4 étiquettes d'activité + Club d'anglais) si la galerie est vide.
    // Idempotent : ne touche à rien si des albums existent déjà (équivalent seedGalleryIfEmpty).
    public function run(): void
    {
        if (GalleryAlbum::query()->exists()) {
            return;
        }

        foreach (config('wascal.gallery_owners') as $i => $owner) {
            GalleryAlbum::create([
                'title' => $owner['name'],
                'color' => $owner['color'],
                'owner' => $owner['key'],
                'sort_order' => $i,
            ]);
        }
    }
}
