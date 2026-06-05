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
