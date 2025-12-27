const VERSION = "200";
const statusEl = document.getElementById("status");

function setStatus(msg, isError = false) {
  if (!statusEl) return;
  statusEl.textContent = "Status: " + msg;
  statusEl.style.borderColor = isError ? "rgba(255,90,90,0.5)" : "rgba(255,255,255,0.10)";
  statusEl.style.background = isError ? "rgba(255,90,90,0.10)" : "rgba(255,255,255,0.06)";
}

window.addEventListener("error", (e) => {
  setStatus("JS-Fehler: " + (e?.message || "unknown"), true);
});

setStatus("JS geladen ✅");

const xInput = document.getElementById("xInput");
const yInput = document.getElementById("yInput");
const markBtn = document.getElementById("markBtn");
const clearBtn = document.getElementById("clearBtn");

const mapImg = document.getElementById("mapImg");
const marker = document.getElementById("marker");

const hoverText = document.getElementById("hoverText");
const markerText = document.getElementById("markerText");

const mapName = document.getElementById("mapName");
const mapSizeText = document.getElementById("mapSizeText");

const chipMap = document.getElementById("chipMap");
const chipSize = document.getElementById("chipSize");
const hoverBadge = document.getElementById("hoverBadge");
const footerRange = document.getElementById("footerRange");

const tabButtons = Array.from(document.querySelectorAll(".tab"));

let maps = [];
let currentMap = null;
let markersByMap = {};

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function roundInt(n) { return Math.round(Number(n)); }

function setHoverUI(x, y) {
  const s = `X: ${x} | Y: ${y}`;
  hoverText.textContent = s;
  hoverBadge.textContent = s;
}
function clearHoverUI() {
  hoverText.textContent = "X: – | Y: –";
  hoverBadge.textContent = "X: – | Y: –";
}
function setMarkerUI(x, y) { markerText.textContent = `X: ${x} | Y: ${y}`; }
function clearMarkerUI() { markerText.textContent = "–"; }

function toMapCoords(clientX, clientY) {
  const rect = mapImg.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  const inside = relX >= 0 && relY >= 0 && relX <= rect.width && relY <= rect.height;

  const nx = clamp(relX / rect.width, 0, 1);
  const ny = clamp(relY / rect.height, 0, 1);

  const size = currentMap?.size ?? 1500;
  const x = Math.round(nx * size);
  const y = Math.round(ny * size);

  return { x, y, inside };
}

function placeMarker(x, y, save = true) {
  if (!currentMap) return;
  const size = currentMap.size;

  const cx = clamp(roundInt(x), 0, size);
  const cy = clamp(roundInt(y), 0, size);

  marker.style.left = `${(cx / size) * 100}%`;
  marker.style.top  = `${(cy / size) * 100}%`;
  marker.style.display = "block";

  setMarkerUI(cx, cy);
  if (save) markersByMap[currentMap.id] = { x: cx, y: cy };
}

function hideMarker(save = true) {
  marker.style.display = "none";
  clearMarkerUI();
  if (save && currentMap) delete markersByMap[currentMap.id];
}

function setActiveTab(mapId) {
  tabButtons.forEach(btn => btn.classList.toggle("is-active", btn.dataset.map === mapId));
}

function applyMap(mapObj) {
  currentMap = mapObj;

  setActiveTab(currentMap.id);

  mapName.textContent = currentMap.name;
  chipMap.textContent = currentMap.name;

  mapSizeText.textContent = `0–${currentMap.size}`;
  chipSize.textContent = `${currentMap.size}×${currentMap.size}`;
  footerRange.textContent = `${currentMap.size},${currentMap.size} unten rechts`;

  xInput.min = 0; xInput.max = currentMap.size;
  yInput.min = 0; yInput.max = currentMap.size;

  const imgUrl = new URL(`maps/${currentMap.file}`, document.baseURI).href + `?v=${VERSION}`;
  mapImg.src = imgUrl;
  mapImg.alt = currentMap.name;

  setStatus(`Lade Bild: ${imgUrl}`);

  mapImg.onload = () => setStatus(`Bild geladen ✅ (${currentMap.name})`);
  mapImg.onerror = () => setStatus(`Bild FEHLT ❌ URL nicht erreichbar: ${imgUrl}`, true);

  clearHoverUI();

  const m = markersByMap[currentMap.id];
  if (m) {
    placeMarker(m.x, m.y, false);
    xInput.value = m.x;
    yInput.value = m.y;
  } else {
    hideMarker(false);
    xInput.value = "";
    yInput.value = "";
  }
}

async function loadMaps() {
  const jsonUrl = new URL("maps/maps.json", document.baseURI).href + `?v=${VERSION}`;
  setStatus(`Lade maps.json: ${jsonUrl}`);

  const res = await fetch(jsonUrl, { cache: "no-store" });
  if (!res.ok) throw new Error("maps.json HTTP " + res.status);

  maps = await res.json();

  const juno = maps.find(m => m.id === "juno");
  applyMap(juno ?? maps[0]);
}

// Tabs
tabButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    if (!maps.length) {
      setStatus("Maps noch nicht geladen (maps.json fehlte?)", true);
      return;
    }
    const id = btn.dataset.map;
    const m = maps.find(x => x.id === id);
    if (m) applyMap(m);
  });
});

// Hover + click marker
mapImg.addEventListener("mousemove", (e) => {
  if (!currentMap) return;
  const { x, y, inside } = toMapCoords(e.clientX, e.clientY);
  if (!inside) return;
  setHoverUI(x, y);
});
mapImg.addEventListener("mouseleave", () => clearHoverUI());

mapImg.addEventListener("click", (e) => {
  if (!currentMap) return;
  const { x, y, inside } = toMapCoords(e.clientX, e.clientY);
  if (!inside) return;
  placeMarker(x, y, true);
  xInput.value = x;
  yInput.value = y;
});

markBtn.addEventListener("click", () => {
  if (!currentMap) return;
  const x = Number(xInput.value);
  const y = Number(yInput.value);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  placeMarker(x, y, true);
});

clearBtn.addEventListener("click", () => {
  hideMarker(true);
  xInput.value = "";
  yInput.value = "";
});

[xInput, yInput].forEach(inp => {
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") markBtn.click();
  });
});

// Start
loadMaps().catch(err => {
  console.error(err);
  setStatus("Fehler beim Laden: " + (err?.message || err), true);
});
