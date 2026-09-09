# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Le projet, ses contenus et ses échanges sont **en français**. Réponds en français.

## Contexte

Boîte à outils pour le programme **WASCAL Cape Coast 2026** (32 étudiant·e·s, 8 délégations
francophones d'Afrique de l'Ouest, 16 semaines d'anglais au Ghana). Trois piliers : **programme des
cours**, **rappels**, **activités**. Il n'y a **pas** de fonctionnalité « devoirs / homework » — hors
périmètre, ne pas la réintroduire.

Le site vitrine (`/`) est un **one-page** (un seul deck de slides, pas de routes séparées pour la
narration) — porté par le **Club d'anglais**, il raconte le carnet de bord du séjour : une section
« Parcours » du deck montre les étapes du séjour au fil du temps, et une section « Galerie » montre
les activités qui s'y sont déroulées. Il n'y a **pas** de fonctionnalité « comités / répartition » (retirée : sondage sans choix
de comité, plus de connexion par code de comité, plus de réaffectation par l'admin) — hors périmètre,
ne pas la réintroduire. Le sondage (`/survey`) collecte encore logement, niveau d'anglais, activités,
talents ; une éventuelle transformation en « livre d'or » (contribution après-séjour) est trackée en
issue GitHub, pas encore implémentée.

**Ce dépôt est le portage Laravel** d'une app Node/Fastify d'origine (désormais archivée dans
`archive/files/`), refait pour tourner sur un **hébergement mutualisé Hostinger Premium** (PHP + MySQL,
sans VPS, sans Node). Le **front est réutilisé tel quel** ; seule la couche serveur a été réécrite en Laravel.

## Stack : Laravel 13 + MySQL (aucun build front)

- **Back** : Laravel 13 / PHP 8.2+. Base **MySQL** en prod, **SQLite** en dev (change juste `DB_CONNECTION`).
- **Front** : HTML/CSS/JS **vanilla**, **aucun bundler, aucune étape de build**. Les pages
  (`resources/pages/*.html`) sont servies **statiquement** via `PageController` (`response()->file`), pas
  en Blade — leur JS inline entrerait en conflit avec `{{ }}`. Les assets partagés `public/app.css` et
  `public/shared.js` (module ES) sont servis au web root, aux mêmes chemins que dans l'app d'origine.
- Le levier du portage : **URL d'API identiques** à l'app Node d'origine pour ce qui subsiste
  (`/api/responses`, `/api/gallery`, `/api/admin/*`, `/api/gallery/*`) → ce front fonctionne sans
  modification. Le concept de comités (et ses routes `/comite`, `/api/comite/*`) a été retiré du
  portage ; `/api/journey-stages` est propre à Laravel, sans équivalent Node — consommé par la
  section « Parcours » du one-page (`index.html`), pas par une route séparée.

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
| `app/Http/Controllers/PageController.php` | Sert `/`, `/survey`, `/admin` = fichiers `resources/pages/*.html`. `/` est un **one-page** : pas de route dédiée pour le parcours ou la galerie, ce sont des sections du même deck |
| `app/Http/Controllers/SurveyController.php` | `POST /api/responses` — validation serveur (miroir de l'original), dédup des idées proposées. `GET /api/survey-status` (public) reflète l'interrupteur `survey_open` (`Setting`) |
| `app/Http/Controllers/GalleryController.php` | `GET /api/gallery` (public) **et** gestion `/api/gallery/*` (manage, album/photo CRUD, upload base64), réservée super-admin |
| `app/Http/Controllers/JourneyStageController.php` | `GET /api/journey-stages` (public) **et** CRUD + `reorder` sous `/api/admin/journey-stages/*` (super-admin) |
| `app/Http/Controllers/AdminController.php` | Réservé super-admin : réponses, export CSV, réglage Drive global, `POST /api/admin/survey/toggle` (ouvre/ferme le sondage) |
| `app/Http/Controllers/AuthController.php` | Login admin (mot de passe), logout, `me`, `session` |
| `app/Http/Middleware/RequireAdmin.php` | Alias `admin`. Seul rôle d'accès : super-admin (plus de périmètre par comité à vérifier) |
| `app/Support/WascalSession.php` | Un seul rôle porté par la **session** (équivalent du cookie signé Node) : `super` |
| `app/Support/GalleryImage.php` | Décodage data-URL base64 + écriture/suppression dans le dossier d'uploads (`config('wascal.uploads_path')`) |
| `app/Support/Sanitize.php` | Nettoyage couleur hex / URL http(s) |
| `app/Models/*` | `Response` (casts JSON), `JourneyStage` (étapes du parcours, `tagInfo()`), `GalleryAlbum` (a des `photos`), `GalleryPhoto`, `Setting` (KV, `read/write`) |
| `config/wascal.php` | **Référentiels serveur** (délégations, étiquettes d'activité/galerie, activités, talents, `admin_password`, `uploads_path`) — miroir de `public/shared.js`. Source de vérité pour la **validation** |
| `database/seeders/GalleryOwnersSeeder.php` | Sème 1 album par étiquette (4 étiquettes + Club d'anglais) si la galerie est vide |
| `database/seeders/JourneyStageSeeder.php` | Sème une trame de 8 étapes (titres/textes à ajuster) si `journey_stages` est vide |
| `resources/pages/*.html` | Front vanilla (index = one-page vitrine, survey, admin) |
| `DEPLOY-HOSTINGER.md` | **Guide de déploiement mutualisé** (racine web sur `public/`, upload avec `vendor/`, MySQL, migrations) |

## Le cœur : le carnet de bord (parcours + galerie)

- **Parcours** (section du one-page `index.html`, table `journey_stages`) : chronologie du séjour,
  gérée depuis `/admin` (titre, étiquette de couleur, dates en texte libre, corps rédigé au passé),
  affichée dans la slide « Parcours » via `GET /api/journey-stages` — même pattern que la galerie
  (fetch côté client, rendu en JS, rien de dédié côté route). Ordre = `sort_order`, réordonné via
  `POST /api/admin/journey-stages/reorder {ids: [...]}`.
- **Galerie** : chaque album a une colonne `owner`, qui est désormais une simple **étiquette de
  couleur** (`config('wascal.gallery_owners')` : Club d'anglais + 4 étiquettes), pas un compte scopé.
  Un seul espace de gestion (`/admin`, super-admin) ; pas de connexion par code, pas de périmètre à
  vérifier côté serveur. Upload = image redimensionnée par le navigateur, envoyée en **base64**, écrite
  dans `public/uploads` (ou `uploads_path`).

## Conventions

- **Le site vitrine est un one-page** : `index.html` est un seul deck de slides (navigation JS, pas
  d'ancres d'URL). Un nouveau contenu narratif (parcours, galerie, etc.) est **une section du deck**,
  pas une nouvelle route/page — `/survey` et `/admin` restent seuls en dehors du deck car ce sont des
  outils fonctionnels, pas de la narration.
- **Parité avec l'app Node d'origine** (archivée dans `archive/files/`) : mêmes contrats d'API, mêmes
  règles de validation, mêmes messages. Le front lit `d.errors` (pluriel) pour le sondage, `d.error`
  (singulier) pour les erreurs galerie/admin — respecter cette distinction.
- **Dev sur SQLite, prod sur MySQL** : garder le SQL **portable** (Eloquent/migrations, pas de fonction
  spécifique à un moteur).
- **Secrets hors du code** : `ADMIN_PASSWORD` via `.env` (⚠️ fallback `wascal2026` si absent — définir en
  prod).
- **Aucun build front** : mutualiser via `public/app.css` / `public/shared.js`, jamais via un bundler.
  Ne pas convertir les pages en Blade (conflit `{{ }}` avec le JS inline).
