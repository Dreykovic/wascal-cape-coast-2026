# Contribuer

Merci de vouloir contribuer à ce projet ! Ce guide couvre la mise en route, les conventions de
commit et le process de contribution. Pour l'architecture et les conventions de code détaillées,
voir [`CLAUDE.md`](CLAUDE.md).

## Mise en route

Prérequis : **PHP 8.2+**, **Composer**.

```bash
git clone https://github.com/Dreykovic/wascal-cape-coast-2026.git
cd wascal-cape-coast-2026
composer install
composer run setup    # copie .env, génère APP_KEY, crée la base SQLite, migre + seed
composer run dev       # http://127.0.0.1:8080
```

`composer install` active automatiquement les hooks Git du dépôt (`core.hooksPath`, voir
ci-dessous) — aucune étape manuelle supplémentaire n'est nécessaire.

## Tests

```bash
php artisan test
```

Merci d'ajouter ou de mettre à jour les tests correspondant à vos changements.

## Convention de commit

- Messages en français, format `type(scope): résumé court` (ex. `fix(admin): corrige l'export CSV`).
- Un commit = un changement logique.
- **N'incluez pas de trailer `Co-Authored-By: Claude ...` / `Co-Authored-By: <assistant IA> ...`**
  dans les messages de commit, quel que soit l'outil utilisé pour écrire le code. Un hook Git
  (`.githooks/commit-msg`) le retire automatiquement si `core.hooksPath` est configuré — ce que
  fait `composer install` pour vous. Pour l'activer manuellement dans un clone existant :

  ```bash
  git config core.hooksPath .githooks
  ```

## Pull requests

1. Créez une branche depuis `main` (`feat/...`, `fix/...`).
2. Gardez le SQL portable (Eloquent/migrations) : le projet tourne en SQLite en dev et MySQL en
   production.
3. Aucun bundler, aucune étape de build front — le front (`resources/pages/*.html`,
   `public/app.css`, `public/shared.js`) est du HTML/CSS/JS vanilla servi tel quel.
4. Décrivez le changement et son impact fonctionnel dans la description de la PR.
5. Assurez-vous que `php artisan test` passe avant de demander une revue.

## Signaler un bug / proposer une fonctionnalité

Ouvrez une [issue](https://github.com/Dreykovic/wascal-cape-coast-2026/issues) en décrivant le
comportement observé vs. attendu (pour un bug) ou le besoin (pour une fonctionnalité).
