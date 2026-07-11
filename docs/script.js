// ⚠️ Cambiá esto por la URL real de tu backend cuando lo despliegues (paso 4 del README).
// Mientras probás en tu compu, dejalo en localhost.
const API_BASE_URL = "https://profilegaming.onrender.com";

// Catálogo de juegos del experimento. La nota de crítica es un dato fijo
// de referencia (podés cambiarla por la real de Metacritic/OpenCritic, etc.)
const GAMES = [
  { id: "elden-ring", name: "Elden Ring", critic: 9.6 },
  { id: "zelda-totk", name: "The Legend of Zelda: Tears of the Kingdom", critic: 9.6 },
  { id: "baldurs-gate-3", name: "Baldur's Gate 3", critic: 9.6 },
  { id: "gta-v", name: "Grand Theft Auto V", critic: 9.7 },
  { id: "minecraft", name: "Minecraft", critic: 9.0 },
  { id: "valorant", name: "Valorant", critic: 8.0 },
  { id: "league-of-legends", name: "League of Legends", critic: 8.2 },
];

function fillGameSelects() {
  const selects = [document.getElementById("temporada-game"), document.getElementById("versus-game")];
  selects.forEach((select) => {
    select.innerHTML = '<option value="">Elegí un juego</option>' +
      GAMES.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
  });
}

function getCriticScore(gameId) {
  const g = GAMES.find((x) => x.id === gameId);
  return g ? g.critic : null;
}

async function postJSON(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error en el servidor");
  return data;
}

// --- Minijuego 1: temporada ---
document.getElementById("form-temporada").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("temporada-msg");
  msg.textContent = "Enviando...";
  try {
    await postJSON("/api/season", {
      game: form.get("game"),
      season: form.get("season"),
    });
    msg.textContent = "¡Listo! Tu respuesta quedó guardada.";
  } catch (err) {
    msg.textContent = err.message.includes("duplicad")
      ? "Ya registramos un voto tuyo para este juego."
      : `Error: ${err.message}`;
  }
});

// --- Minijuego 2: versus ---
const slider = document.getElementById("rating-slider");
const ratingOutput = document.getElementById("rating-output");
slider.addEventListener("input", () => (ratingOutput.textContent = slider.value));

document.getElementById("form-versus").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("versus-msg");
  const gameId = form.get("game");
  const rating = Number(form.get("rating"));

  if (!gameId) {
    msg.textContent = "Elegí un juego primero.";
    return;
  }

  msg.textContent = "Comparando...";
  try {
    await postJSON("/api/rating", { game: gameId, rating });
    const critic = getCriticScore(gameId);

    document.getElementById("versus-meter").hidden = false;
    document.getElementById("meter-user").style.width = `${rating * 10}%`;
    document.getElementById("meter-critic").style.width = `${critic * 10}%`;
    document.getElementById("meter-user-value").textContent = rating.toFixed(1);
    document.getElementById("meter-critic-value").textContent = critic.toFixed(1);

    const diff = rating - critic;
    const verdict =
      Math.abs(diff) < 0.5
        ? "Estás muy de acuerdo con la crítica."
        : diff > 0
        ? `Sos ${diff.toFixed(1)} puntos más generoso que la crítica.`
        : `Sos ${Math.abs(diff).toFixed(1)} puntos más duro que la crítica.`;
    document.getElementById("versus-verdict").textContent = verdict;
    msg.textContent = "";
  } catch (err) {
    msg.textContent = err.message.includes("duplicad")
      ? "Ya calificaste este juego antes."
      : `Error: ${err.message}`;
  }
});

// --- Minijuego 3: ranking ---
document.getElementById("btn-cargar-ranking").addEventListener("click", async () => {
  const msg = document.getElementById("ranking-msg");
  const table = document.getElementById("ranking-table");
  const body = document.getElementById("ranking-body");
  msg.textContent = "Cargando...";
  try {
    const res = await fetch(`${API_BASE_URL}/api/ranking`);
    const data = await res.json();
    body.innerHTML = data
      .map(
        (row) => `<tr>
          <td>${row.name}</td>
          <td>${row.avgUserRating ?? "—"}</td>
          <td>${row.critic.toFixed(1)}</td>
          <td>${row.votes}</td>
        </tr>`
      )
      .join("");
    table.hidden = false;
    msg.textContent = "";
  } catch (err) {
    msg.textContent = `Error: ${err.message}`;
  }
});

// Tabs simples por scroll (resalta el link activo)
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");
  });
});

fillGameSelects();

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
