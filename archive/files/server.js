// Serveur WASCAL Cape Coast 2026 — Fastify.
// Sert le front (public/), l'API publique (sondage) et l'API admin protégée par cookie signé.
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import { timingSafeEqual, randomBytes, scryptSync } from "node:crypto";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  insertResponse, listResponses, assignCommittee,
  seedGalleryIfEmpty, listGallery, getAlbumMeta, getPhotoMeta,
  createAlbum, updateAlbum, deleteAlbum, addPhoto, deletePhoto, updatePhotoCaption,
  getSetting, setSetting, getGalleryCode, setGalleryCode, listGalleryCodes,
} from "./db.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = join(ROOT, "public", "images");
mkdirSync(IMAGES_DIR, { recursive: true });
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "0.0.0.0";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "wascal2026";
const COOKIE_SECRET = process.env.COOKIE_SECRET || randomBytes(32).toString("hex");
const PROD = process.env.NODE_ENV === "production";
const COOKIE_NAME = "wascal_admin";

// --- Référentiels (validés côté serveur) -----------------------------------
export const DELEGATIONS = [
  "Bénin", "Burkina Faso", "Côte d'Ivoire", "Guinée",
  "Mali", "Niger", "Sénégal", "Togo",
];
export const COMMITTEES = [
  "Sorties & Excursions", "Soirées & Jeux", "Sport & Bien-être", "Culture & Échanges",
];
const FLOORS = ["Étage (filles)", "Rez-de-chaussée (garçons)"];
const ENGLISH_LEVELS = ["Débutant", "Intermédiaire", "Avancé"];
// Propriétaires de galerie : 4 comités + Club d'anglais. Chacun a une clé stable (slug),
// un code d'accès propre, et gère uniquement SES albums. Source de vérité côté serveur.
const GALLERY_OWNERS = [
  { key: "club",    name: "Club d'anglais",       color: "#f2a900", emoji: "📣" },
  { key: "sorties", name: "Sorties & Excursions", color: "#0e8c7a", emoji: "🌳" },
  { key: "soirees", name: "Soirées & Jeux",       color: "#8a2d5d", emoji: "🎉" },
  { key: "sport",   name: "Sport & Bien-être",    color: "#1c7a45", emoji: "⚽" },
  { key: "culture", name: "Culture & Échanges",   color: "#e85d1b", emoji: "🎭" },
];
const OWNER_KEYS = new Set(GALLERY_OWNERS.map((o) => o.key));
const ownerInfo = (key) => GALLERY_OWNERS.find((o) => o.key === key) || null;
const ownerName = (key) => ownerInfo(key)?.name || "";

// Albums de galerie créés au premier démarrage (un par propriétaire, couleurs de charte).
const GALLERY_DEFAULTS = GALLERY_OWNERS.map((o) => ({ title: o.name, color: o.color, owner: o.key }));
seedGalleryIfEmpty(GALLERY_DEFAULTS);

// --- Galerie : helpers ------------------------------------------------------
const HEX = /^#[0-9a-fA-F]{6}$/;
const cleanColor = (c) => (HEX.test(String(c || "")) ? String(c) : "#e85d1b");
const cleanUrl = (u) => {
  const s = String(u || "").trim();
  return /^https?:\/\//i.test(s) ? s.slice(0, 600) : "";
};
function parseDataUrl(dataUrl) {
  const m = /^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || ""));
  if (!m) return null;
  const raw = m[1].toLowerCase();
  const ext = raw === "jpeg" || raw === "jpg" ? "jpg" : raw;
  const buf = Buffer.from(m[2].replace(/\s+/g, ""), "base64");
  return buf.length ? { ext, buf } : null;
}
function removeImage(filename) {
  const base = String(filename).replace(/[/\\]/g, ""); // pas de remontée de chemin
  const p = join(IMAGES_DIR, base);
  try { if (existsSync(p)) unlinkSync(p); } catch { /* déjà absent */ }
}

// --- Codes d'accès des comités : hachage scrypt (pur Node, sans dépendance) -
function hashCode(code) {
  const salt = randomBytes(16);
  return salt.toString("hex") + ":" + scryptSync(String(code), salt, 32).toString("hex");
}
function verifyCode(code, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(String(code), Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
// Code lisible à partager (8 caractères sans ambiguïté 0/O/1/I).
function genCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

const app = Fastify({ logger: true, trustProxy: true });
await app.register(fastifyCookie, { secret: COOKIE_SECRET });
await app.register(fastifyStatic, { root: join(ROOT, "public"), prefix: "/" });

// --- Pages -----------------------------------------------------------------
app.get("/", (req, reply) => reply.sendFile("index.html"));
app.get("/survey", (req, reply) => reply.sendFile("survey.html"));
app.get("/admin", (req, reply) => reply.sendFile("admin.html"));
app.get("/comite", (req, reply) => reply.sendFile("comite.html"));
// Évite le 404 systématique du navigateur (pas d'icône servie pour l'instant)
app.get("/favicon.ico", (req, reply) => reply.code(204).send());

// --- API publique : dépôt d'une réponse de sondage -------------------------
app.post("/api/responses", async (req, reply) => {
  const b = req.body || {};
  const errors = [];

  const full_name = String(b.full_name || "").trim();
  if (full_name.length < 2) errors.push("Nom complet requis.");

  const delegation = String(b.delegation || "").trim();
  if (!DELEGATIONS.includes(delegation)) errors.push("Délégation invalide.");

  const committee_rank = Array.isArray(b.committee_rank) ? b.committee_rank : [];
  if (committee_rank.length < 1 || !committee_rank.every((c) => COMMITTEES.includes(c))) {
    errors.push("Comité souhaité invalide.");
  }

  const floor = b.floor == null ? null : String(b.floor);
  if (floor && !FLOORS.includes(floor)) errors.push("Étage invalide.");

  const english_level = b.english_level == null ? null : String(b.english_level);
  if (english_level && !ENGLISH_LEVELS.includes(english_level)) errors.push("Niveau d'anglais invalide.");

  if (errors.length) return reply.code(400).send({ ok: false, errors });

  // Activités proposées librement : on nettoie, on borne, on dédoublonne (insensible à la casse).
  const proposed_activities = [];
  const seenProposed = new Set();
  for (const raw of Array.isArray(b.proposed_activities) ? b.proposed_activities : []) {
    const s = String(raw).trim().slice(0, 80);
    const key = s.toLowerCase();
    if (!s || seenProposed.has(key)) continue;
    seenProposed.add(key);
    proposed_activities.push(s);
    if (proposed_activities.length >= 20) break;
  }

  const id = insertResponse({
    full_name,
    delegation,
    floor,
    committee_rank,
    activities: Array.isArray(b.activities) ? b.activities : [],
    proposed_activities,
    talents: Array.isArray(b.talents) ? b.talents : [],
    english_level,
    dietary: b.dietary == null ? null : String(b.dietary).slice(0, 2000),
    notes: b.notes == null ? null : String(b.notes).slice(0, 4000),
  });
  return reply.code(201).send({ ok: true, id });
});

// --- Galerie : API publique (lue par index.html) ---------------------------
app.get("/api/gallery", async () => ({
  ok: true,
  albums: listGallery().map((a) => ({
    id: a.id, title: a.title, color: a.color, drive_url: a.drive_url || "",
    owner: a.owner || "", ownerName: ownerName(a.owner),
    photos: a.photos.map((p) => ({ src: "images/" + p.filename, cap: p.caption || "" })),
  })),
  drive_all: getSetting("drive_all") || "",
}));

// --- Auth : deux rôles via cookie signé ------------------------------------
// Valeur du cookie : "ok" = super-admin (toi) ; "owner:<clé>" = un comité scopé à sa galerie.
function readSession(req) {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return null;
  const un = req.unsignCookie(raw);
  if (!un.valid || !un.value) return null;
  if (un.value === "ok") return { role: "super" };
  if (un.value.startsWith("owner:")) {
    const owner = un.value.slice(6);
    if (OWNER_KEYS.has(owner)) return { role: "owner", owner };
  }
  return null;
}
const isAuthed = (req) => readSession(req)?.role === "super";

// Réservé au super-admin (répartition, réponses, codes, réglages globaux).
function requireAdmin(req, reply, done) {
  if (!isAuthed(req)) return reply.code(401).send({ ok: false, error: "Non authentifié." });
  done();
}
// Super-admin OU comité connecté ; expose la session sur req.gal pour le contrôle de périmètre.
function requireGallery(req, reply, done) {
  const s = readSession(req);
  if (!s) return reply.code(401).send({ ok: false, error: "Non authentifié." });
  req.gal = s;
  done();
}
// Un comité ne peut toucher qu'à ses propres albums ; le super-admin n'est jamais bloqué.
const outOfScope = (s, owner) => s.role === "owner" && owner !== s.owner;

const SESSION_COOKIE = { path: "/", httpOnly: true, sameSite: "strict", secure: PROD, maxAge: 60 * 60 * 8 };

app.post("/api/admin/login", async (req, reply) => {
  const pwd = String(req.body?.password || "");
  const a = Buffer.from(pwd);
  const b = Buffer.from(ADMIN_PASSWORD);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return reply.code(401).send({ ok: false, error: "Mot de passe incorrect." });
  reply.setCookie(COOKIE_NAME, reply.signCookie("ok"), SESSION_COOKIE);
  return { ok: true };
});

// Connexion d'un comité avec son code partagé (généré par le super-admin).
app.post("/api/comite/login", async (req, reply) => {
  const owner = String(req.body?.owner || "");
  const code = String(req.body?.code || "");
  if (!OWNER_KEYS.has(owner)) return reply.code(400).send({ ok: false, error: "Comité invalide." });
  const stored = getGalleryCode(owner);
  if (!stored) return reply.code(401).send({ ok: false, error: "Aucun code défini pour ce comité — demande-le à l'admin." });
  if (!verifyCode(code, stored)) return reply.code(401).send({ ok: false, error: "Code incorrect." });
  reply.setCookie(COOKIE_NAME, reply.signCookie("owner:" + owner), SESSION_COOKIE);
  return { ok: true, owner };
});

app.post("/api/admin/logout", async (req, reply) => { reply.clearCookie(COOKIE_NAME, { path: "/" }); return { ok: true }; });
app.post("/api/comite/logout", async (req, reply) => { reply.clearCookie(COOKIE_NAME, { path: "/" }); return { ok: true }; });

app.get("/api/admin/me", async (req) => ({ authed: isAuthed(req) }));
// Session courante (utilisée par /comite) : { role:null } | { role:"super" } | { role:"owner", owner:{…} }
app.get("/api/session", async (req) => {
  const s = readSession(req);
  if (!s) return { role: null };
  return s.role === "super" ? { role: "super" } : { role: "owner", owner: ownerInfo(s.owner) };
});

app.get("/api/admin/responses", { preHandler: requireAdmin }, async () => ({
  ok: true,
  responses: listResponses(),
}));

// Affecte manuellement une personne à un comité (ou réinitialise si committee vide/null).
app.post("/api/admin/assign", { preHandler: requireAdmin }, async (req, reply) => {
  const id = Number(req.body?.id);
  const committee = req.body?.committee;
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  if (committee != null && committee !== "" && !COMMITTEES.includes(committee)) {
    return reply.code(400).send({ ok: false, error: "Comité invalide." });
  }
  const ok = assignCommittee(id, committee);
  if (!ok) return reply.code(404).send({ ok: false, error: "Réponse introuvable." });
  return { ok: true };
});

// --- Galerie : gestion (super-admin OU comité, scopée par propriétaire) -----
// Le super-admin voit/édite tout ; un comité ne voit/édite QUE ses albums.
app.get("/api/gallery/manage", { preHandler: requireGallery }, async (req) => {
  const s = req.gal;
  const all = listGallery();
  const mine = s.role === "super" ? all : all.filter((a) => a.owner === s.owner);
  const albums = mine.map((a) => ({
    id: a.id, title: a.title, color: a.color, drive_url: a.drive_url || "",
    owner: a.owner || "", ownerName: ownerName(a.owner),
    photos: a.photos.map((p) => ({ id: p.id, src: "images/" + p.filename, cap: p.caption || "" })),
  }));
  const out = { ok: true, role: s.role, owners: GALLERY_OWNERS, albums };
  if (s.role === "super") {
    const byOwner = Object.fromEntries(listGalleryCodes().map((c) => [c.owner, c]));
    out.drive_all = getSetting("drive_all") || "";
    out.codes = GALLERY_OWNERS.map((o) => ({
      owner: o.key, set: !!byOwner[o.key]?.set, updated_at: byOwner[o.key]?.updated_at || null,
    }));
  } else {
    out.owner = ownerInfo(s.owner);
  }
  return out;
});

app.post("/api/gallery/album", { preHandler: requireGallery }, async (req, reply) => {
  const s = req.gal;
  const title = String(req.body?.title || "").trim().slice(0, 80);
  if (title.length < 2) return reply.code(400).send({ ok: false, error: "Titre requis." });
  const reqOwner = String(req.body?.owner || "");
  const owner = s.role === "owner" ? s.owner : (OWNER_KEYS.has(reqOwner) ? reqOwner : null);
  const id = createAlbum({ title, color: cleanColor(req.body?.color), drive_url: cleanUrl(req.body?.drive_url), owner });
  return reply.code(201).send({ ok: true, id });
});

app.patch("/api/gallery/album/:id", { preHandler: requireGallery }, async (req, reply) => {
  const s = req.gal, id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  const meta = getAlbumMeta(id);
  if (!meta) return reply.code(404).send({ ok: false, error: "Album introuvable." });
  if (outOfScope(s, meta.owner)) return reply.code(403).send({ ok: false, error: "Hors de votre périmètre." });
  const title = String(req.body?.title || "").trim().slice(0, 80);
  if (title.length < 2) return reply.code(400).send({ ok: false, error: "Titre requis." });
  // Un comité ne peut pas changer le propriétaire ; le super-admin oui.
  const reqOwner = String(req.body?.owner || "");
  const owner = s.role === "owner" ? meta.owner : (OWNER_KEYS.has(reqOwner) ? reqOwner : null);
  updateAlbum(id, { title, color: cleanColor(req.body?.color), drive_url: cleanUrl(req.body?.drive_url), owner });
  return { ok: true };
});

app.delete("/api/gallery/album/:id", { preHandler: requireGallery }, async (req, reply) => {
  const s = req.gal, id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  const meta = getAlbumMeta(id);
  if (!meta) return reply.code(404).send({ ok: false, error: "Album introuvable." });
  if (outOfScope(s, meta.owner)) return reply.code(403).send({ ok: false, error: "Hors de votre périmètre." });
  for (const f of deleteAlbum(id)) removeImage(f);
  return { ok: true };
});

// Upload : le client envoie l'image redimensionnée (canvas) en data-URL base64.
app.post("/api/gallery/photo", { preHandler: requireGallery, bodyLimit: 12 * 1024 * 1024 }, async (req, reply) => {
  const s = req.gal, album_id = Number(req.body?.album_id);
  const meta = getAlbumMeta(album_id);
  if (!meta) return reply.code(400).send({ ok: false, error: "Album invalide." });
  if (outOfScope(s, meta.owner)) return reply.code(403).send({ ok: false, error: "Hors de votre périmètre." });
  const parsed = parseDataUrl(req.body?.dataUrl);
  if (!parsed) return reply.code(400).send({ ok: false, error: "Image invalide (JPEG/PNG/WebP attendu)." });
  if (parsed.buf.length > 6 * 1024 * 1024) return reply.code(413).send({ ok: false, error: "Image trop lourde (max 6 Mo)." });
  const filename = `g${album_id}-${randomBytes(6).toString("hex")}.${parsed.ext}`;
  writeFileSync(join(IMAGES_DIR, filename), parsed.buf);
  const id = addPhoto({ album_id, filename, caption: req.body?.caption });
  return reply.code(201).send({ ok: true, id, src: "images/" + filename });
});

app.patch("/api/gallery/photo/:id", { preHandler: requireGallery }, async (req, reply) => {
  const s = req.gal, id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  const meta = getPhotoMeta(id);
  if (!meta) return reply.code(404).send({ ok: false, error: "Photo introuvable." });
  if (outOfScope(s, meta.owner)) return reply.code(403).send({ ok: false, error: "Hors de votre périmètre." });
  updatePhotoCaption(id, req.body?.caption);
  return { ok: true };
});

app.delete("/api/gallery/photo/:id", { preHandler: requireGallery }, async (req, reply) => {
  const s = req.gal, id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  const meta = getPhotoMeta(id);
  if (!meta) return reply.code(404).send({ ok: false, error: "Photo introuvable." });
  if (outOfScope(s, meta.owner)) return reply.code(403).send({ ok: false, error: "Hors de votre périmètre." });
  const filename = deletePhoto(id);
  if (filename) removeImage(filename);
  return { ok: true };
});

// --- Réglages & codes : super-admin uniquement ------------------------------
app.post("/api/admin/gallery/settings", { preHandler: requireAdmin }, async (req) => {
  setSetting("drive_all", cleanUrl(req.body?.drive_all));
  return { ok: true };
});

// (Re)génère le code d'accès d'un comité — renvoyé EN CLAIR une seule fois.
app.post("/api/admin/gallery/code", { preHandler: requireAdmin }, async (req, reply) => {
  const owner = String(req.body?.owner || "");
  if (!OWNER_KEYS.has(owner)) return reply.code(400).send({ ok: false, error: "Comité invalide." });
  const code = genCode();
  setGalleryCode(owner, hashCode(code));
  return { ok: true, owner, code };
});

// Révoque le code d'un comité (accès fermé jusqu'à régénération).
app.delete("/api/admin/gallery/code/:owner", { preHandler: requireAdmin }, async (req, reply) => {
  const owner = String(req.params.owner || "");
  if (!OWNER_KEYS.has(owner)) return reply.code(400).send({ ok: false, error: "Comité invalide." });
  setGalleryCode(owner, null);
  return { ok: true };
});

app.get("/api/admin/export.csv", { preHandler: requireAdmin }, async (req, reply) => {
  const rows = listResponses();
  const cols = ["id", "created_at", "full_name", "delegation", "floor",
    "committee_rank", "assigned_committee", "activities", "proposed_activities", "talents", "english_level", "dietary", "notes"];
  const cell = (v) => {
    const s = Array.isArray(v) ? v.join(" | ") : v == null ? "" : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => cell(r[c])).join(";"))].join("\r\n");
  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", 'attachment; filename="wascal-responses.csv"');
  return "﻿" + csv; // BOM pour Excel
});

try {
  await app.listen({ port: PORT, host: HOST });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
