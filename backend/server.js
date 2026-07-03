// server.js — backend del experimento. Comentado paso a paso para que
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

// Lista de juegos válidos (debe coincidir con frontend/script.js).
// Validar contra una lista cerrada evita que guarden datos basura.
const VALID_GAMES = {
  "elden-ring": { name: "Elden Ring", critic: 9.6 },
  "zelda-totk": { name: "The Legend of Zelda: Tears of the Kingdom", critic: 9.6 },
  "baldurs-gate-3": { name: "Baldur's Gate 3", critic: 9.6 },
  "gta-v": { name: "Grand Theft Auto V", critic: 9.7 },
  "minecraft": { name: "Minecraft", critic: 9.0 },
  "valorant": { name: "Valorant", critic: 8.0 },
  "league-of-legends": { name: "League of Legends", critic: 8.2 },
};

const VALID_SEASONS = ["2018-o-antes", "2019", "2020", "2021", "2022", "2023", "2024", "2025", "2026"];

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
  if (!VALID_SEASONS.includes(season)) return res.status(400).json({ error: "Temporada inválida" });

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
  res.send("ProfileGaming API funcionando. Mirá /api/ranking para ver datos.");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
