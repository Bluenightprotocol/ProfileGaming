// server.js: backend del experimento. Comentado paso a paso para que
// puedas entender cada decisión de seguridad.

require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { addVoteIfNew, getRatingVotes } = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// La SAL (salt) hace que el hash de la IP no se pueda "deshacer" fácilmente
// ni comparar contra listas de IPs ya conocidas. Va en una variable de
// entorno (.env), nunca hardcodeada ni subida a GitHub.
const IP_SALT = process.env.IP_SALT || "cambia-esta-sal-en-produccion";

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

  const ipHash = hashIP(getClientIP(req));
  const result = addVoteIfNew({ type: "season", game, season, ipHash });

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

  const ipHash = hashIP(getClientIP(req));
  const result = addVoteIfNew({ type: "rating", game, rating: numericRating, ipHash });

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

app.get("/", (req, res) => {
  res.send("ProfileGaming API funcionando. Consulta /api/ranking para ver datos.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
