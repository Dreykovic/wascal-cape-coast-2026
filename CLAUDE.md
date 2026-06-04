# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> Le projet, ses contenus et ses échanges sont **en français**. Réponds en français.

## Contexte

Boîte à outils pour le programme **WASCAL Cape Coast 2026** : 32 étudiant·e·s, 8 délégations
francophones d'Afrique de l'Ouest (Bénin, Burkina Faso, Côte d'Ivoire, Guinée, Mali, Niger, Sénégal,
Togo), 16 semaines de cours d'anglais au Ghana. Le programme repose sur **trois piliers** : le
**programme des cours**, les **rappels**, et les **activités** (sorties, soirées-pays, sport, comités).
Il n'y a **pas** de fonctionnalité « devoirs / homework » — elle a été explicitement retirée du périmètre.
Ne pas la réintroduire.

## Stack : Node + Fastify + SQLite (aucun build)

L'app web vit dans `files/` : un **serveur Fastify** unique (`server.js`) sert le front statique
(`public/`), l'**API publique** (dépôt du sondage) et l'**API admin** protégée par cookie de session
signé. Base **SQLite** via le module intégré `node:sqlite` (**Node ≥ 22.5**, testé sur Node 24) — donc
**aucune dépendance native à compiler**, déploiement VPS trivial.

- **Front vanilla** : HTML/CSS/JS natif, **pas de bundler, pas d'étape de build**. Mais contrairement à
  l'ancienne version « tout inline », deux fichiers sont **partagés et servis** par le backend :
  `public/app.css` (tokens + composants) et `public/shared.js` (module ES : délégations, comités,
  drapeaux SVG, RNG seedé, helpers). Les pages les chargent par `<link>` / `import`.
- Libs externes par CDN au runtime : polices Google **Fraunces** (titres) + **Hanken Grotesk** (UI).
- Lancer : `cd files && npm install && node --env-file=.env server.js` → http://localhost:3000.
  Détails et déploiement (systemd + nginx + Certbot) dans **`files/README.md`** (source de vérité du déploiement).

## Structure

| Chemin | Rôle |
|---|---|
| `files/server.js` | Serveur Fastify : pages, API publique (`POST /api/responses`), API admin (`/api/admin/*`) |
| `files/db.js` | `node:sqlite` — table `responses`, migrations légères, `insertResponse` / `listResponses` |
| `files/public/index.html` | Site informatif en **deck de slides** (hero, région, objectifs, club, activités, délégations, Ubuntu, galerie, calendrier, festival) — **public**. Page **autonome** (CSS+JS inline, n'utilise PAS `app.css`/`shared.js`), nav clavier/tactile/molette. Liens vers `/survey`. |
| `files/public/survey.html` | Sondage 4 étapes → `POST /api/responses` — **public** |
| `files/public/admin.html` | Répartition 4 comités, rotation 4 mois, idées proposées, export CSV — **protégé par mot de passe** |
| `files/public/app.css` | Charte partagée (tokens `:root`, kente, stickers, formulaires) |
| `files/public/shared.js` | Données + utilitaires partagés (module ES) |
| `files/README.md` | Lancement local + déploiement VPS — **source de vérité du déploiement** |
| `files/.env.example` | Config : `ADMIN_PASSWORD`, `COOKIE_SECRET`, `PORT`, `DB_PATH`, `NODE_ENV` |
| `files/programme-activites-cape-coast.docx` | Document source du contenu des activités (non servi) |
| `affiches/affiche-0{1..4}-*.html` | 4 affiches A4 imprimables (`@page` print), exportées en `.pdf` à côté ; une par comité |

`data/` (base SQLite), `node_modules/`, `.env` et `.remember/` ne sont **pas** versionnés ni servis — ne pas y toucher.

## Le trio survey / admin / API

C'est le cœur technique. Bien le comprendre avant de modifier `survey.html`, `admin.html` ou le backend.

- **Schéma** (`db.js`) : une seule table `responses` (`full_name`, `delegation`, `floor`,
  `committee_rank` JSON[], `activities` JSON[], `proposed_activities` JSON[], `talents` JSON[],
  `english_level`, `dietary`, `notes`, `created_at`, `assigned_committee`). Les `text[]` sont stockés en
  **JSON** (SQLite n'a pas de type tableau) et re-parsés à la lecture. `assigned_committee` = comité fixé
  **manuellement** par l'admin (null = comité demandé). Ajout de colonne = migration `ALTER TABLE`
  idempotente en tête de `db.js` (cf. `proposed_activities`, `assigned_committee`).
- **Sondage en 4 étapes** : (1) identité — nom, délégation, logement ; (2) **un seul comité souhaité** ;
  (3) activités — on **coche** dans la liste (`activities`) **et on propose** ses propres idées libres
  (`proposed_activities`, puces supprimables) — plus les talents ; (4) niveau d'anglais, régime, notes.
- **Auth admin** : mot de passe unique (`ADMIN_PASSWORD`) → `POST /api/admin/login` pose un **cookie signé**
  (`@fastify/cookie`, `httpOnly`, `secure` en prod). Les routes `/api/admin/*` sont gardées par un
  `preHandler`. Ne jamais exposer les réponses sans cette garde.
- **Anti-doublon** : le sondage pose un flag `localStorage` (`wascal_survey_done`) côté appareil ; l'admin
  déduplique **côté lecture** par `nom|délégation` normalisés, en gardant la réponse la plus récente
  (les réponses arrivent triées récentes → anciennes).
- **Validation** : faite **côté serveur** dans `POST /api/responses` (délégation/comité/étage/niveau dans
  les référentiels ; idées proposées nettoyées, bornées à 20, dédoublonnées sans casse). Le front valide aussi mais n'est pas la source de confiance.

### La répartition des comités (`admin.html`)

4 comités (`COMMITTEES` dans `shared.js` : Sorties & Excursions, Soirées & Jeux, Sport & Bien-être,
Culture & Échanges — un par affiche). Le sondage collecte **un seul comité demandé** par personne
(dans `committee_rank[0]`).

**Pas de réaffectation automatique** (choix produit, juin 2026). Chaque personne est placée dans son
**comité effectif** = `assigned_committee` s'il est défini, sinon `committee_rank[0]` (`effectiveOf()`).
Les comités reflètent donc les choix bruts ; ils peuvent être déséquilibrés. L'admin **équilibre à la main,
quand il veut** : un menu déroulant par membre appelle `POST /api/admin/assign {id, committee}` qui
**persiste** dans `assigned_committee` (envoyer `committee:""` réinitialise → retour au comité demandé).
Chaque comité affiche son **effectif vs cible** (≈ n/4) et un badge **« ↩ demandé : … »** sur les personnes
déplacées, pour voir leur comité d'origine. Plus de seed / « Relancer » (l'affectation est déterministe).

La **rotation sur 4 mois** reste affichée : chaque comité garde ses membres et tourne sur les 4 rôles via
`(g+m)%4`.

## Identité visuelle (charte partagée)

Tokens dans `public/app.css` (`:root`) ; données de couleur/drapeaux dans `public/shared.js`. Toute page reprend :
- Encre `#231a10`, papier `#fffaf0`, crème `#fbf1dc` / `#f6e6c4`
- Accents : or `#f2a900`, ambre `#e85d1b`, rouge `#c5302b`, vert `#1c7a45`, teal `#0e8c7a`, bleu `#1e3f8f`, prune `#8a2d5d`
- Bande **Kente** : `--kente` (rayures or/rouge/vert/bleu/encre/ambre)
- Couleur par délégation : objet `COUNTRY` + drapeaux SVG `flagSVG()` dans `shared.js` (8 pays ; réutilisés site/survey/admin — garder cohérent avec les affiches)
- Couleur par comité : champ `color` de `COMMITTEES` (Sorties→teal, Soirées→prune, Sport→vert, Culture→ambre)
- Composants « stickers » : bordure encre épaisse + ombre portée décalée nette (`5px 5px 0`)
- Titres en **Fraunces** (600–900), texte en **Hanken Grotesk** (400–800)

## Conventions

- **Pas de build, pas de framework front** : HTML/CSS/JS natif servi par Fastify. Mutualiser via
  `app.css` / `shared.js` (déjà servis), pas via un bundler.
- Backend : ESM (`"type":"module"`), dépendances **pur JS** uniquement (pas de natif à compiler) ;
  privilégier le module intégré `node:sqlite`.
- **Secrets hors du code** : `ADMIN_PASSWORD` / `COOKIE_SECRET` via env (`.env` local, `Environment=` systemd) — jamais en dur dans une page ou commités.
- L'admin doit rester protégé : ne jamais servir `/api/admin/*` sans le `preHandler` d'auth.
- Les affiches sont calibrées **A4 portrait** (`@page{size:A4}`, unités mm) — préserver la mise en page à l'impression.
