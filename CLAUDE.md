# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Le projet, ses contenus et ses échanges sont **en français**. Réponds en français.

## Contexte

Boîte à outils pour le programme **WASCAL Cape Coast 2026** (32 étudiant·e·s, 8 délégations
francophones d'Afrique de l'Ouest, 16 semaines d'anglais au Ghana). Trois piliers : **programme des
cours**, **rappels**, **activités**. Il n'y a **pas** de fonctionnalité « devoirs / homework » — hors
périmètre, ne pas la réintroduire.

**Ce dépôt est le portage Laravel** d'une app Node/Fastify d'origine (désormais archivée dans
`archive/files/`), refait pour tourner sur un **hébergement mutualisé Hostinger Premium** (PHP + MySQL,
sans VPS, sans Node). Le **front est réutilisé tel quel** ; seule la couche serveur a été réécrite en Laravel.

## Stack : Laravel 13 + MySQL (aucun build front)

- **Back** : Laravel 13 / PHP 8.2+. Base **MySQL** en prod, **SQLite** en dev (change juste `DB_CONNECTION`).
- **Front** : HTML/CSS/JS **vanilla**, **aucun bundler, aucune étape de build**. Les pages
  (`resources/pages/*.html`) sont servies **statiquement** via `PageController` (`response()->file`), pas
  en Blade — leur JS inline entrerait en conflit avec `{{ }}`. Les assets partagés `public/app.css` et
  `public/shared.js` (module ES) sont servis au web root, aux mêmes chemins que dans l'app d'origine.
- Le levier du portage : **URL d'API identiques** à l'app Node (`/api/responses`, `/api/gallery`,
  `/api/admin/*`, `/api/gallery/*`, `/api/comite/*`) → le front fonctionne **sans modification**.

## Commandes

Depuis la racine du projet. Prérequis **PHP 8.2+**, **Composer**.

| But | Commande |
|---|---|
| Installer | `composer install` |
| Base + données de démo | `php artisan migrate:fresh --seed` (SQLite local par défaut) |
| Lancer en local | `php artisan serve --port=8080` → http://127.0.0.1:8080 (port 8000 souvent bloqué sous Windows) |
| Tests | `php artisan test` |
| Vider les caches | `php artisan optimize:clear` |

Pas de `npm`, pas de build : le front est servi tel quel. Déploiement mutualisé : voir **`DEPLOY-HOSTINGER.md`**.

## Architecture

| Chemin | Rôle |
|---|---|
| `routes/web.php` | Toutes les routes (pages + API). `/api/*` est **exempté de CSRF** (`bootstrap/app.php`) car ce sont des appels JSON `fetch`, comme l'app Node. |
| `app/Http/Controllers/PageController.php` | Sert `/`, `/survey`, `/admin`, `/comite` = fichiers `resources/pages/*.html` |
| `app/Http/Controllers/SurveyController.php` | `POST /api/responses` — validation serveur (miroir de l'original), dédup des idées proposées |
| `app/Http/Controllers/GalleryController.php` | `GET /api/gallery` (public) **et** gestion scopée `/api/gallery/*` (manage, album/photo CRUD, upload base64) |
| `app/Http/Controllers/AdminController.php` | Réservé super-admin : réponses, `assign`, export CSV, réglage Drive global, génération/révocation des **codes** de comité |
| `app/Http/Controllers/AuthController.php` | Login admin (mot de passe), login comité (code haché bcrypt), logout, `me`, `session` |
| `app/Http/Middleware/RequireAdmin.php` · `RequireGallery.php` | Alias `admin` / `gallery`. Gardent les routes ; le **périmètre** (album d'un autre comité) est vérifié dans le contrôleur |
| `app/Support/WascalSession.php` | Deux rôles portés par la **session** (équivalent du cookie signé Node) : `super` / `owner:<clé>`. `outOfScope()` = un comité ne touche qu'à SES albums |
| `app/Support/GalleryImage.php` | Décodage data-URL base64 + écriture/suppression dans le dossier d'uploads (`config('wascal.uploads_path')`) |
| `app/Support/Sanitize.php` | Nettoyage couleur hex / URL http(s) |
| `app/Models/*` | `Response` (casts JSON + `effectiveCommittee()`), `GalleryAlbum` (a des `photos`), `GalleryPhoto`, `Setting` (KV, `read/write`), `GalleryCode` (PK `owner`) |
| `config/wascal.php` | **Référentiels serveur** (délégations, comités, propriétaires de galerie, activités, talents, `admin_password`, `uploads_path`) — miroir de `public/shared.js`. Source de vérité pour la **validation** |
| `database/seeders/GalleryOwnersSeeder.php` | Sème 1 album par propriétaire (4 comités + Club d'anglais) si la galerie est vide |
| `resources/pages/*.html` | Front vanilla repris de l'app d'origine (index, survey, admin, comite) |
| `DEPLOY-HOSTINGER.md` | **Guide de déploiement mutualisé** (racine web sur `public/`, upload avec `vendor/`, MySQL, migrations) |

## Le cœur : galerie décentralisée + comités

- **Répartition** (`admin.html`) : chaque personne est dans son comité **effectif** = `assigned_committee`
  s'il est défini, sinon `committee_rank[0]` (`Response::effectiveCommittee()`). **Pas de réaffectation
  automatique** : l'admin équilibre à la main via `POST /api/admin/assign` (persisté). Le **PDF de
  répartition est côté navigateur** (`window.print()` dans `admin.html`) — rien à coder côté serveur.
- **Galerie scopée** : 5 propriétaires (`club` + 4 comités). Chaque album a une colonne `owner`. Le
  super-admin voit/édite tout ; un comité connecté par **code** (haché en base, généré par l'admin) ne
  gère que **ses** albums. Le contrôle de périmètre est **côté serveur** (`WascalSession::outOfScope` →
  403), jamais côté UI. Upload = image redimensionnée par le navigateur, envoyée en **base64**, écrite
  dans `public/uploads` (ou `uploads_path`).

## Conventions

- **Parité avec l'app Node d'origine** (archivée dans `archive/files/`) : mêmes contrats d'API, mêmes
  règles de validation, mêmes messages. Le front lit `d.errors` (pluriel) pour le sondage, `d.error`
  (singulier) pour les erreurs galerie/admin — respecter cette distinction.
- **Dev sur SQLite, prod sur MySQL** : garder le SQL **portable** (Eloquent/migrations, pas de fonction
  spécifique à un moteur).
- **Secrets hors du code** : `ADMIN_PASSWORD` via `.env` (⚠️ fallback `wascal2026` si absent — définir en
  prod). Codes de comité hachés (`Hash::make`/`Hash::check`, bcrypt).
- **Aucun build front** : mutualiser via `public/app.css` / `public/shared.js`, jamais via un bundler.
  Ne pas convertir les pages en Blade (conflit `{{ }}` avec le JS inline).
