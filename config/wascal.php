<?php

// Référentiels WASCAL Cape Coast 2026 — source de vérité CÔTÉ SERVEUR (validation + seeding).
// Miroir des constantes de public/shared.js (front). Garder les deux alignés.
// NB : pas de fonctionnalité « devoirs / homework » — hors périmètre, ne pas réintroduire.

return [

    // Mot de passe unique d'accès à /admin (super-admin). À définir dans .env (ADMIN_PASSWORD).
    // Fallback identique à l'app Node d'origine — À CHANGER en production.
    'admin_password' => env('ADMIN_PASSWORD', 'wascal2026'),

    // Dossier où sont ÉCRITES les photos téléversées. Par défaut public/uploads (racine web = public/).
    // Sur mutualisé où la racine web est public_html, pointer ici vers .../public_html/uploads
    // (les photos restent servies à l'URL relative « uploads/… »). Voir DEPLOY-HOSTINGER.md.
    'uploads_path' => env('WASCAL_UPLOADS_PATH', public_path('uploads')),

    // 8 délégations francophones d'Afrique de l'Ouest.
    'delegations' => [
        'Bénin', 'Burkina Faso', "Côte d'Ivoire", 'Guinée',
        'Mali', 'Niger', 'Sénégal', 'Togo',
    ],

    // Logement.
    'floors' => ['Étage (filles)', 'Rez-de-chaussée (garçons)'],

    'english_levels' => ['Débutant', 'Intermédiaire', 'Avancé'],

    // Étiquettes d'activité : catégorisent à la fois les albums de la galerie et les étapes
    // du parcours (`journey_stages.tag`). Anciennement les 4 « comités » (répartition, connexion
    // par code) — désormais de simples étiquettes de couleur, sans compte ni périmètre associé.
    // Le Club d'anglais (et le super-admin) gère tout depuis un espace unique.
    'gallery_owners' => [
        ['key' => 'club',    'name' => "Club d'anglais",       'color' => '#f2a900', 'emoji' => '📣'],
        ['key' => 'sorties', 'name' => 'Sorties & Excursions', 'color' => '#0e8c7a', 'emoji' => '🌳'],
        ['key' => 'soirees', 'name' => 'Soirées & Jeux',       'color' => '#8a2d5d', 'emoji' => '🎉'],
        ['key' => 'sport',   'name' => 'Sport & Bien-être',    'color' => '#1c7a45', 'emoji' => '⚽'],
        ['key' => 'culture', 'name' => 'Culture & Échanges',   'color' => '#e85d1b', 'emoji' => '🎭'],
    ],

    // Activités proposées à cocher au sondage.
    'activities' => [
        'Sorties & excursions', 'Movie Night', 'Game Night', 'Karaoké en anglais',
        'Football', 'Volley-ball', 'Footing matinal', 'Tournoi sportif',
        'Soirées-pays', 'Danse & percussions', 'Cuisine ghanéenne', 'Club de débat',
    ],

    'talents' => [
        'Cuisine', 'Chant', 'Instrument de musique', 'Danse', 'Sport',
        'Photo / vidéo', 'Animation / présentation', 'Organisation / logistique',
        'Dessin / déco', 'Langues locales',
    ],
];
