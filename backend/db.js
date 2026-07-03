// db.js — una "micro base de datos" hecha a mano con un archivo JSON.
// No es lo que usarías en producción a gran escala, pero para un proyecto
// chico/educativo es perfecta: simple, gratis y fácil de entender.
//
// Si más adelante querés algo más serio y siguiendo gratis, las opciones
// típicas son SQLite (better-sqlite3) o un Postgres gratis en Supabase/Neon.
// La lógica de "una fila por voto" sería casi idéntica.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "ratings.json");

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ votes: [] }, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return { votes: [] };
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Guarda un voto si no existe ya uno igual (mismo ipHash + game + type).
// Devuelve { ok: true } o { ok: false, reason: "duplicado" }.
function addVoteIfNew(vote) {
  const db = readDB();
  const exists = db.votes.some(
    (v) => v.ipHash === vote.ipHash && v.game === vote.game && v.type === vote.type
  );
  if (exists) return { ok: false, reason: "duplicado" };

  db.votes.push({ ...vote, createdAt: new Date().toISOString() });
  writeDB(db);
  return { ok: true };
}

function getRatingVotes() {
  const db = readDB();
  return db.votes.filter((v) => v.type === "rating");
}

module.exports = { addVoteIfNew, getRatingVotes };
