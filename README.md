# ProfileGaming: guía completa (desde cero)

Proyecto de ejemplo: una web con mini juegos de calificación de videojuegos
(temporada en que jugaste, tu nota vs. la de la crítica, ranking comunitario),
con un backend propio que evita que la misma persona vote dos veces por
juego, usando un identificador derivado de su IP.

Te sirve para aprender, a la vez: diseño web, backend, bases de datos chicas
y nociones de ciberseguridad. Todo gratis.

---

## 1. Arquitectura (qué es cada cosa)

```
Navegador (frontend)  --HTTP-->  Servidor Node/Express (backend)  -->  archivo JSON (micro DB)
   index.html                         server.js                          data/ratings.json
   style.css                          db.js
   script.js
```

- **Frontend**: HTML/CSS/JS puro, sin frameworks. Es lo que ve el usuario.
- **Backend**: un servidor Node.js con Express que expone una API
  (`/api/rating`, `/api/season`, `/api/ranking`). Es el único que puede
  escribir en la base de datos.
- **Micro base de datos**: un archivo `ratings.json` en el servidor. Cada
  voto es un objeto `{ type, game, rating/season, ipHash, createdAt }`.
  No guardamos la IP real, guardamos un *hash* (ver sección 4).

El frontend **nunca** habla directo con la base de datos: siempre pasa por
el backend, que valida todo. Esa separación es la base de la seguridad.

---

## 2. Probarlo en tu computadora

### Backend
```bash
cd backend
cp .env.example .env      # creá tu archivo de variables de entorno
npm install
npm start
```
Esto levanta la API en `http://localhost:3000`.

### Frontend
Abrí `frontend/index.html` con la extensión **Live Server** de VS Code
(clic derecho → "Open with Live Server"), o simplemente abrí el archivo en
el navegador. Si usás Live Server, por defecto corre en
`http://127.0.0.1:5500`, que ya está permitido en el `.env.example`.

Si `script.js` apunta a `http://localhost:3000` y tu backend está corriendo,
ya podés votar y ver el ranking.

---

## 3. Subirlo a internet gratis (sin pagar nada)

Necesitás dos despliegues separados: uno para el frontend (archivos
estáticos) y otro para el backend (necesita un servidor corriendo 24/7).

### Frontend → GitHub Pages (gratis, para siempre)
1. Creá un repo en GitHub y subí la carpeta `frontend/`.
2. En el repo: Settings → Pages → Source: rama `main`, carpeta `/ (root)`.
3. Te da una URL tipo `https://tu-usuario.github.io/tu-repo/`.

(Alternativas igual de buenas: Netlify o Vercel, arrastrás la carpeta y listo.)

### Backend → Render (capa gratuita)
1. Subí la carpeta `backend/` a otro repo de GitHub (o el mismo, en subcarpeta).
2. En [render.com](https://render.com) → New → Web Service → conectá el repo.
3. Build command: `npm install`: Start command: `npm start`.
4. En "Environment", agregá las variables `IP_SALT` y `ALLOWED_ORIGINS`
   (poné ahí la URL real de tu GitHub Pages, ej.
   `https://tu-usuario.github.io`).
5. Render te da una URL tipo `https://profilegaming-backend.onrender.com`.

> Nota: el plan gratis de Render "duerme" el servidor si no recibe tráfico
> por un rato, y tarda ~30 segundos en despertar con el primer pedido. Es
> normal y esperable en un plan gratuito.

### Conectar ambos
En `frontend/script.js`, cambiá:
```js
const API_BASE_URL = "https://profilegaming-backend.onrender.com";
```
y volvé a subir ese archivo a GitHub Pages.

**Sobre el archivo JSON en Render**: el disco de la capa gratuita no es
permanente (se borra en cada redeploy). Para este experimento alcanza, pero
si querés que los datos persistan de verdad, el siguiente paso natural es
una base de datos Postgres gratis en [Supabase](https://supabase.com) o
[Neon](https://neon.tech): la lógica de "una fila por IP+juego" sería
prácticamente la misma, solo cambiarías `db.js` por consultas SQL.

---

## 4. Las ideas de seguridad que ya están aplicadas (y por qué)

| Medida | Dónde | Por qué |
|---|---|---|
| Hash de la IP, no la IP en texto plano | `server.js` → `hashIP()` | Si alguien accede a la base de datos, no ve IPs reales, solo un hash. Más respetuoso con la privacidad. |
| "Sal" (salt) secreta en el hash | `.env` → `IP_SALT` | Sin la sal, alguien podría precalcular hashes de IPs comunes y "adivinar" quién votó. |
| Un voto por (IP + juego) | `db.js` → `addVoteIfNew()` | Es la regla central del experimento: nadie repite voto. |
| Rate limiting (30 pedidos/min) | `server.js` → `express-rate-limit` | Evita que un script bombardee tu API con miles de pedidos. |
| Validación de datos de entrada | `server.js` (listas `VALID_GAMES`, `VALID_SEASONS`) | Nunca confiés en lo que manda el navegador: alguien podría mandar cualquier cosa con curl o Postman, no solo desde tu formulario. |
| CORS restringido | `server.js` → `cors()` | Solo tu dominio de frontend puede llamar a la API, no cualquier página. |
| Cabeceras seguras | `server.js` → `helmet()` | Protege contra varios ataques comunes del navegador (XSS, sniffing de MIME, etc.) con una sola línea. |
| Variables de entorno (`.env`) | `.env`, `.gitignore` | Los secretos (sal, orígenes permitidos) nunca quedan escritos en el código ni se suben a GitHub. |
| HTTPS automático | Lo da gratis GitHub Pages / Render | No tenés que configurar certificados a mano. |
| Límite de tamaño del body | `server.js` → `express.json({ limit: "10kb" })` | Evita que te manden payloads gigantes para saturar el servidor. |

### Importante sobre el bloqueo "por IP"
Es una medida razonable para un experimento informal, pero no es perfecta:
una misma persona puede votar dos veces si cambia de red (wifi → datos
móviles) o usa una VPN, y varias personas en la misma red (una casa, una
universidad) comparten la misma IP pública y solo una podrá votar. Si más
adelante querés algo más robusto, se combina con otras señales (cookies +
fingerprint del navegador, o login simple), pero ya entra en compromisos de
privacidad que conviene pensar con cuidado y, si es un experimento real con
participantes, contárselo claramente (por eso el aviso de privacidad en la
página).

---

## 5. Logo y derechos de autor

El logo personal está en `frontend/assets/logo.png` y se usa en tres lugares:

- **Encabezado**: junto al nombre del sitio.
- **Pie de página**: junto al aviso "© [año] ProfileGaming. Todos los derechos reservados." (el año se actualiza solo, vía `script.js`).
- **Marca de agua**: una versión muy tenue (8% de opacidad), fija en la esquina inferior derecha, visible en toda la página (clase `.watermark` en `style.css`).

Si en algún momento cambiás el logo, solo tenés que reemplazar el archivo
`frontend/assets/logo.png` por el nuevo (mismo nombre) y se actualiza en los
tres lugares automáticamente.

> Nota legal informal: poner "© [año] [nombre]" en el sitio es una forma
> habitual de declarar autoría, pero no reemplaza un registro formal de marca
> o derechos de autor si en algún momento buscás protección legal más fuerte.
> Para un proyecto educativo/personal como este, es más que suficiente.

## 6. Cómo seguir agregando mini juegos

La estructura está pensada para que sumes secciones nuevas siguiendo el
mismo patrón:

1. **Frontend**: agregás un `<section class="panel">` nuevo en `index.html`
   con su formulario, y un bloque en `script.js` que haga `fetch` a una
   ruta nueva.
2. **Backend**: agregás una ruta nueva en `server.js` (ej. `/api/genero-favorito`)
   que valide los datos y llame a `addVoteIfNew()` con un `type` distinto.
3. **Listo**: la misma micro base de datos guarda todo, diferenciado por `type`.

Ideas de mini juegos para sumar:
- "¿Plataforma favorita?" (PC / consola / mobile) con gráfico de torta.
- "Adivina el año de lanzamiento" de un juego (con puntaje de aciertos).
- "Tier list" donde el usuario arrastra juegos a categorías S/A/B/C.

---

## 7. Próximos pasos para aprender más

- **Frontend**: practicá CSS Grid/Flexbox modificando `style.css`.
- **Backend**: agregá un endpoint `DELETE` para que un admin pueda borrar
  votos (con una contraseña simple en `.env`, por ejemplo).
- **Base de datos**: migrá `db.js` de JSON a SQLite (`better-sqlite3`) sin
  cambiar las rutas de `server.js`: buen ejercicio de "separar capas".
- **Ciberseguridad**: investigá qué es un ataque de *fuerza bruta*, por qué
  el rate limiting ayuda, y qué es OWASP Top 10 (lista de los riesgos web
  más comunes) como siguiente lectura.
