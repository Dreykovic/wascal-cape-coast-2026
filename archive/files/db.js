// Accès base — node:sqlite (intégré à Node ≥ 22.5, aucune dépendance native).
// Une seule table `responses`, miroir du schéma Supabase historique.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || join(ROOT, "data", "wascal.db");

mkdirSync(dirname(DB_PATH), { recursive: true });

export const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS responses (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at     TEXT    NOT NULL,
    full_name      TEXT    NOT NULL,
    delegation     TEXT    NOT NULL,
    floor          TEXT,
    committee_rank      TEXT NOT NULL DEFAULT '[]',  -- JSON text[] (1 comité souhaité)
    activities          TEXT NOT NULL DEFAULT '[]',  -- JSON text[] (cochées dans la liste)
    proposed_activities TEXT NOT NULL DEFAULT '[]',  -- JSON text[] (idées libres proposées)
    talents             TEXT NOT NULL DEFAULT '[]',  -- JSON text[]
    english_level  TEXT,
    dietary        TEXT,
    notes          TEXT,
    assigned_committee TEXT   -- comité fixé manuellement par l'admin (null = comité demandé)
  );
  CREATE INDEX IF NOT EXISTS idx_responses_created ON responses(created_at);
`);

// Migrations légères : ajoute les colonnes manquantes aux bases plus anciennes.
const cols = db.prepare("PRAGMA table_info(responses)").all().map((c) => c.name);
if (!cols.includes("proposed_activities")) {
  db.exec("ALTER TABLE responses ADD COLUMN proposed_activities TEXT NOT NULL DEFAULT '[]'");
}
if (!cols.includes("assigned_committee")) {
  db.exec("ALTER TABLE responses ADD COLUMN assigned_committee TEXT");
}

// --- Galerie (albums + photos) + réglages -----------------------------------
db.exec(`
  CREATE TABLE IF NOT EXISTS gallery_albums (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    color      TEXT    NOT NULL DEFAULT '#e85d1b',
    drive_url  TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );
  CREATE TABLE IF NOT EXISTS gallery_photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    album_id   INTEGER NOT NULL,
    filename   TEXT    NOT NULL,
    caption    TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_gphotos_album ON gallery_photos(album_id);
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
  -- Codes d'accès des galeries de comité (un par "propriétaire" : 4 comités + Club d'anglais).
  -- code_hash = "<salt hex>:<scrypt hex>" (haché côté serveur) ; NULL = pas de code (accès fermé).
  CREATE TABLE IF NOT EXISTS gallery_codes (
    owner      TEXT PRIMARY KEY,
    code_hash  TEXT,
    updated_at TEXT
  );
`);

// Migration légère : rattache chaque album à un "propriétaire" (comité ou Club d'anglais).
const galCols = db.prepare("PRAGMA table_info(gallery_albums)").all().map((c) => c.name);
if (!galCols.includes("owner")) {
  db.exec("ALTER TABLE gallery_albums ADD COLUMN owner TEXT");
  // Rattache les albums déjà semés (bases existantes) à leur propriétaire, par titre.
  const seedMap = {
    "Club d'anglais": "club", "Sorties & Excursions": "sorties", "Soirées & Jeux": "soirees",
    "Sport & Bien-être": "sport", "Culture & Échanges": "culture",
  };
  const back = db.prepare("UPDATE gallery_albums SET owner = ? WHERE title = ? AND owner IS NULL");
  for (const [title, key] of Object.entries(seedMap)) back.run(key, title);
}

const gq = {
  albums:        db.prepare("SELECT * FROM gallery_albums ORDER BY sort_order, id"),
  photosOf:      db.prepare("SELECT * FROM gallery_photos WHERE album_id = ? ORDER BY sort_order, id"),
  countAlbums:   db.prepare("SELECT COUNT(*) AS n FROM gallery_albums"),
  maxOrder:      db.prepare("SELECT COALESCE(MAX(sort_order),-1) AS m FROM gallery_albums"),
  insAlbum:      db.prepare("INSERT INTO gallery_albums (title,color,drive_url,owner,sort_order,created_at) VALUES (@title,@color,@drive_url,@owner,@sort_order,@created_at)"),
  updAlbum:      db.prepare("UPDATE gallery_albums SET title=@title, color=@color, drive_url=@drive_url, owner=@owner WHERE id=@id"),
  getAlbum:      db.prepare("SELECT * FROM gallery_albums WHERE id = ?"),
  delAlbum:      db.prepare("DELETE FROM gallery_albums WHERE id = ?"),
  photoFiles:    db.prepare("SELECT filename FROM gallery_photos WHERE album_id = ?"),
  delPhotosOf:   db.prepare("DELETE FROM gallery_photos WHERE album_id = ?"),
  maxPhotoOrder: db.prepare("SELECT COALESCE(MAX(sort_order),-1) AS m FROM gallery_photos WHERE album_id = ?"),
  insPhoto:      db.prepare("INSERT INTO gallery_photos (album_id,filename,caption,sort_order,created_at) VALUES (@album_id,@filename,@caption,@sort_order,@created_at)"),
  getPhoto:      db.prepare("SELECT * FROM gallery_photos WHERE id = ?"),
  delPhoto:      db.prepare("DELETE FROM gallery_photos WHERE id = ?"),
  updCaption:    db.prepare("UPDATE gallery_photos SET caption = @caption WHERE id = @id"),
};

// Crée les albums par défaut (un par comité + Club d'anglais) si la galerie est vide.
export function seedGalleryIfEmpty(defaults) {
  if (gq.countAlbums.get().n > 0) return;
  const now = new Date().toISOString();
  defaults.forEach((d, i) => gq.insAlbum.run({
    title: d.title, color: d.color || "#e85d1b", drive_url: null,
    owner: d.owner || null, sort_order: i, created_at: now,
  }));
}

export function listGallery() {
  return gq.albums.all().map((a) => ({ ...a, photos: gq.photosOf.all(a.id) }));
}

export function albumExists(id) {
  return !!gq.getAlbum.get(Number(id));
}

// Métadonnées d'un album (pour le contrôle de périmètre côté serveur).
export function getAlbumMeta(id) {
  const a = gq.getAlbum.get(Number(id));
  return a ? { id: a.id, owner: a.owner || null } : null;
}

// Propriétaire de l'album contenant une photo (ou null si la photo n'existe pas).
export function getPhotoMeta(id) {
  const p = gq.getPhoto.get(Number(id));
  if (!p) return null;
  const a = gq.getAlbum.get(p.album_id);
  return { id: p.id, album_id: p.album_id, owner: a ? a.owner || null : null };
}

export function createAlbum({ title, color, drive_url, owner }) {
  const info = gq.insAlbum.run({
    title: String(title).trim(),
    color: color || "#e85d1b",
    drive_url: drive_url ? String(drive_url) : null,
    owner: owner ? String(owner) : null,
    sort_order: gq.maxOrder.get().m + 1,
    created_at: new Date().toISOString(),
  });
  return Number(info.lastInsertRowid);
}

export function updateAlbum(id, { title, color, drive_url, owner }) {
  return gq.updAlbum.run({
    id: Number(id), title: String(title).trim(), color: color || "#e85d1b",
    drive_url: drive_url ? String(drive_url) : null,
    owner: owner ? String(owner) : null,
  }).changes > 0;
}

// Supprime un album ; renvoie les fichiers de ses photos (à effacer du disque).
export function deleteAlbum(id) {
  const files = gq.photoFiles.all(Number(id)).map((r) => r.filename);
  gq.delPhotosOf.run(Number(id));
  gq.delAlbum.run(Number(id));
  return files;
}

export function addPhoto({ album_id, filename, caption }) {
  const info = gq.insPhoto.run({
    album_id: Number(album_id), filename: String(filename),
    caption: caption ? String(caption).slice(0, 160) : null,
    sort_order: gq.maxPhotoOrder.get(Number(album_id)).m + 1,
    created_at: new Date().toISOString(),
  });
  return Number(info.lastInsertRowid);
}

// Supprime une photo ; renvoie son fichier (à effacer du disque) ou null.
export function deletePhoto(id) {
  const row = gq.getPhoto.get(Number(id));
  if (!row) return null;
  gq.delPhoto.run(Number(id));
  return row.filename;
}

export function updatePhotoCaption(id, caption) {
  return gq.updCaption.run({
    id: Number(id), caption: caption ? String(caption).slice(0, 160) : null,
  }).changes > 0;
}

const getSettingStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
const setSettingStmt = db.prepare("INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
export function getSetting(key) {
  const r = getSettingStmt.get(String(key));
  return r ? r.value : null;
}
export function setSetting(key, value) {
  setSettingStmt.run(String(key), value == null ? null : String(value));
}

// --- Codes d'accès des galeries (hash géré côté serveur) --------------------
const codeGetStmt  = db.prepare("SELECT code_hash FROM gallery_codes WHERE owner = ?");
const codeSetStmt  = db.prepare("INSERT INTO gallery_codes (owner,code_hash,updated_at) VALUES (?,?,?) ON CONFLICT(owner) DO UPDATE SET code_hash = excluded.code_hash, updated_at = excluded.updated_at");
const codeListStmt = db.prepare("SELECT owner, code_hash, updated_at FROM gallery_codes");

export function getGalleryCode(owner) {
  const r = codeGetStmt.get(String(owner));
  return r ? r.code_hash : null;
}
export function setGalleryCode(owner, hash) {
  codeSetStmt.run(String(owner), hash == null ? null : String(hash), new Date().toISOString());
}
// État des codes (sans révéler le hash) : { owner, set, updated_at }.
export function listGalleryCodes() {
  return codeListStmt.all().map((r) => ({
    owner: r.owner, set: r.code_hash != null, updated_at: r.updated_at,
  }));
}

const insertStmt = db.prepare(`
  INSERT INTO responses
    (created_at, full_name, delegation, floor, committee_rank, activities, proposed_activities, talents, english_level, dietary, notes)
  VALUES
    (@created_at, @full_name, @delegation, @floor, @committee_rank, @activities, @proposed_activities, @talents, @english_level, @dietary, @notes)
`);

const listStmt = db.prepare(`SELECT * FROM responses ORDER BY created_at DESC, id DESC`);
const assignStmt = db.prepare(`UPDATE responses SET assigned_committee = ? WHERE id = ?`);

// Fixe (ou réinitialise si committee est null/"") le comité d'une personne.
export function assignCommittee(id, committee) {
  const value = committee == null || committee === "" ? null : String(committee);
  return assignStmt.run(value, Number(id)).changes > 0;
}

const arr = (v) => JSON.stringify(Array.isArray(v) ? v.map(String) : []);
const str = (v) => (v == null ? null : String(v));

export function insertResponse(r) {
  const info = insertStmt.run({
    created_at: new Date().toISOString(),
    full_name: String(r.full_name).trim(),
    delegation: String(r.delegation).trim(),
    floor: str(r.floor),
    committee_rank: arr(r.committee_rank),
    activities: arr(r.activities),
    proposed_activities: arr(r.proposed_activities),
    talents: arr(r.talents),
    english_level: str(r.english_level),
    dietary: str(r.dietary),
    notes: str(r.notes),
  });
  return Number(info.lastInsertRowid);
}

export function listResponses() {
  return listStmt.all().map((row) => ({
    ...row,
    committee_rank: safeParse(row.committee_rank),
    activities: safeParse(row.activities),
    proposed_activities: safeParse(row.proposed_activities),
    talents: safeParse(row.talents),
  }));
}

function safeParse(s) {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
