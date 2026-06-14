# WASCAL Cape Coast 2026 — site, sondage & admin

App **Node + Fastify** autonome, base **SQLite** (module `node:sqlite` intégré — aucune
dépendance native à compiler). Trois pages servies par le même process :

| URL | Page | Accès |
|---|---|---|
| `/` | Site informatif (programme, calendrier 16 semaines, soirées-pays) | public |
| `/survey` | Sondage en 4 étapes → table `responses` | public |
| `/admin` | Répartition en 4 comités équilibrés, rotation 4 mois, export CSV | **mot de passe** |

API : `POST /api/responses` · `GET /api/gallery` (public) · `/api/admin/*` (cookie de session signé).

## Prérequis

- **Node ≥ 22.5** (testé sur Node 24). Vérifier : `node --version`.

## Lancer en local

```bash
cd files
npm install
cp .env.example .env        # puis éditer ADMIN_PASSWORD et COOKIE_SECRET
node --env-file=.env server.js   # ou: npm start (lit les variables d'env du shell)
```

Ouvrir <http://localhost:3000>. La base est créée automatiquement dans `./data/wascal.db`.

Développement avec rechargement : `node --env-file=.env --watch server.js`.

## Configuration (`.env`)

| Variable | Rôle |
|---|---|
| `PORT` / `HOST` | écoute (défaut `3000` / `0.0.0.0`) |
| `ADMIN_PASSWORD` | mot de passe de `/admin` — **à changer** |
| `COOKIE_SECRET` | secret de signature des cookies (`openssl rand -hex 32`) |
| `DB_PATH` | emplacement du fichier SQLite (défaut `./data/wascal.db`) |
| `NODE_ENV` | mettre `production` en ligne (active `secure` sur le cookie → HTTPS requis) |

## Déploiement VPS (Ubuntu + nginx + Certbot)

1. **Copier le code** (sans `node_modules`/`data`) et installer :
   ```bash
   rsync -av --exclude node_modules --exclude data --exclude .env files/ user@vps:/var/www/wascal/
   ssh user@vps 'cd /var/www/wascal && npm install --omit=dev'
   ```
2. **Service systemd** `/etc/systemd/system/wascal.service` :
   ```ini
   [Unit]
   Description=WASCAL Cape Coast 2026
   After=network.target
   [Service]
   WorkingDirectory=/var/www/wascal
   ExecStart=/usr/bin/node server.js
   Environment=NODE_ENV=production
   Environment=PORT=3000
   Environment=ADMIN_PASSWORD=CHANGER_ICI
   Environment=COOKIE_SECRET=COLLER_UN_SECRET_HEX
   Environment=DB_PATH=/var/www/wascal/data/wascal.db
   Restart=always
   User=www-data
   [Install]
   WantedBy=multi-user.target
   ```
   ```bash
   sudo systemctl enable --now wascal
   ```
3. **nginx** en reverse-proxy (puis `sudo certbot --nginx` pour le HTTPS) :
   ```nginx
   server {
     server_name wascal.exemple.org;
     client_max_body_size 12M;   # uploads de photos de galerie (base64) > 1 Mo par défaut
     location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }
   }
   ```

> `/admin` est protégé par le **mot de passe applicatif** (cookie signé) — plus besoin de basic-auth nginx.
> **Galerie** : le service écrit les photos téléversées dans `public/images/` — ce dossier (et `data/`)
> doit appartenir à l'utilisateur du service (`sudo chown -R www-data:www-data /var/www/wascal`).
> Sauvegarde = `data/wascal.db` **+** le dossier `public/images/` (les photos téléversées).

## Notes d'architecture

- **Front vanilla** (HTML/CSS/JS natif), aucun build. Charte partagée dans `public/app.css`,
  données communes (délégations, comités, drapeaux, RNG seedé) dans `public/shared.js` (module ES).
- **Répartition des comités** (`admin.html`) : chaque personne est dans son comité **effectif**
  = comité assigné manuellement s'il existe, sinon comité demandé au sondage. **Pas de réaffectation
  automatique** : l'admin équilibre à la main via un menu déroulant (`POST /api/admin/assign`, persisté).
  Effectif vs cible (≈ n/4) affiché ; rotation déterministe sur 4 mois.
- **Galerie** (`/` + `/admin`) : albums et photos pilotés par la base (`gallery_albums`, `gallery_photos`,
  `settings`). L'admin crée des albums, téléverse des photos (redimensionnées côté navigateur, envoyées
  en base64) et colle les liens Drive. La page d'accueil lit `GET /api/gallery`. Photos dans `public/images/`.
- **Dédup** côté admin par `nom|délégation` normalisés (réponse la plus récente conservée).
- Pas de fonctionnalité « devoirs » — hors périmètre, ne pas réintroduire.
