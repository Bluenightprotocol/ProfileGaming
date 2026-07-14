// db.js: una "micro base de datos" hecha a mano con un archivo JSON.
// No es lo que usarías en producción a gran escala, pero para un proyecto
// chico/educativo es perfecta: simple, gratis y fácil de entender.
//
// Si más adelante querés algo más serio y siguiendo gratis, las opciones
// típicas son SQLite (better-sqlite3) o un Postgres gratis en Supabase/Neon.
// La lógica de "una fila por voto" sería casi idéntica.

const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "data", "ratings.json");
const DB_DIR = path.join(__dirname, "data");

function ensureDB() {
  // Git no versiona carpetas vacías, así que en un servidor recién clonado
  // (por ejemplo, en cada despliegue nuevo de Render) esta carpeta puede no
  // existir todavía. La creamos nosotros mismos antes de escribir el archivo,
  // en vez de depender de que ya esté ahí.
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ votes: [], nicknames: {}, feedback: [] }, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, "utf-8");
  try {
    const data = JSON.parse(raw);
    // Compatibilidad con bases de datos creadas antes de agregar estos campos.
    if (!data.votes) data.votes = [];
    if (!data.nicknames) data.nicknames = {};
    if (!data.feedback) data.feedback = [];
    return data;
  } catch {
    return { votes: [], nicknames: {}, feedback: [] };
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

// El gamertag se guarda uno por IP, pero a diferencia de los votos se puede
// actualizar (no es "una vez y listo"): por eso es un objeto, no una lista.
function getNickname(ipHash) {
  const db = readDB();
  const entry = db.nicknames[ipHash];
  return entry ? entry.nickname : null;
}

function setNickname(ipHash, nickname, ipEncrypted) {
  const db = readDB();
  db.nicknames[ipHash] = { nickname, ipEncrypted, updatedAt: new Date().toISOString() };
  writeDB(db);
}

function addFeedback(entry) {
  const db = readDB();
  db.feedback.push({ ...entry, createdAt: new Date().toISOString() });
  writeDB(db);
}

// Devuelve toda la base de datos tal cual está guardada. Se usa solo desde
// la ruta protegida /api/admin/export en server.js.
function getAll() {
  return readDB();
}

module.exports = { addVoteIfNew, getRatingVotes, getNickname, setNickname, addFeedback, getAll };
