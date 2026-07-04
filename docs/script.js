// script.js: lógica del frontend de ProfileGaming

// ⚠️ Cambia esto por la URL real del backend cuando esté desplegado (ver README).
const API_BASE_URL = "http://localhost:3000";

// ---------------------------------------------------------------------------
// Catálogo para la pestaña "Temporada": cada juego define cómo se pregunta
// "desde cuándo lo juegas", porque no todos se miden en años calendario.
// ---------------------------------------------------------------------------
const SEASON_GAMES = {
  minecraft: {
    name: "Minecraft",
    type: "version",
    label: "Versión desde la que juegas",
    options: [
      { value: "beta-1.7", label: "Beta 1.7 (2011)" },
      { value: "1.8", label: "Java 1.8 (2014)" },
      { value: "1.12", label: "Java 1.12 (2017)" },
      { value: "1.14", label: "Java 1.14 (2019)" },
      { value: "1.16", label: "Java/Bedrock 1.16 (2020)" },
      { value: "1.18", label: "1.18 (2021)" },
      { value: "1.19", label: "1.19 (2022)" },
      { value: "1.20", label: "1.20 (2023)" },
      { value: "1.21", label: "1.21 (2024)" },
      { value: "actual", label: "Versión actual (2025-2026)" },
    ],
  },
  valorant: {
    name: "Valorant",
    type: "year",
    label: "Año desde el que juegas",
    options: yearRange(2020, 2026),
  },
  fortnite: {
    name: "Fortnite",
    type: "season",
    label: "Temporada desde la que juegas",
    options: [
      { value: "capitulo-1", label: "Capítulo 1 (2017)" },
      { value: "capitulo-2", label: "Capítulo 2 (2019)" },
      { value: "capitulo-3", label: "Capítulo 3 (2021)" },
      { value: "capitulo-4", label: "Capítulo 4 (2022)" },
      { value: "capitulo-5", label: "Capítulo 5 (2023)" },
      { value: "capitulo-6", label: "Capítulo 6 / OG (2024)" },
      { value: "actual", label: "Temporada actual (2025-2026)" },
    ],
  },
  residentevil: {
    name: "Resident Evil",
    type: "title",
    label: "Título con el que empezaste",
    options: [
      { value: "re1", label: "Resident Evil (1996)" },
      { value: "re2", label: "Resident Evil 2 (1998)" },
      { value: "re3", label: "Resident Evil 3 (1999)" },
      { value: "re4", label: "Resident Evil 4 (2005)" },
      { value: "re5", label: "Resident Evil 5 (2009)" },
      { value: "re6", label: "Resident Evil 6 (2012)" },
      { value: "re7", label: "Resident Evil 7 (2017)" },
      { value: "re2r", label: "Resident Evil 2 Remake (2019)" },
      { value: "revillage", label: "Resident Evil Village (2021)" },
      { value: "re4r", label: "Resident Evil 4 Remake (2023)" },
    ],
  },
  gta: {
    name: "GTA",
    type: "gta",
    label: "Título con el que empezaste",
    options: [
      { value: "gta3", label: "GTA III (2001)" },
      { value: "gta-vc", label: "GTA Vice City (2002)" },
      { value: "gta-sa", label: "GTA San Andreas (2004)" },
      { value: "gta4", label: "GTA IV (2008)" },
      { value: "gta5", label: "GTA V (2013)" },
    ],
  },
  brawlstars: {
    name: "Brawl Stars",
    type: "year",
    label: "Año desde el que juegas",
    options: yearRange(2018, 2026),
  },
  overwatch: {
    name: "Overwatch",
    type: "year",
    label: "Año desde el que juegas",
    options: yearRange(2016, 2026),
  },
};

function yearRange(start, end) {
  const years = [];
  for (let y = end; y >= start; y--) years.push({ value: String(y), label: String(y) });
  return years;
}

// ---------------------------------------------------------------------------
// Catálogo para "Tú vs. Crítica" y el Ranking: un título representativo por
// franquicia, con su nota de Metacritic. Estas notas son públicas pero
// pueden cambiar con el tiempo; conviene revisarlas cada tanto en metacritic.com.
// Cuando no hay nota oficial de crítica (juegos sin reseñas agregadas), el
// valor "critic" queda en null y la comparación se omite.
// ---------------------------------------------------------------------------
const VERSUS_GAMES = {
  minecraft: { name: "Minecraft", critic: 93, color: "#5b8731", short: "MC" },
  fortnite: { name: "Fortnite", critic: 82, color: "#6a3fd6", short: "FN" },
  residentevil: { name: "Resident Evil 4 (2023)", critic: 93, color: "#7a1616", short: "RE" },
  gta: { name: "GTA V", critic: 97, color: "#1f7a4d", short: "GTA" },
  valorant: { name: "Valorant", critic: null, color: "#ff4655", short: "VAL" },
  brawlstars: { name: "Brawl Stars", critic: null, color: "#ffb400", short: "BS" },
  overwatch: { name: "Overwatch", critic: null, color: "#f79020", short: "OW" },
};

function fillSelect(select, options, placeholder) {
  select.innerHTML =
    (placeholder ? `<option value="">${placeholder}</option>` : "") +
    options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
}

function fillGameSelects() {
  const temporadaSelect = document.getElementById("temporada-game");
  fillSelect(
    temporadaSelect,
    Object.entries(SEASON_GAMES).map(([id, g]) => ({ value: id, label: g.name })),
    "Elige un juego"
  );

  const versusSelect = document.getElementById("versus-game");
  fillSelect(
    versusSelect,
    Object.entries(VERSUS_GAMES).map(([id, g]) => ({ value: id, label: g.name })),
    "Elige un juego"
  );
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

// --- Pestaña 1: Temporada (con lógica dinámica por tipo de juego) ---
const temporadaGameSelect = document.getElementById("temporada-game");
const dynamicLabel = document.getElementById("temporada-dynamic-label");
const dynamicText = document.getElementById("temporada-dynamic-text");
const dynamicSelect = document.getElementById("temporada-dynamic-select");
const gtaYearLabel = document.getElementById("temporada-gta-year-label");
const gtaYearInput = document.getElementById("temporada-gta-year");
const gtaYearOutput = document.getElementById("temporada-gta-year-output");

temporadaGameSelect.addEventListener("change", () => {
  const gameId = temporadaGameSelect.value;
  gtaYearLabel.hidden = true;

  if (!gameId || !SEASON_GAMES[gameId]) {
    dynamicLabel.hidden = true;
    return;
  }

  const game = SEASON_GAMES[gameId];
  dynamicText.textContent = game.label;
  fillSelect(dynamicSelect, game.options, "Elige una opción");
  dynamicLabel.hidden = false;
});

dynamicSelect.addEventListener("change", () => {
  const gameId = temporadaGameSelect.value;
  if (gameId === "gta" && dynamicSelect.value === "gta5") {
    gtaYearLabel.hidden = false;
  } else {
    gtaYearLabel.hidden = true;
  }
});

gtaYearInput.addEventListener("input", () => {
  gtaYearOutput.textContent = gtaYearInput.value;
});

document.getElementById("form-temporada").addEventListener("submit", async (e) => {
  e.preventDefault();
  const gameId = temporadaGameSelect.value;
  const msg = document.getElementById("temporada-msg");

  if (!gameId || !dynamicSelect.value) {
    msg.textContent = "Completa todas las opciones antes de guardar.";
    return;
  }

  let season = dynamicSelect.value;
  if (gameId === "gta" && season === "gta5") {
    season = `gta5-${gtaYearInput.value}`;
  }

  msg.textContent = "Enviando...";
  try {
    await postJSON("/api/season", { game: gameId, season });
    msg.textContent = "Listo, tu respuesta quedó guardada.";
  } catch (err) {
    msg.textContent = err.message.includes("duplicad")
      ? "Ya existe un voto tuyo para este juego."
      : `Error: ${err.message}`;
  }
});

// --- Pestaña 2: Versus ---
const slider = document.getElementById("rating-slider");
const ratingOutput = document.getElementById("rating-output");
slider.addEventListener("input", () => (ratingOutput.textContent = slider.value));

const versusGameSelect = document.getElementById("versus-game");
const versusCover = document.getElementById("versus-cover");
const versusCoverBox = document.getElementById("versus-cover-box");

versusGameSelect.addEventListener("change", () => {
  const game = VERSUS_GAMES[versusGameSelect.value];
  if (!game) {
    versusCover.hidden = true;
    return;
  }
  versusCoverBox.style.background = game.color;
  versusCoverBox.textContent = game.short;
  versusCover.hidden = false;
});

document.getElementById("form-versus").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  const msg = document.getElementById("versus-msg");
  const gameId = form.get("game");
  const rating = Number(form.get("rating"));

  if (!gameId) {
    msg.textContent = "Elige un juego primero.";
    return;
  }

  msg.textContent = "Comparando...";
  try {
    await postJSON("/api/rating", { game: gameId, rating });
    const game = VERSUS_GAMES[gameId];
    const meter = document.getElementById("versus-meter");
    const verdict = document.getElementById("versus-verdict");
    const criticRow = document.getElementById("meter-critic").closest(".meter-row");

    meter.hidden = false;
    document.getElementById("meter-user").style.width = `${rating * 10}%`;
    document.getElementById("meter-user-value").textContent = rating.toFixed(1);

    if (game.critic === null) {
      criticRow.style.display = "none";
      verdict.textContent = "Este juego no tiene una nota de crítica oficial en Metacritic todavía.";
    } else {
      criticRow.style.display = "flex";
      const criticOutOf10 = game.critic / 10;
      document.getElementById("meter-critic").style.width = `${game.critic}%`;
      document.getElementById("meter-critic-value").textContent = criticOutOf10.toFixed(1);

      const diff = rating - criticOutOf10;
      verdict.textContent =
        Math.abs(diff) < 0.5
          ? "Tu opinión coincide bastante con la crítica."
          : diff > 0
          ? `Eres ${diff.toFixed(1)} puntos más generoso que la crítica.`
          : `Eres ${Math.abs(diff).toFixed(1)} puntos más exigente que la crítica.`;
    }
    msg.textContent = "";
  } catch (err) {
    msg.textContent = err.message.includes("duplicad")
      ? "Ya calificaste este juego antes."
      : `Error: ${err.message}`;
  }
});

// --- Pestaña 3: Ranking ---
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
          <td>${row.avgUserRating ?? ":"}</td>
          <td>${row.critic !== null ? (row.critic / 10).toFixed(1) : ":"}</td>
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

// --- Navegación por pestañas (misma página, sin recargar) ---
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const tab = link.dataset.tab;

    document.querySelectorAll(".nav-link").forEach((l) => l.classList.remove("active"));
    link.classList.add("active");

    document.querySelectorAll(".tab-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === tab);
    });
  });
});

// --- Tema oscuro/claro (oscuro por defecto, se guarda en este navegador) ---
const THEME_KEY = "profilegaming-theme";

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.querySelectorAll(".theme-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
}

document.querySelectorAll(".theme-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const theme = btn.dataset.theme;
    applyTheme(theme);
    localStorage.setItem(THEME_KEY, theme);
  });
});

const savedTheme = localStorage.getItem(THEME_KEY) || "dark";
applyTheme(savedTheme);

// --- Inicialización general ---
fillGameSelects();

const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
