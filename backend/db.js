// db.js: capa de guardado usando una base de datos Postgres real (por
// ejemplo, la que da Supabase gratis), en vez de un archivo JSON en disco.
//
// Se cambió por esto porque el archivo JSON vivía en el disco del propio
// servidor de Render, y ese disco se borra cada vez que el servicio se
// reinicia, se redespliega o se "duerme" por inactividad (algo que Render
// hace solo, a los 15 minutos sin tráfico, en el plan gratuito). Una base
// de datos como Supabase vive aparte, en su propia infraestructura, así que
// los datos sobreviven sin importar qué le pase al servidor de Render.

const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Supabase, Neon y la mayoría de los Postgres gratuitos alojados piden
  // conexión con SSL, pero con un certificado que Node no reconoce como
  // "de confianza" por defecto. Esto le dice que la conexión igual está
  // cifrada, solo que no valide la cadena de certificados contra una
  // autoridad conocida (práctica habitual para este tipo de servicios).
  ssl: { rejectUnauthorized: false },
});

// Crea las tablas si todavía no existen. Se llama una sola vez, al iniciar
// el servidor (ver server.js). "IF NOT EXISTS" hace que sea seguro llamarlo
// cada vez que el servidor arranca, sin duplicar ni borrar nada.
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS votes (
      id SERIAL PRIMARY KEY,
      type TEXT NOT NULL,
      game TEXT NOT NULL,
      season TEXT,
      rating INTEGER,
      ip_hash TEXT NOT NULL,
      ip_encrypted TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nicknames (
      ip_hash TEXT PRIMARY KEY,
      nickname TEXT NOT NULL,
      ip_encrypted TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      rating INTEGER NOT NULL,
      comment TEXT,
      ip_hash TEXT NOT NULL,
      ip_encrypted TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

// Guarda un voto si no existe ya uno igual (mismo ip_hash + game + type).
// Devuelve { ok: true } o { ok: false, reason: "duplicado" }.
async function addVoteIfNew(vote) {
  const { type, game, season = null, rating = null, ipHash, ipEncrypted } = vote;

  const existing = await pool.query(
    `SELECT id FROM votes WHERE ip_hash = $1 AND game = $2 AND type = $3`,
    [ipHash, game, type]
  );
  if (existing.rows.length > 0) return { ok: false, reason: "duplicado" };

  await pool.query(
    `INSERT INTO votes (type, game, season, rating, ip_hash, ip_encrypted)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, game, season, rating, ipHash, ipEncrypted]
  );
  return { ok: true };
}

async function getRatingVotes() {
  const result = await pool.query(`SELECT * FROM votes WHERE type = 'rating'`);
  return result.rows.map(rowToVote);
}

function rowToVote(row) {
  return {
    type: row.type,
    game: row.game,
    season: row.season,
    rating: row.rating,
    ipHash: row.ip_hash,
    ipEncrypted: row.ip_encrypted,
    createdAt: row.created_at,
  };
}

// El gamertag se guarda uno por IP, pero a diferencia de los votos se puede
// actualizar (no es "una vez y listo").
async function getNickname(ipHash) {
  const result = await pool.query(`SELECT nickname FROM nicknames WHERE ip_hash = $1`, [ipHash]);
  return result.rows.length > 0 ? result.rows[0].nickname : null;
}

async function setNickname(ipHash, nickname, ipEncrypted) {
  await pool.query(
    `INSERT INTO nicknames (ip_hash, nickname, ip_encrypted, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (ip_hash)
     DO UPDATE SET nickname = $2, ip_encrypted = $3, updated_at = now()`,
    [ipHash, nickname, ipEncrypted]
  );
}

async function addFeedback(entry) {
  const { rating, comment, ipHash, ipEncrypted } = entry;
  await pool.query(
    `INSERT INTO feedback (rating, comment, ip_hash, ip_encrypted) VALUES ($1, $2, $3, $4)`,
    [rating, comment, ipHash, ipEncrypted]
  );
}

// Devuelve todo lo guardado, en la misma forma que usaba el archivo JSON
// anterior, para que /api/admin/export en server.js no tenga que cambiar.
async function getAll() {
  const [votes, nicknames, feedback] = await Promise.all([
    pool.query(`SELECT * FROM votes ORDER BY created_at`),
    pool.query(`SELECT * FROM nicknames`),
    pool.query(`SELECT * FROM feedback ORDER BY created_at`),
  ]);

  const nicknamesObj = {};
  for (const row of nicknames.rows) {
    nicknamesObj[row.ip_hash] = {
      nickname: row.nickname,
      ipEncrypted: row.ip_encrypted,
      updatedAt: row.updated_at,
    };
  }

  return {
    votes: votes.rows.map(rowToVote),
    nicknames: nicknamesObj,
    feedback: feedback.rows.map((row) => ({
      rating: row.rating,
      comment: row.comment,
      ipHash: row.ip_hash,
      ipEncrypted: row.ip_encrypted,
      createdAt: row.created_at,
    })),
  };
}

module.exports = { initDB, addVoteIfNew, getRatingVotes, getNickname, setNickname, addFeedback, getAll };
