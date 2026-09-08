# Déploiement sur Hostinger (mutualisé Premium / Single)

Cette app **Laravel + MySQL** tourne sur un mutualisé Hostinger **sans VPS**. Pas de build front
(HTML/CSS/JS servis tels quels), pas de dépendance native à compiler. Le principe : on prépare tout
**en local**, on **téléverse le projet complet (avec `vendor/`)**, on branche **MySQL**, on lance les
**migrations** une fois.

---

## 0. Prérequis côté Hostinger (hPanel)

1. **PHP 8.2+** — hPanel → *Avancé → Configuration PHP* → choisir **PHP 8.2 ou 8.3**.
   Vérifier que ces extensions sont cochées : `pdo_mysql`, `mbstring`, `openssl`, `gd`, `fileinfo`, `ctype`, `json`.
2. **Base MySQL** — hPanel → *Bases de données → Bases MySQL* → créer une base + un utilisateur.
   Noter : **nom de base**, **utilisateur**, **mot de passe**, **hôte** (souvent `localhost`).
3. **SSH** (recommandé) — hPanel → *Avancé → Accès SSH* : activer. Sert à lancer les migrations.
   (Une procédure **sans SSH** est donnée au §6b.)

---

## 1. Préparer le projet en local

Depuis le dossier `wascal-laravel/` :

```bash
# 1. Dépendances de PRODUCTION uniquement (sans dev), autoloader optimisé
composer install --no-dev --optimize-autoloader

# 2. Fichier .env de production
cp .env.example .env
php artisan key:generate        # génère APP_KEY
```

Éditer `.env` pour la production :

```dotenv
APP_NAME="WASCAL Cape Coast 2026"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://ton-domaine.example        # l'URL publique réelle
APP_KEY=base64:...                          # déjà rempli par key:generate

ADMIN_PASSWORD=un-mot-de-passe-solide       # accès à /admin — À CHANGER

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=uXXXXXXXX_wascal                # depuis hPanel
DB_USERNAME=uXXXXXXXX_wascal
DB_PASSWORD=le-mot-de-passe-mysql
```

> `APP_DEBUG=false` est **impératif** en prod (sinon les erreurs exposent la config).

---

## 2. Choisir la disposition des fichiers (le point important sur mutualisé)

Laravel sert le web depuis son dossier **`public/`**, alors que le mutualisé sert depuis
**`public_html/`**. Deux options — choisis selon ce que hPanel te permet :

### Option A — recommandée : racine web = `public/` (sous-domaine ou domaine dédié)

La plus propre : le code reste **hors** de la racine web.

1. Téléverse tout le projet dans `~/wascal-laravel/` (voir §3).
2. hPanel → *Sites web* (ou *Sous-domaines*) → fais pointer la **racine de documents** du
   domaine/sous-domaine vers **`/home/uXXXX/wascal-laravel/public`**.

Rien d'autre à configurer : `public/uploads`, `app.css`, `shared.js` sont servis directement.

### Option B — repli : racine web fixée à `public_html/`

Si tu ne peux pas changer la racine (domaine principal) :

1. Téléverse le projet dans `~/wascal-laravel/` (hors `public_html`).
2. Déplace **le contenu** de `~/wascal-laravel/public/*` dans `~/public_html/`
   (y compris `.htaccess`, `index.php`, `app.css`, `shared.js`, `favicon.ico`, `robots.txt`, `uploads/`).
3. Édite `~/public_html/index.php` : les deux chemins `require`/`bootstrap` doivent viser le projet.
   Remplace `__DIR__.'/../'` par `'/home/uXXXX/wascal-laravel/'` :
   ```php
   require '/home/uXXXX/wascal-laravel/vendor/autoload.php';
   $app = require_once '/home/uXXXX/wascal-laravel/bootstrap/app.php';
   ```
4. Dis à l'app d'**écrire les photos dans le dossier servi**. Dans `.env` :
   ```dotenv
   WASCAL_UPLOADS_PATH=/home/uXXXX/public_html/uploads
   ```
   (Les photos restent servies à l'URL `uploads/…`. Crée le dossier : `mkdir -p ~/public_html/uploads`.)

---

## 3. Téléverser le projet

Au choix — **inclure `vendor/`** (pas de `composer install` requis sur le serveur), **exclure**
`node_modules` (aucun) et la base locale `database/*.sqlite` :

- **Git (le plus simple si SSH actif)** : `git clone` ton dépôt dans `~/wascal-laravel`, puis
  `composer install --no-dev --optimize-autoloader` sur le serveur (Composer est dispo via SSH).
- **Gestionnaire de fichiers hPanel / SFTP** : envoyer un `.zip` du projet **avec `vendor/`** et le
  décompresser dans `~/wascal-laravel`. Ne pas envoyer `.env` de dev ni `database/database.sqlite`.

> `.env` contient des secrets : téléverse-le séparément et vérifie qu'il n'est **pas** dans un dossier web.

---

## 4. Permissions

Les dossiers écrits par l'app doivent être inscriptibles par l'utilisateur web :

```bash
chmod -R 775 storage bootstrap/cache
mkdir -p public/uploads && chmod 775 public/uploads    # (ou ~/public_html/uploads en Option B)
```

---

## 5. Autoriser les uploads de photos (taille du POST)

Les photos sont envoyées en **base64 JSON** (redimensionnées côté navigateur, ~1–2 Mo). Le `post_max_size`
par défaut peut être trop bas. hPanel → *Configuration PHP → Options* : mettre
**`post_max_size` = 16M** et **`upload_max_filesize` = 16M**. (Ou via un `.htaccess` :
`php_value post_max_size 16M`.)

---

## 6. Créer les tables (migrations) — une seule fois

### 6a. Avec SSH (recommandé)

```bash
cd ~/wascal-laravel
php artisan migrate --force --seed     # crée les tables + sème les 5 albums de galerie + les étapes
php artisan config:cache               # met la config en cache (perf)
php artisan route:cache
```

### 6b. Sans SSH

- Utilise le **terminal du navigateur** de hPanel (*Avancé → Terminal*) et lance les mêmes commandes.
- À défaut, importe le schéma via **phpMyAdmin** : en local, `php artisan schema:dump`, puis importe le
  fichier SQL généré, et lance le seeder plus tard via une visite unique. (Le SSH/terminal reste bien plus simple.)

---

## 7. Vérifier

1. Ouvre `https://ton-domaine.example/` → le site s'affiche, la galerie se charge.
2. `/survey` → remplis et envoie une réponse test.
3. `/parcours` → les étapes semées par défaut s'affichent.
4. `/admin` → connecte-toi avec `ADMIN_PASSWORD` → tu vois les réponses, l'export CSV, les étapes du
   parcours et la galerie. Édite les étapes (titre, dates réelles, texte) au fil du séjour.

---

## 8. Mettre à jour plus tard

Avec Git + SSH :

```bash
cd ~/wascal-laravel
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache && php artisan route:cache
```

En Option B, re-synchronise `public/*` vers `public_html/` après un `git pull` si les assets ont changé.

---

## Sauvegarde

Tout l'état vit dans **la base MySQL** (réponses, albums, codes, réglages) **+** le dossier des
**photos** (`public/uploads` ou `public_html/uploads`). Sauvegarder les deux :
- base : hPanel → *Bases MySQL → Exporter* (ou phpMyAdmin → Exporter),
- photos : télécharger le dossier `uploads/`.

---

## Dépannage express

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page blanche / 500 | `APP_KEY` manquante ou `storage/` non inscriptible | `php artisan key:generate` ; `chmod -R 775 storage bootstrap/cache` |
| 500 après déploiement | config en cache obsolète | `php artisan config:clear` puis `config:cache` |
| CSS/JS non chargés | mauvaise racine web | racine doit pointer sur `public/` (Option A) ou assets copiés dans `public_html/` (Option B) |
| Upload photo échoue | `post_max_size` trop bas ou `uploads/` non inscriptible | §5 + `chmod 775` sur le dossier d'uploads |
| « SQLSTATE… access denied » | identifiants MySQL | revérifier `DB_*` dans `.env` depuis hPanel |
