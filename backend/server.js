// server.js: backend del experimento. Comentado paso a paso para que
// puedas entender cada decisión de seguridad.

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { addVoteIfNew, getRatingVotes, getNickname, setNickname, addFeedback, getAll } = require("./db");
const { encryptIP, decryptIP } = require("./crypto-utils");

const app = express();
const PORT = process.env.PORT || 3000;

// La SAL (salt) hace que el hash de la IP no se pueda "deshacer" fácilmente
// ni comparar contra listas de IPs ya conocidas. Va en una variable de
// entorno (.env), nunca hardcodeada ni subida a GitHub.
const IP_SALT = process.env.IP_SALT || "cambia-esta-sal-en-produccion";

// Clave para poder consultar /api/admin/export y ver todos los datos
// guardados (gamertags, votos, opiniones). Si no se configura, la ruta
// queda bloqueada por completo: nadie puede ver los datos sin esta clave.
const ADMIN_KEY = process.env.ADMIN_KEY || null;

// Si tu hosting (Render, Railway, etc.) está detrás de un proxy/balanceador,
// esto le dice a Express que confíe en el header X-Forwarded-For para
// obtener la IP real del visitante en vez de la IP del proxy.
app.set("trust proxy", 1);

// --- Seguridad básica ---
app.use(helmet()); // cabeceras HTTP seguras (XSS, sniffing, etc.)
app.use(express.json({ limit: "10kb" })); // limita tamaño del body, evita payloads gigantes

// CORS: solo tu frontend debería poder llamar a esta API.
// Reemplazá por tu dominio real cuando despliegues (ver README).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5500,http://127.0.0.1:5500").split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Origen no permitido por CORS"));
    },
  })
);

// Rate limiting: además del control de "un voto por IP por juego",
// esto evita que alguien bombardee la API con miles de pedidos por minuto.
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // máx 30 pedidos por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Catálogo para la ruta /api/rating y /api/ranking (juegos con nota de
// Metacritic). Debe coincidir con VERSUS_GAMES en frontend/script.js.
// Cuando "critic" es null, el juego no tiene nota oficial de crítica.
const VALID_GAMES = {
  "minecraft": { name: "Minecraft", critic: 93 },
  "fortnite": { name: "Fortnite", critic: 82 },
  "residentevil": { name: "Resident Evil 4 (2023)", critic: 93 },
  "gta": { name: "GTA V", critic: 97 },
  "valorant": { name: "Valorant", critic: null },
  "brawlstars": { name: "Brawl Stars", critic: null },
  "overwatch": { name: "Overwatch", critic: null },
};

// Temporadas/opciones válidas para /api/season, agrupadas por juego porque
// cada franquicia se mide distinto (versión, temporada, título o año).
// Debe coincidir con SEASON_GAMES en frontend/script.js.
const VALID_SEASONS = {
  minecraft: ["beta-1.7", "1.8", "1.12", "1.14", "1.16", "1.18", "1.19", "1.20", "1.21", "actual"],
  valorant: yearStrings(2020, 2026),
  fortnite: ["capitulo-1", "capitulo-2", "capitulo-3", "capitulo-4", "capitulo-5", "capitulo-6", "actual"],
  residentevil: ["re1", "re2", "re3", "re4", "re5", "re6", "re7", "re2r", "revillage", "re4r"],
  gta: ["gta3", "gta-vc", "gta-sa", "gta4", ...gtaFiveYearOptions()],
  brawlstars: yearStrings(2018, 2026),
  overwatch: yearStrings(2016, 2026),
};

function yearStrings(start, end) {
  const years = [];
  for (let y = start; y <= end; y++) years.push(String(y));
  return years;
}

// GTA V es un caso especial: en vez de un solo valor "gta5", el frontend
// manda "gta5-2013", "gta5-2014", etc., según el año elegido en el control
// deslizante. Generamos todas las combinaciones válidas de una vez.
function gtaFiveYearOptions() {
  return yearStrings(2013, 2026).map((y) => `gta5-${y}`);
}

function isValidSeason(game, season) {
  const options = VALID_SEASONS[game];
  return Array.isArray(options) && options.includes(season);
}

// Letras (con acentos y ñ), números, espacios, guion y guion bajo. Entre 2 y
// 20 caracteres. Rechaza etiquetas HTML y símbolos raros sin ser demasiado
// restrictivo con gamertags reales.
const NICKNAME_REGEX = /^[\p{L}\p{N} _-]{2,20}$/u;

function isValidNickname(nickname) {
  return typeof nickname === "string" && NICKNAME_REGEX.test(nickname.trim());
}

function hashIP(ip) {
  return crypto.createHash("sha256").update(ip + IP_SALT).digest("hex");
}

function getClientIP(req) {
  // req.ip ya respeta "trust proxy" configurado arriba.
  return req.ip || req.socket.remoteAddress || "desconocida";
}

// --- Rutas ---

app.post("/api/season", (req, res) => {
  const { game, season } = req.body || {};

  if (!VALID_GAMES[game]) return res.status(400).json({ error: "Juego inválido" });
  if (!isValidSeason(game, season)) return res.status(400).json({ error: "Temporada inválida" });

  const rawIP = getClientIP(req);
  const ipHash = hashIP(rawIP);
  const result = addVoteIfNew({ type: "season", game, season, ipHash, ipEncrypted: encryptIP(rawIP) });

  if (!result.ok) return res.status(409).json({ error: "Voto duplicado" });
  res.status(201).json({ ok: true });
});

app.post("/api/rating", (req, res) => {
  const { game, rating } = req.body || {};
  const numericRating = Number(rating);

  if (!VALID_GAMES[game]) return res.status(400).json({ error: "Juego inválido" });
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 10) {
    return res.status(400).json({ error: "Calificación inválida" });
  }

  const rawIP = getClientIP(req);
  const ipHash = hashIP(rawIP);
  const result = addVoteIfNew({ type: "rating", game, rating: numericRating, ipHash, ipEncrypted: encryptIP(rawIP) });

  if (!result.ok) return res.status(409).json({ error: "Voto duplicado" });
  res.status(201).json({ ok: true });
});

app.get("/api/ranking", (req, res) => {
  const votes = getRatingVotes();

  const ranking = Object.entries(VALID_GAMES).map(([id, info]) => {
    const gameVotes = votes.filter((v) => v.game === id);
    const avg = gameVotes.length
      ? Number((gameVotes.reduce((sum, v) => sum + v.rating, 0) / gameVotes.length).toFixed(2))
      : null;
    return { id, name: info.name, critic: info.critic, avgUserRating: avg, votes: gameVotes.length };
  });

  res.json(ranking);
});

// Gamertag ligado a la IP. A diferencia de los votos, este sí se puede
// actualizar (el usuario puede cambiarlo luego desde Ajustes).
app.get("/api/nickname", (req, res) => {
  const ipHash = hashIP(getClientIP(req));
  res.json({ nickname: getNickname(ipHash) });
});

app.post("/api/nickname", (req, res) => {
  const { nickname } = req.body || {};

  if (!isValidNickname(nickname)) {
    return res.status(400).json({ error: "El gamertag debe tener entre 2 y 20 caracteres válidos" });
  }

  const rawIP = getClientIP(req);
  const ipHash = hashIP(rawIP);
  const clean = nickname.trim();
  setNickname(ipHash, clean, encryptIP(rawIP));
  res.status(200).json({ ok: true, nickname: clean });
});

// Encuesta de satisfacción del pie de página: calificación de 1 a 5 y
// comentario opcional. No está ligada a un límite de "una vez por IP" a
// nivel de servidor porque el frontend ya evita reenvíos repetidos; el
// límite general de pedidos por minuto sigue aplicando igual.
app.post("/api/feedback", (req, res) => {
  const { rating, comment } = req.body || {};
  const numericRating = Number(rating);

  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    return res.status(400).json({ error: "Calificación inválida" });
  }
  const cleanComment = typeof comment === "string" ? comment.trim().slice(0, 300) : "";

  const rawIP = getClientIP(req);
  const ipHash = hashIP(rawIP);
  addFeedback({ rating: numericRating, comment: cleanComment, ipHash, ipEncrypted: encryptIP(rawIP) });
  res.status(201).json({ ok: true });
});

// Ruta para vos, como administrador del sitio, para ver todo lo que se
// guardó: gamertags, votos y opiniones, cada uno con su IP descifrada (si
// IP_ENCRYPTION_KEY está configurada). Requiere la clave secreta como
// parámetro: https://tu-backend.onrender.com/api/admin/export?key=TU_CLAVE
function withDecryptedIP(record) {
  if (!record || !record.ipEncrypted) return record;
  try {
    return { ...record, ip: decryptIP(record.ipEncrypted) };
  } catch {
    // Sin IP_ENCRYPTION_KEY configurada (o clave distinta a la usada al
    // cifrar), se devuelve el registro tal cual, sin la IP en claro.
    return record;
  }
}

app.get("/api/admin/export", (req, res) => {
  if (!ADMIN_KEY) {
    return res.status(503).json({ error: "ADMIN_KEY no configurada en el servidor" });
  }
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Clave incorrecta" });
  }

  const data = getAll();
  res.json({
    votes: data.votes.map(withDecryptedIP),
    nicknames: Object.fromEntries(
      Object.entries(data.nicknames).map(([ipHash, entry]) => [ipHash, withDecryptedIP(entry)])
    ),
    feedback: data.feedback.map(withDecryptedIP),
  });
});

app.get("/", (req, res) => {
  res.send("ProfileGaming API funcionando. Consulta /api/ranking para ver datos.");
});

// Manejador de errores global: si algo revienta (por ejemplo, un pedido de
// guardar datos cuando falta IP_ENCRYPTION_KEY), esto devuelve un JSON claro
// en vez de la página de error HTML por defecto de Express, que el frontend
// no podría interpretar.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor. Revisá los logs para más detalle." });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  const keyOk = process.env.IP_ENCRYPTION_KEY && process.env.IP_ENCRYPTION_KEY.length === 64;
  if (!keyOk) {
    console.warn(
      "ADVERTENCIA: IP_ENCRYPTION_KEY no está configurada (o no mide 64 caracteres). " +
        "Guardar cualquier voto, gamertag u opinión va a fallar hasta que la configures."
    );
  }
});
