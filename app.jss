const mapSelect = document.getElementById("mapSelect");
const mapImg = document.getElementById("mapImg");
const mapWrap = document.getElementById("mapWrap");

const hud = document.getElementById("hud");
const hoverText = document.getElementById("hoverText");
const markerText = document.getElementById("markerText");

const xInput = document.getElementById("xInput");
const yInput = document.getElementById("yInput");
const markBtn = document.getElementById("markBtn");
const clearBtn = document.getElementById("clearBtn");
const marker = document.getElementById("marker");

let maps = [];
let currentMap = null; // {id,name,file,size}
let currentMarker = null; // {x,y}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function toMapCoords(clientX, clientY) {
  const rect = mapImg.getBoundingClientRect();
  const relX = clientX - rect.left;
  const relY = clientY - rect.top;

  const nx = clamp(relX / rect.width, 0, 1);
  const ny = clamp(relY / rect.height, 0, 1);

  const size = currentMap?.size ?? 1500;
  const x = Math.round(nx * size);
  const y = Math.round(ny * size);

  return { x, y, nx, ny, inside: relX >= 0 && relY >= 0 && relX <= rect.width && relY <= rect.height };
}

function setHud(x, y) {
  hud.innerHTML = `X: <b>${x}</b><br>Y: <b>${y}</b>`;
  hoverText.textContent = `X: ${x} | Y: ${y}`;
}

function clearHud() {
  hud.innerHTML = "X: –<br>Y: –";
  hoverText.textContent = "X: – | Y: –";
}

function setMarker(x, y) {
  const size = currentMap?.size ?? 1500;
  const cx = clamp(x, 0, size);
  const cy = clamp(y, 0, size);

  const px = (cx / size) * 100;
  const py = (cy / size) * 100;

  marker.style.left = `${px}%`;
  marker.style.top = `${py}%`;
  marker.style.display = "block";

  currentMarker = { x: cx, y: cy };
  markerText.textContent = `X: ${cx} | Y: ${cy}`;
}

function clearMarker() {
  marker.style.display = "none";
  currentMarker = null;
  markerText.textContent = "–";
}

function applyMap(mapObj) {
  currentMap = mapObj;

  // Update input ranges to map size
  const size = currentMap?.size ?? 1500;
  xInput.min = 0; xInput.max = size;
  yInput.min = 0; yInput.max = size;

  // Load image
  mapImg.src = `maps/${currentMap.file}`;
  mapImg.alt = currentMap.name;

  // reset UI
  clearHud();
  clearMarker();
  xInput.value = "";
  yInput.value = "";
}

async function loadMaps() {
  const res = await fetch("maps/maps.json", { cache: "no-store" });
  maps = await res.json();

  mapSelect.innerHTML = "";
  for (const m of maps) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    mapSelect.appendChild(opt);
  }

  // Default: first map
  if (maps.length > 0) {
    applyMap(maps[0]);
  }
}

// Events
mapSelect.addEventListener("change", () => {
  const id = mapSelect.value;
  const m = maps.find(x => x.id === id);
  if (m) applyMap(m);
});

mapImg.addEventListener("mousemove", (e) => {
  if (!currentMap) return;
  const { x, y, inside } = toMapCoords(e.clientX, e.clientY);
  if (!inside) return;
  setHud(x, y);
});

mapImg.addEventListener("mouseleave", () => {
  clearHud();
});

mapImg.addEventListener("click", (e) => {
  if (!currentMap) return;
  const { x, y, inside } = toMapCoords(e.clientX, e.clientY);
  if (!inside) return;

  // set marker + fill inputs
  setMarker(x, y);
  xInput.value = x;
  yInput.value = y;
});

markBtn.addEventListener("click", () => {
  if (!currentMap) return;
  const size = currentMap.size ?? 1500;

  const x = Number(xInput.value);
  const y = Number(yInput.value);

  if (!Number.isFinite(x) || !Number.isFinite(y)) return;

  setMarker(clamp(Math.round(x), 0, size), clamp(Math.round(y), 0, size));
});

clearBtn.addEventListener("click", () => {
  clearMarker();
});

// Enter in inputs => mark
[xInput, yInput].forEach(inp => {
  inp.addEventListener("keydown", (e) => {
    if (e.key === "Enter") markBtn.click();
  });
});

// Start
loadMaps().catch(err => {
  console.error(err);
  alert("Konnte maps/maps.json nicht laden. Prüfe Pfade & Webserver.");
});
