<?php

namespace Database\Seeders;

use App\Models\JourneyStage;
use Illuminate\Database\Seeder;

class JourneyStageSeeder extends Seeder
{
    // Sème une trame de 8 étapes (à ajuster : vraies dates, texte, photos) si la table est
    // vide. Idempotent, comme GalleryOwnersSeeder — ne touche à rien si des étapes existent déjà.
    public function run(): void
    {
        if (JourneyStage::query()->exists()) {
            return;
        }

        $stages = [
            ['title' => 'Le grand départ', 'tag' => null, 'date_label' => 'À compléter', 'body' => "Sélection, préparatifs, vols depuis les 8 pays — arrivée à Cape Coast."],
            ['title' => "Premiers pas à UCC", 'tag' => 'club', 'date_label' => 'À compléter', 'body' => "Installation au campus, orientation, rencontre avec le Club d'anglais."],
            ['title' => 'La vie en cours', 'tag' => null, 'date_label' => 'À compléter', 'body' => "16 semaines d'immersion en anglais — le quotidien du programme."],
            ['title' => 'Sur la route', 'tag' => 'sorties', 'date_label' => 'À compléter', 'body' => "Cape Coast Castle, Kakum, Elmina — ce qu'on a découvert du Ghana."],
            ['title' => 'Le terrain', 'tag' => 'sport', 'date_label' => 'À compléter', 'body' => 'Tournois, foot, volley, footing — la promo en mouvement.'],
            ['title' => 'Les soirées de la promo', 'tag' => 'soirees', 'date_label' => 'À compléter', 'body' => 'Movie nights, karaoké, game nights et soirées-pays.'],
            ['title' => 'Talents & débats', 'tag' => 'culture', 'date_label' => 'À compléter', 'body' => "Club de débat, danse, chant, cuisine ghanéenne — nos talents partagés."],
            ['title' => 'La clôture', 'tag' => null, 'date_label' => 'À compléter', 'body' => 'Cérémonie, attestations, photo de promo — et le retour au pays.'],
        ];

        foreach ($stages as $i => $s) {
            JourneyStage::create($s + ['sort_order' => $i]);
        }
    }
}
