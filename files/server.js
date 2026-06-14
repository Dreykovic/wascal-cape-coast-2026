// Serveur WASCAL Cape Coast 2026 — Fastify.
// Sert le front (public/), l'API publique (sondage) et l'API admin protégée par cookie signé.
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import { timingSafeEqual, randomBytes } from "node:crypto";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  insertResponse, listResponses, assignCommittee,
  seedGalleryIfEmpty, listGallery, albumExists, createAlbum, updateAlbum,
  deleteAlbum, addPhoto, deletePhoto, updatePhotoCaption, getSetting, setSetting,
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
// Albums de galerie créés au premier démarrage (Club d'anglais + un par comité, couleurs de charte).
const GALLERY_DEFAULTS = [
  { title: "Club d'anglais",       color: "#f2a900" },
  { title: "Sorties & Excursions", color: "#0e8c7a" },
  { title: "Soirées & Jeux",       color: "#8a2d5d" },
  { title: "Sport & Bien-être",    color: "#1c7a45" },
  { title: "Culture & Échanges",   color: "#e85d1b" },
];
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

const app = Fastify({ logger: true, trustProxy: true });
await app.register(fastifyCookie, { secret: COOKIE_SECRET });
await app.register(fastifyStatic, { root: join(ROOT, "public"), prefix: "/" });

// --- Pages -----------------------------------------------------------------
app.get("/", (req, reply) => reply.sendFile("index.html"));
app.get("/survey", (req, reply) => reply.sendFile("survey.html"));
app.get("/admin", (req, reply) => reply.sendFile("admin.html"));
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
    photos: a.photos.map((p) => ({ src: "images/" + p.filename, cap: p.caption || "" })),
  })),
  drive_all: getSetting("drive_all") || "",
}));

// --- Auth admin (mot de passe unique → cookie signé) -----------------------
function isAuthed(req) {
  const raw = req.cookies?.[COOKIE_NAME];
  if (!raw) return false;
  const un = req.unsignCookie(raw);
  return un.valid && un.value === "ok";
}

function requireAdmin(req, reply, done) {
  if (!isAuthed(req)) return reply.code(401).send({ ok: false, error: "Non authentifié." });
  done();
}

app.post("/api/admin/login", async (req, reply) => {
  const pwd = String(req.body?.password || "");
  const a = Buffer.from(pwd);
  const b = Buffer.from(ADMIN_PASSWORD);
  const ok = a.length === b.length && timingSafeEqual(a, b);
  if (!ok) return reply.code(401).send({ ok: false, error: "Mot de passe incorrect." });
  reply.setCookie(COOKIE_NAME, reply.signCookie("ok"), {
    path: "/", httpOnly: true, sameSite: "strict", secure: PROD, maxAge: 60 * 60 * 8,
  });
  return { ok: true };
});

app.post("/api/admin/logout", async (req, reply) => {
  reply.clearCookie(COOKIE_NAME, { path: "/" });
  return { ok: true };
});

app.get("/api/admin/me", async (req) => ({ authed: isAuthed(req) }));

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

// --- Galerie : API admin (gestion albums + photos + lien global) -----------
app.get("/api/admin/gallery", { preHandler: requireAdmin }, async () => ({
  ok: true,
  albums: listGallery().map((a) => ({
    id: a.id, title: a.title, color: a.color, drive_url: a.drive_url || "",
    photos: a.photos.map((p) => ({ id: p.id, src: "images/" + p.filename, cap: p.caption || "" })),
  })),
  drive_all: getSetting("drive_all") || "",
}));

app.post("/api/admin/gallery/album", { preHandler: requireAdmin }, async (req, reply) => {
  const title = String(req.body?.title || "").trim().slice(0, 80);
  if (title.length < 2) return reply.code(400).send({ ok: false, error: "Titre requis." });
  const id = createAlbum({ title, color: cleanColor(req.body?.color), drive_url: cleanUrl(req.body?.drive_url) });
  return reply.code(201).send({ ok: true, id });
});

app.patch("/api/admin/gallery/album/:id", { preHandler: requireAdmin }, async (req, reply) => {
  const id = Number(req.params.id);
  const title = String(req.body?.title || "").trim().slice(0, 80);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  if (title.length < 2) return reply.code(400).send({ ok: false, error: "Titre requis." });
  if (!albumExists(id)) return reply.code(404).send({ ok: false, error: "Album introuvable." });
  updateAlbum(id, { title, color: cleanColor(req.body?.color), drive_url: cleanUrl(req.body?.drive_url) });
  return { ok: true };
});

app.delete("/api/admin/gallery/album/:id", { preHandler: requireAdmin }, async (req, reply) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  if (!albumExists(id)) return reply.code(404).send({ ok: false, error: "Album introuvable." });
  for (const f of deleteAlbum(id)) removeImage(f);
  return { ok: true };
});

// Upload : l'admin envoie l'image redimensionnée (canvas) en data-URL base64.
app.post("/api/admin/gallery/photo", { preHandler: requireAdmin, bodyLimit: 12 * 1024 * 1024 }, async (req, reply) => {
  const album_id = Number(req.body?.album_id);
  if (!albumExists(album_id)) return reply.code(400).send({ ok: false, error: "Album invalide." });
  const parsed = parseDataUrl(req.body?.dataUrl);
  if (!parsed) return reply.code(400).send({ ok: false, error: "Image invalide (JPEG/PNG/WebP attendu)." });
  if (parsed.buf.length > 6 * 1024 * 1024) return reply.code(413).send({ ok: false, error: "Image trop lourde (max 6 Mo)." });
  const filename = `g${album_id}-${randomBytes(6).toString("hex")}.${parsed.ext}`;
  writeFileSync(join(IMAGES_DIR, filename), parsed.buf);
  const id = addPhoto({ album_id, filename, caption: req.body?.caption });
  return reply.code(201).send({ ok: true, id, src: "images/" + filename });
});

app.patch("/api/admin/gallery/photo/:id", { preHandler: requireAdmin }, async (req, reply) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  updatePhotoCaption(id, req.body?.caption);
  return { ok: true };
});

app.delete("/api/admin/gallery/photo/:id", { preHandler: requireAdmin }, async (req, reply) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return reply.code(400).send({ ok: false, error: "id invalide." });
  const filename = deletePhoto(id);
  if (filename) removeImage(filename);
  return { ok: true };
});

app.post("/api/admin/gallery/settings", { preHandler: requireAdmin }, async (req) => {
  setSetting("drive_all", cleanUrl(req.body?.drive_all));
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
