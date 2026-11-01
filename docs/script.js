// script.js: lógica del frontend de ProfileGaming

const API_BASE_URL = "https://profilegaming.onrender.com";

// ---------------------------------------------------------------------------
// Imágenes de los juegos. Se buscan en assets/games/<id>.jpg (o .webp / .png).
// Si el archivo no existe, se muestra una tarjeta de color con el nombre.
// ---------------------------------------------------------------------------
const IMAGE_EXTENSIONS = ["jpg", "webp", "png"];

const GAME_COLORS = {
  minecraft: ["#5b8731", "#2f4a1a"],
  valorant: ["#ff4655", "#7a1d26"],
  fortnite: ["#6a3fd6", "#2f1a73"],
  residentevil: ["#8a1c1c", "#2a0a0a"],
  gta: ["#1f7a4d", "#0c2e1e"],
  brawlstars: ["#ffb400", "#a35c00"],
  overwatch: ["#f79020", "#8a3d00"],
  apexlegends: ["#d9342b", "#4a0f0c"],
  rocketleague: ["#1e88e5", "#0b2f57"],
  counterstrike: ["#d4a017", "#4d3a05"],
  callofduty: ["#4b5d3a", "#1a2112"],
  fallguys: ["#ec4899", "#6d1a47"],
};

function renderGameImage(frame, gameId, name) {
  const [c1, c2] = GAME_COLORS[gameId] || ["#3a2459", "#11081f"];
  frame.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
  frame.textContent = "";
  const fallback = document.createElement("span");
  fallback.className = "game-card-fallback";
  fallback.textContent = name;
  frame.appendChild(fallback);

  let attempt = 0;
  const img = new Image();
  img.alt = name;
  img.decoding = "async";
  img.onload = () => {
    frame.textContent = "";
    frame.appendChild(img);
  };
  img.onerror = () => {
    attempt += 1;
    if (attempt < IMAGE_EXTENSIONS.length) img.src = `assets/games/${gameId}.${IMAGE_EXTENSIONS[attempt]}`;
  };
  img.src = `assets/games/${gameId}.${IMAGE_EXTENSIONS[0]}`;
}

// ---------------------------------------------------------------------------
// Pestaña Season: cada juego define cómo se pregunta "desde cuándo lo juegas".
// Los valores deben coincidir con VALID_SEASONS en backend/server.js.
// ---------------------------------------------------------------------------
function yearRange(start, end) {
  const years = [];
  for (let y = end; y >= start; y--) years.push({ value: String(y), label: String(y) });
  return years;
}

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
  valorant: { name: "Valorant", type: "year", label: "Año desde el que juegas", options: yearRange(2020, 2026) },
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
  brawlstars: { name: "Brawl Stars", type: "year", label: "Año desde el que juegas", options: yearRange(2018, 2026) },
  overwatch: { name: "Overwatch", type: "year", label: "Año desde el que juegas", options: yearRange(2016, 2026) },
  apexlegends: { name: "Apex Legends", type: "year", label: "Año desde el que juegas", options: yearRange(2019, 2026) },
  rocketleague: { name: "Rocket League", type: "year", label: "Año desde el que juegas", options: yearRange(2015, 2026) },
  counterstrike: {
    name: "Counter-Strike",
    type: "title",
    label: "Versión con la que empezaste",
    options: [
      { value: "cs16", label: "Counter-Strike 1.6 (2000)" },
      { value: "css", label: "Counter-Strike: Source (2004)" },
      { value: "csgo", label: "Counter-Strike: Global Offensive (2012)" },
      { value: "cs2", label: "Counter-Strike 2 (2023)" },
    ],
  },
  callofduty: {
    name: "Call of Duty",
    type: "title",
    label: "Título con el que empezaste",
    options: [
      { value: "cod1", label: "Call of Duty (2003)" },
      { value: "cod2", label: "Call of Duty 2 (2005)" },
      { value: "cod4", label: "Call of Duty 4: Modern Warfare (2007)" },
      { value: "codwaw", label: "Call of Duty: World at War (2008)" },
      { value: "codmw2", label: "Modern Warfare 2 (2009)" },
      { value: "codbo1", label: "Black Ops (2010)" },
      { value: "codmw3", label: "Modern Warfare 3 (2011)" },
      { value: "codbo2", label: "Black Ops II (2012)" },
      { value: "codghosts", label: "Ghosts (2013)" },
      { value: "codaw", label: "Advanced Warfare (2014)" },
      { value: "codbo3", label: "Black Ops III (2015)" },
      { value: "codiw", label: "Infinite Warfare (2016)" },
      { value: "codww2", label: "WWII (2017)" },
      { value: "codbo4", label: "Black Ops 4 (2018)" },
      { value: "codmw19", label: "Modern Warfare (2019)" },
      { value: "codcw", label: "Black Ops Cold War (2020)" },
      { value: "codvanguard", label: "Vanguard (2021)" },
      { value: "codmw22", label: "Modern Warfare II (2022)" },
      { value: "codmw23", label: "Modern Warfare III (2023)" },
      { value: "codbo6", label: "Black Ops 6 (2024)" },
      { value: "codbo7", label: "Black Ops 7 (2025)" },
    ],
  },
  fallguys: { name: "Fall Guys", type: "year", label: "Año desde el que juegas", options: yearRange(2020, 2026) },
};

// ---------------------------------------------------------------------------
// Pestaña Tú vs. Crítica: solo juegos con nota real de Metacritic.
// "metascore" es la respuesta correcta; "url" lleva a la página del juego.
// Los valores deben coincidir con GUESS_GAMES en backend/server.js.
// ---------------------------------------------------------------------------
const VERSUS_GAMES = {
  minecraft: {
    name: "Minecraft",
    meta: "Versión de PC",
    metascore: 93,
    url: "https://www.metacritic.com/game/minecraft/",
    clue: "Los críticos destacaron su libertad casi ilimitada para construir y explorar, y lo mucho que despierta la creatividad. Los reparos fueron menores: una presentación gráfica sencilla y poca guía para quien empieza.",
  },
  residentevil: {
    name: "Resident Evil 4 Remake",
    meta: "Versión de PS5 · 2023",
    metascore: 93,
    url: "https://www.metacritic.com/game/resident-evil-4/",
    clue: "Un remake que moderniza la jugabilidad del clásico, con combate más fluido y una ambientación muy cuidada. Algunos críticos opinaron que no supera al original de 2005, pero casi todos lo recomendaron.",
  },
  gta: {
    name: "Grand Theft Auto V",
    meta: "Versión de PS4",
    metascore: 97,
    url: "https://www.metacritic.com/game/grand-theft-auto-v/",
    clue: "Un mundo abierto enorme con tres protagonistas jugables, misiones muy variadas y una producción técnica sobresaliente. Las observaciones negativas se centraron en un tono satírico que no gusta a todos.",
  },
  apexlegends: {
    name: "Apex Legends",
    meta: "Versión de PC",
    metascore: 88,
    url: "https://www.metacritic.com/game/apex-legends/",
    clue: "Un battle royale gratuito con personajes de habilidades únicas, un sistema de avisos muy práctico y un combate ágil. Los críticos lo vieron como una evolución del género; los reparos apuntaron a su modelo de monetización.",
  },
  rocketleague: {
    name: "Rocket League",
    meta: "Versión de PC",
    metascore: 86,
    url: "https://www.metacritic.com/game/rocket-league/",
    clue: "Una mezcla de fútbol y autos fácil de entender pero difícil de dominar, con física muy pulida y partidas rápidas. Lo elogiaron como multijugador adictivo, aunque con poco contenido para un solo jugador.",
  },
  overwatch: {
    name: "Overwatch",
    meta: "Versión de PC · 2016",
    metascore: 91,
    url: "https://www.metacritic.com/game/overwatch/",
    clue: "Un shooter por equipos con héroes muy distintos entre sí, mapas bien diseñados y un acabado impecable. Los análisis resaltaron su accesibilidad y señalaron la falta de una campaña para un jugador.",
  },
  counterstrike: {
    name: "Counter-Strike: Global Offensive",
    meta: "Versión de PC",
    metascore: 83,
    url: "https://www.metacritic.com/game/counter-strike-global-offensive/",
    clue: "Una actualización del shooter táctico que conserva su base competitiva, de gran profundidad y exigencia. Valoraron su equilibrio y su comunidad, aunque notaron pocos cambios frente a versiones anteriores.",
  },
};

function fillSelect(select, options, placeholder) {
  select.innerHTML =
    (placeholder ? `<option value="">${placeholder}</option>` : "") +
    options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
}

function fillGameSelects() {
  fillSelect(
    document.getElementById("temporada-game"),
    Object.entries(SEASON_GAMES).map(([id, g]) => ({ value: id, label: g.name })),
    "Elige un juego"
  );
  fillSelect(
    document.getElementById("versus-game"),
    Object.entries(VERSUS_GAMES).map(([id, g]) => ({ value: id, label: g.name })),
    "Elige un juego"
  );
}

async function postJSON(path, body) {
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error en el servidor");
  return data;
}

// --- Pestaña Season ---
const temporadaGameSelect = document.getElementById("temporada-game");
const dynamicLabel = document.getElementById("temporada-dynamic-label");
const dynamicText = document.getElementById("temporada-dynamic-text");
const dynamicSelect = document.getElementById("temporada-dynamic-select");
const gtaYearLabel = document.getElementById("temporada-gta-year-label");
const gtaYearInput = document.getElementById("temporada-gta-year");
const gtaYearOutput = document.getElementById("temporada-gta-year-output");
const seasonCard = document.getElementById("season-game-card");

temporadaGameSelect.addEventListener("change", () => {
  const gameId = temporadaGameSelect.value;
  gtaYearLabel.hidden = true;

  if (!gameId || !SEASON_GAMES[gameId]) {
    dynamicLabel.hidden = true;
    seasonCard.hidden = true;
    return;
  }

  const game = SEASON_GAMES[gameId];
  document.getElementById("season-game-name").textContent = game.name;
  renderGameImage(document.getElementById("season-game-frame"), gameId, game.name);
  seasonCard.hidden = false;

  dynamicText.textContent = game.label;
  fillSelect(dynamicSelect, game.options, "Elige una opción");
  dynamicLabel.hidden = false;
});

dynamicSelect.addEventListener("change", () => {
  gtaYearLabel.hidden = !(temporadaGameSelect.value === "gta" && dynamicSelect.value === "gta5");
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
  if (gameId === "gta" && season === "gta5") season = `gta5-${gtaYearInput.value}`;

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

// --- Pestaña Tú vs. Crítica (adivinar la nota de Metacritic) ---
const versusGameSelect = document.getElementById("versus-game");
const versusCard = document.getElementById("versus-game-card");
const guessBlock = document.getElementById("versus-guess-block");
const guessSlider = document.getElementById("guess-slider");
const guessNumber = document.getElementById("guess-number");
const guessOutput = document.getElementById("guess-output");
const versusMeter = document.getElementById("versus-meter");

function setGuess(value) {
  const n = Math.min(100, Math.max(1, Math.round(Number(value) || 1)));
  guessSlider.value = n;
  guessNumber.value = n;
  guessOutput.textContent = n;
  return n;
}

guessSlider.addEventListener("input", () => setGuess(guessSlider.value));
guessNumber.addEventListener("input", () => {
  if (guessNumber.value !== "") setGuess(guessNumber.value);
});

versusGameSelect.addEventListener("change", () => {
  const game = VERSUS_GAMES[versusGameSelect.value];
  versusMeter.hidden = true;
  document.getElementById("versus-msg").textContent = "";
  if (!game) {
    versusCard.hidden = true;
    guessBlock.hidden = true;
    return;
  }
  document.getElementById("versus-game-name").textContent = game.name;
  document.getElementById("versus-game-meta").textContent = game.meta;
  document.getElementById("versus-clue").textContent = game.clue;
  renderGameImage(document.getElementById("versus-game-frame"), versusGameSelect.value, game.name);
  versusCard.hidden = false;
  guessBlock.hidden = false;
  setGuess(50);
});

function verdictFor(diff) {
  if (diff === 0) return "¡Exacto! Acertaste la nota.";
  if (diff <= 3) return `Casi perfecto: te desviaste solo ${diff} ${diff === 1 ? "punto" : "puntos"}.`;
  if (diff <= 8) return `Muy cerca: te desviaste ${diff} puntos.`;
  if (diff <= 15) return `Cerca: te desviaste ${diff} puntos.`;
  return `Lejos esta vez: te desviaste ${diff} puntos.`;
}

function revealResult(game, guess) {
  document.getElementById("meter-user").style.width = `${guess}%`;
  document.getElementById("meter-user-value").textContent = guess;
  document.getElementById("meter-critic").style.width = `${game.metascore}%`;
  document.getElementById("meter-critic-value").textContent = game.metascore;
  document.getElementById("versus-verdict").textContent = verdictFor(Math.abs(guess - game.metascore));
  document.getElementById("versus-link").href = game.url;
  versusMeter.hidden = false;
}

document.getElementById("form-versus").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = document.getElementById("versus-msg");
  const gameId = versusGameSelect.value;
  const game = VERSUS_GAMES[gameId];
  if (!game) {
    msg.textContent = "Elige un juego primero.";
    return;
  }

  const guess = setGuess(guessNumber.value || guessSlider.value);
  msg.textContent = "Comprobando...";
  try {
    await postJSON("/api/guess", { game: gameId, guess });
    revealResult(game, guess);
    msg.textContent = "";
  } catch (err) {
    if (err.message.includes("duplicad")) {
      revealResult(game, guess);
      msg.textContent = "Ya habías participado con este juego, así que esta vez no se suma al ranking.";
    } else {
      msg.textContent = `Error: ${err.message}`;
    }
  }
});

// --- Pestaña Ranking ---
document.getElementById("btn-cargar-ranking").addEventListener("click", async () => {
  const msg = document.getElementById("ranking-msg");
  const table = document.getElementById("ranking-table");
  const body = document.getElementById("ranking-body");
  msg.textContent = "Cargando...";
  try {
    const res = await fetch(`${API_BASE_URL}/api/ranking`).catch(() => {
      throw new Error("No se pudo conectar con el servidor. Intenta de nuevo en unos minutos.");
    });
    if (!res.ok) throw new Error("El servidor respondió con un error");
    const data = await res.json();
    data.sort((a, b) => b.metascore - a.metascore);
    body.innerHTML = data
      .map(
        (row) => `<tr>
          <td>${row.name}</td>
          <td>${row.metascore}</td>
          <td>${row.avgGuess ?? "-"}</td>
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

// --- Menú y navegación por pestañas (misma página, sin recargar) ---
const menuToggle = document.getElementById("menu-toggle");
const siteMenu = document.getElementById("site-menu");
const menuCurrent = document.getElementById("menu-current");

function setMenuOpen(open) {
  siteMenu.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
}

function switchTab(tab) {
  document.querySelectorAll(".menu-item").forEach((item) => {
    const active = item.dataset.tab === tab;
    item.classList.toggle("active", active);
    if (active) menuCurrent.textContent = item.textContent;
  });
  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === tab);
  });
  setMenuOpen(false);
  window.scrollTo(0, 0);
}

menuToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  setMenuOpen(!siteMenu.classList.contains("open"));
});
document.addEventListener("click", (e) => {
  if (!siteMenu.contains(e.target)) setMenuOpen(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenuOpen(false);
});
document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => switchTab(item.dataset.tab));
});
document.getElementById("logo-home-btn").addEventListener("click", () => switchTab("inicio"));

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
    applyTheme(btn.dataset.theme);
    localStorage.setItem(THEME_KEY, btn.dataset.theme);
  });
});
applyTheme(localStorage.getItem(THEME_KEY) || "dark");

// --- Gamertag, ligado a la IP desde el backend ---
const nicknameGate = document.getElementById("nickname-gate");
const nicknameInput = document.getElementById("nickname-input");
const nicknameSaveBtn = document.getElementById("nickname-save-btn");
const nicknameMsg = document.getElementById("nickname-msg");
const userGreeting = document.getElementById("user-greeting");
const settingsNicknameInput = document.getElementById("settings-nickname-input");
const settingsNicknameSave = document.getElementById("settings-nickname-save");
const settingsNicknameMsg = document.getElementById("settings-nickname-msg");

function showGreeting(nickname) {
  userGreeting.textContent = `Hola, ${nickname}`;
  userGreeting.hidden = false;
  settingsNicknameInput.value = nickname;
}

async function checkNickname() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/nickname`);
    if (!res.ok) throw new Error("El servidor respondió con un error");
    const data = await res.json();
    if (data.nickname) {
      showGreeting(data.nickname);
      nicknameGate.hidden = true;
    } else {
      nicknameGate.hidden = false;
      nicknameInput.focus();
    }
  } catch {
    nicknameGate.hidden = false;
    nicknameMsg.textContent = "No se pudo conectar con el servidor. Intenta recargar la página en unos minutos.";
  }
}

async function saveNickname(nickname, msgEl) {
  const trimmed = nickname.trim();
  if (trimmed.length < 2 || trimmed.length > 20) {
    msgEl.textContent = "El gamertag debe tener entre 2 y 20 caracteres.";
    return false;
  }
  try {
    const data = await postJSON("/api/nickname", { nickname: trimmed });
    showGreeting(data.nickname);
    msgEl.textContent = "";
    return true;
  } catch (err) {
    msgEl.textContent = `Error: ${err.message}`;
    return false;
  }
}

nicknameSaveBtn.addEventListener("click", async () => {
  if (await saveNickname(nicknameInput.value, nicknameMsg)) nicknameGate.hidden = true;
});
nicknameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") nicknameSaveBtn.click();
});
settingsNicknameSave.addEventListener("click", async () => {
  if (await saveNickname(settingsNicknameInput.value, settingsNicknameMsg)) {
    settingsNicknameMsg.textContent = "Gamertag actualizado.";
  }
});
checkNickname();

// --- Encuesta de satisfacción (una sola vez por navegador) ---
const FEEDBACK_KEY = "profilegaming-feedback-sent";
const feedbackWidget = document.querySelector(".feedback-widget");
const feedbackStars = document.querySelectorAll(".star-btn");
const feedbackComment = document.getElementById("feedback-comment");
const feedbackSubmit = document.getElementById("feedback-submit");
const feedbackMsg = document.getElementById("feedback-msg");
let selectedRating = 0;

feedbackStars.forEach((star) => {
  star.addEventListener("click", () => {
    selectedRating = Number(star.dataset.value);
    feedbackStars.forEach((s) => s.classList.toggle("active", Number(s.dataset.value) <= selectedRating));
  });
});

feedbackSubmit.addEventListener("click", async () => {
  if (selectedRating < 1) {
    feedbackMsg.textContent = "Selecciona una calificación de estrellas.";
    return;
  }
  feedbackMsg.textContent = "Enviando...";
  try {
    await postJSON("/api/feedback", { rating: selectedRating, comment: feedbackComment.value.trim() });
    localStorage.setItem(FEEDBACK_KEY, "1");
    feedbackWidget.innerHTML = '<p class="feedback-title">¡Gracias por tu opinión!</p>';
  } catch (err) {
    feedbackMsg.textContent = `Error: ${err.message}`;
  }
});

if (localStorage.getItem(FEEDBACK_KEY) === "1") {
  feedbackWidget.innerHTML = '<p class="feedback-title">¡Gracias por tu opinión!</p>';
}

// ---------------------------------------------------------------------------
// ESBOZO DEL EASTER EGG (desactivado: no hace nada mientras la bandera sea false).
// Para activarlo: descomentar el bloque de index.html (dentro de Who Is This?),
// descomentar los estilos .egg-* de style.css y poner EASTER_EGG_ENABLED = true.
// Las respuestas de ejemplo son temporales: cuando se active de verdad,
// la validación debe pasar al backend para que no se pueda leer desde el código.
// ---------------------------------------------------------------------------
const EASTER_EGG_ENABLED = false;

const EGG_GATES = [
  { id: "egg-1", prompt: "Captcha 1 (por definir)", answer: null },
  { id: "egg-2", prompt: "Pregunta 2 (por definir)", answer: null },
  { id: "egg-3", prompt: "Pregunta 3 (por definir)", answer: null },
];

function initEasterEgg() {
  if (!EASTER_EGG_ENABLED) return;

  const trigger = document.getElementById("egg-trigger");
  const page = document.getElementById("egg-page");
  const vault = document.getElementById("egg-vault");
  if (!trigger || !page || !vault) return;

  const unlocked = new Set();
  EGG_GATES.forEach((gate) => {
    const promptEl = document.getElementById(`${gate.id}-prompt`);
    if (promptEl) promptEl.textContent = gate.prompt;
  });

  trigger.addEventListener("click", () => {
    page.hidden = false;
  });

  document.querySelectorAll("[data-egg-check]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const gate = EGG_GATES.find((g) => g.id === btn.dataset.eggCheck);
      const section = document.getElementById(gate.id);
      const input = document.getElementById(`${gate.id}-input`);
      if (gate.answer !== null && input.value.trim().toLowerCase() === String(gate.answer).toLowerCase()) {
        unlocked.add(gate.id);
        section.dataset.locked = "false";
        section.querySelector(".egg-content").hidden = false;
      }
      if (unlocked.size === EGG_GATES.length) vault.hidden = false;
    });
  });
}
initEasterEgg();

// --- Inicialización general ---
fillGameSelects();
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();
