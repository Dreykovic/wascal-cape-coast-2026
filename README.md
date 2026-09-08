# WASCAL Cape Coast 2026

Boîte à outils pour le programme **WASCAL Cape Coast 2026** : 32 étudiants et étudiantes,
8 délégations francophones d'Afrique de l'Ouest, 16 semaines d'anglais au Ghana.

Trois piliers : **programme des cours**, **rappels**, **activités**. Le site est le carnet de bord
du séjour, porté par le **Club d'anglais** : chronologie du parcours (`/parcours`) et galerie photo
des activités vécues. Il n'y a pas de fonctionnalité « devoirs / homework » — hors périmètre du projet.

Ce dépôt est le portage Laravel d'une app Node/Fastify d'origine, désormais archivée dans
[`archive/files/`](archive/files), réécrit pour tourner sur un **hébergement mutualisé**
(PHP + MySQL, sans VPS, sans Node).

## Stack

- **Back** : Laravel 13 / PHP 8.2+, base MySQL en production, SQLite en développement.
- **Front** : HTML/CSS/JS vanilla, **aucun bundler, aucune étape de build**. Les pages
  (`resources/pages/*.html`) sont servies statiquement, pas en Blade.
- Les URL d'API reprennent celles de l'app Node d'origine pour ce qui subsiste (`/api/responses`,
  `/api/gallery`, `/api/admin/*`) ; `/api/journey-stages` et `/parcours` sont propres à ce portage.

Le détail de l'architecture, des conventions et du cœur fonctionnel (parcours + galerie) est
documenté dans [`CLAUDE.md`](CLAUDE.md).

## Démarrage rapide

Prérequis : **PHP 8.2+** et **Composer**.

```bash
composer install
composer run setup   # copie .env, génère APP_KEY, crée la base SQLite, migre + seed
composer run dev      # http://127.0.0.1:8080
```

Ou, étape par étape :

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate:fresh --seed   # SQLite locale par défaut
php artisan serve --port=8080      # http://127.0.0.1:8080 (le port 8000 est souvent bloqué sous Windows)
```

| But | Commande |
|---|---|
| Installer les dépendances | `composer install` |
| Base + données de démo | `php artisan migrate:fresh --seed` |
| Lancer en local | `php artisan serve --port=8080` |
| Tests | `php artisan test` |
| Vider les caches | `php artisan optimize:clear` |

Pas de `npm`, pas de build : le front est servi tel quel.

## Déploiement

Guide complet pour un hébergement mutualisé (Hostinger Premium ou équivalent) dans
[`DEPLOY-HOSTINGER.md`](DEPLOY-HOSTINGER.md).

## Contribuer

Les contributions sont bienvenues — voir [`CONTRIBUTING.md`](CONTRIBUTING.md) pour la mise en
route (dev, tests, convention de commit) et [`CLAUDE.md`](CLAUDE.md) pour les conventions du
projet et l'architecture détaillée.

## Licence

Ce projet est sous licence [MIT](LICENSE).
