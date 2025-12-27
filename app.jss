const statusEl = document.getElementById("status");
function setStatus(msg, isErr=false){
  statusEl.textContent = "Status: " + msg;
  statusEl.style.borderColor = isErr ? "rgba(255,90,90,0.5)" : "rgba(255,255,255,0.10)";
  statusEl.style.background = isErr ? "rgba(255,90,90,0.10)" : "rgba(255,255,255,0.06)";
}

function getBaseUrl(){
  const { origin, hostname, pathname } = window.location;
  if (hostname.endsWith("github.io")){
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length >= 1) return `${origin}/${parts[0]}`;
  }
  return origin;
}
const BASE = getBaseUrl();
const cacheBust = () => `cb=${Date.now()}`;

// UI
const xInput = document.getElementById("xInput");
const yInput = document.getElementById("yInput");
const setBtn  = document.getElementById("setBtn");
const clearBtn= document.getElementById("clearBtn");

const mapImg = document.getElementById("mapImg");
const marker = document.getElementById("marker");
const lcHud = document.getElementById("lcHud");

const uiMap = document.getElementById("uiMap");
const uiRange = document.getElementById("uiRange");
const uiHover = document.getElementById("uiHover");
const uiMarker = document.getElementById("uiMarker");

const pillName = document.getElementById("pillName");
const pillSize = document.getElementById("pillSize");
const mapFooter = document.getElementById("mapFooter");

const tabs = Array.from(document.querySelectorAll(".tab"));

let maps = [];
let current = null;
let markerByMap = {}; // {id:{x,y}}

function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

function fmtXY(x,y){
  // In-Game Optik: "1143, 951"
  return `${x}, ${y}`;
}
function setHover(x,y){
  const t = `X: ${x} | Y: ${y}`;
  uiHover.textContent = t;
  lcHud.textContent = fmtXY(x,y);
}
function clearHover(){
  uiHover.textContent = "—";
  lcHud.textContent = "—";
}
function setMarkerText(x,y){
  uiMarker.textContent = `X: ${x} | Y: ${y}`;
}
function clearMarkerText(){
  uiMarker.textContent = "—";
}

function setActiveTab(id){
  tabs.forEach(b => b.classList.toggle("is-active", b.dataset.map === id));
}

function toCoords(clientX, clientY){
  const rect = mapImg.getBoundingClientRect();
  const rx = clientX - rect.left;
  const ry = clientY - rect.top;
  const inside = rx>=0 && ry>=0 && rx<=rect.width && ry<=rect.height;

  const nx = clamp(rx / rect.width, 0, 1);
  const ny = clamp(ry / rect.height, 0, 1);

  const size = current?.size ?? 1500;
  const x = Math.round(nx * size);
  const y = Math.round(ny * size);
  return {x,y,inside};
}

function placeMarker(x,y,save=true){
  if(!current) return;
  const size = current.size;
  const cx = clamp(Math.round(Number(x)), 0, size);
  const cy = clamp(Math.round(Number(y)), 0, size);

  marker.style.left = `${(cx/size)*100}%`;
  marker.style.top  = `${(cy/size)*100}%`;
  marker.style.display = "block";

  setMarkerText(cx,cy);
  if(save) markerByMap[current.id] = {x:cx, y:cy};
}

function clearMarker(save=true){
  marker.style.display = "none";
  clearMarkerText();
  if(save && current) delete markerByMap[current.id];
}

function applyMap(m){
  current = m;
  setActiveTab(m.id);

  uiMap.textContent = m.name;
  uiRange.textContent = `0–${m.size}`;
  pillName.textContent = m.name;
  pillSize.textContent = `${m.size}×${m.size}`;
  mapFooter.textContent = `0,0 oben links • ${m.size},${m.size} unten rechts`;

  xInput.min = 0; xInput.max = m.size;
  yInput.min = 0; yInput.max = m.size;

  clearHover();

  const imgUrl = `${BASE}/maps/${m.file}?${cacheBust()}`;
  setStatus(`lade Bild: ${imgUrl}`);

  mapImg.onload = () => setStatus(`Bild geladen ✅ (${m.name})`);
  mapImg.onerror = () => setStatus(`Bild FEHLT ❌ (URL liefert kein Bild): ${imgUrl}`, true);
  mapImg.src = imgUrl;

  const saved = markerByMap[m.id];
  if(saved){
    xInput.value = saved.x;
    yInput.value = saved.y;
    placeMarker(saved.x, saved.y, false);
  } else {
    xInput.value = "";
    yInput.value = "";
    clearMarker(false);
  }
}

async function loadMaps(){
  const jsonUrl = `${BASE}/maps/maps.json?${cacheBust()}`;
  setStatus(`lade maps.json: ${jsonUrl}`);

  const res = await fetch(jsonUrl, { cache: "no-store" });
  if(!res.ok){
    setStatus(`maps.json Fehler HTTP ${res.status} (Pages/Ordner stimmt nicht)`, true);
    return;
  }

  maps = await res.json();

  const juno = maps.find(x => x.id === "juno");
  applyMap(juno || maps[0]);
}

// Tabs
tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.map;
    const m = maps.find(x => x.id === id);
    if(m) applyMap(m);
  });
});

// Hover / Click
mapImg.addEventListener("mousemove", (e) => {
  if(!current) return;
  const {x,y,inside} = toCoords(e.clientX, e.clientY);
  if(!inside) return;
  setHover(x,y);
});
mapImg.addEventListener("mouseleave", () => clearHover());

mapImg.addEventListener("click", (e) => {
  if(!current) return;
  const {x,y,inside} = toCoords(e.clientX, e.clientY);
  if(!inside) return;
  xInput.value = x;
  yInput.value = y;
  placeMarker(x,y,true);
});

// Manual input
setBtn.addEventListener("click", () => {
  if(!current) return;
  const x = Number(xInput.value);
  const y = Number(yInput.value);
  if(!Number.isFinite(x) || !Number.isFinite(y)) return;
  placeMarker(x,y,true);
});

clearBtn.addEventListener("click", () => {
  clearMarker(true);
  xInput.value = "";
  yInput.value = "";
});

[xInput, yInput].forEach(inp => {
  inp.addEventListener("keydown", (e) => {
    if(e.key === "Enter") setBtn.click();
  });
});

// Start
loadMaps().catch(err => {
  console.error(err);
  setStatus("JS Crash: " + (err?.message || err), true);
});
