import * as THREE from "./vendor/three.module.js";
import { CSS3DRenderer, CSS3DObject } from "./vendor/CSS3DRenderer.js";
import { FRAMES } from "./frames.js";

const FOV = 40;
const PANEL = 260; // left Frames panel, px
const SLAB = 28;
const $ = (id) => document.getElementById(id);

/* ---------- layout: two rows of frames ---------- */
const GAP = 170, PER_ROW = 5, ROW_GAP = 1240;
let cursor = 0;
FRAMES.forEach((f, i) => {
  if (i % PER_ROW === 0) cursor = 0;
  f.x = cursor;
  f.y = Math.floor(i / PER_ROW) * ROW_GAP;
  cursor += f.w + GAP;
  f.cx = f.x + f.w / 2;
  f.cy = -(f.y + f.h / 2);
});

/* ---------- renderers and scenes ---------- */
const glScene = new THREE.Scene();
const cssScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 10, 200000);
const gl = new THREE.WebGLRenderer({ antialias: true, alpha: true });
gl.setPixelRatio(Math.min(devicePixelRatio, 2));
$("gl").appendChild(gl.domElement);
const css = new CSS3DRenderer();
css.domElement.style.position = "absolute";
css.domElement.style.inset = "0";
$("css").appendChild(css.domElement);

/* dot grid */
const dotMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uColor: { value: new THREE.Color("#c4c9cf") }, uZoom: { value: 1 } },
  vertexShader: "varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
  fragmentShader: "varying vec2 vP; uniform vec3 uColor; uniform float uZoom; void main(){ float sp = uZoom < 0.3 ? 160.0 : 40.0; vec2 g = mod(vP, sp) - sp*0.5; float r = max(1.2, 1.0/uZoom); float a = 1.0 - smoothstep(r - 0.6, r + 0.6, length(g)); if(a < 0.02) discard; gl_FragColor = vec4(uColor, a); }",
});
const grid = new THREE.Mesh(new THREE.PlaneGeometry(60000, 40000), dotMat);
grid.position.set(4000, -2400, -60);
glScene.add(grid);

/* frames: html layer + wireframe slab + flow arrows */
const SKY = 0x0d99ff;
const frameObjs = FRAMES.map((f) => {
  const el = document.createElement("div");
  el.className = "frame";
  el.style.width = f.w + "px";
  el.style.height = f.h + "px";
  el.innerHTML = f.html;
  const obj = new CSS3DObject(el);
  obj.position.set(f.cx, f.cy, SLAB / 2 + 1);
  cssScene.add(obj);

  const lab = document.createElement("div");
  lab.className = "flabel";
  lab.style.width = f.w + "px";
  lab.style.textAlign = "left";
  lab.innerHTML = "<b>" + f.n + "</b>" + f.t + " · " + f.w + " × " + f.h;
  const lo = new CSS3DObject(lab);
  lo.position.set(f.cx, -(f.y - 22), 0);
  cssScene.add(lo);

  const box = new THREE.BoxGeometry(f.w, f.h, SLAB);
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: SKY }));
  edges.position.set(f.cx, f.cy, 0);
  glScene.add(edges);
  return { f, el };
});

const flowMat = new THREE.LineDashedMaterial({ color: SKY, dashSize: 18, gapSize: 12 });
FRAMES.forEach((f, i) => {
  const n = FRAMES[i + 1];
  if (!n || (i + 1) % PER_ROW === 0) return;
  const a = new THREE.Vector3(f.x + f.w + 6, f.cy, 0);
  const b = new THREE.Vector3(n.x - 6, n.cy, 0);
  const curve = new THREE.LineCurve3(a, b);
  const g = new THREE.BufferGeometry().setFromPoints(curve.getPoints(2));
  const line = new THREE.Line(g, flowMat);
  line.computeLineDistances();
  glScene.add(line);
  const head = new THREE.Mesh(new THREE.ConeGeometry(9, 22, 3), new THREE.MeshBasicMaterial({ color: SKY }));
  head.rotation.z = -Math.PI / 2;
  head.position.set(b.x - 6, b.y, 0);
  glScene.add(head);
});

/* ---------- camera / view state ---------- */
const view = { x: 0, y: 0, zoom: 1, az: 0, el: 0 };
const target = { x: 0, y: 0, zoom: 1, az: 0, el: 0 };
let dirty = true;

function distFor(zoom) { return (innerHeight / 2) / Math.tan((FOV * Math.PI) / 360) / zoom; }

function applyCamera() {
  const d = distFor(view.zoom);
  const dir = new THREE.Vector3(Math.sin(view.az) * Math.cos(view.el), Math.sin(view.el), Math.cos(view.az) * Math.cos(view.el));
  camera.position.set(view.x + dir.x * d, view.y + dir.y * d, dir.z * d);
  camera.lookAt(view.x, view.y, 0);
  camera.updateMatrixWorld();
  dotMat.uniforms.uZoom.value = view.zoom;
  $("zoomPct").textContent = Math.round(view.zoom * 100) + "%";
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  gl.setSize(innerWidth, innerHeight);
  css.setSize(innerWidth, innerHeight);
  dirty = true;
}
addEventListener("resize", resize);

function tick() {
  const k = 0.16;
  let moving = false;
  for (const p of ["x", "y", "zoom", "az", "el"]) {
    const d = target[p] - view[p];
    const eps = p === "zoom" ? 0.0005 : p === "az" || p === "el" ? 0.0008 : 0.05;
    if (Math.abs(d) > eps) { view[p] += d * k; moving = true; } else view[p] = target[p];
  }
  if (moving || dirty) {
    applyCamera();
    gl.render(glScene, camera);
    css.render(cssScene, camera);
    dirty = moving;
  }
  requestAnimationFrame(tick);
}

function fitBox(x0, y0, x1, y1, pad = 0.9) {
  const w = x1 - x0, h = y1 - y0;
  const z = Math.min((innerWidth - PANEL - 40) / w, (innerHeight - 110) / h) * pad;
  target.zoom = z;
  target.x = (x0 + x1) / 2 - (PANEL / 2) / z;
  target.y = -((y0 + y1) / 2) - 18 / z;
  dirty = true;
}
let activeIdx = 0;
function fitFrame(i) {
  activeIdx = (i + FRAMES.length) % FRAMES.length;
  const f = FRAMES[activeIdx];
  fitBox(f.x, f.y, f.x + f.w, f.y + f.h);
  markActive();
}
function fitAll() {
  const x1 = Math.max(...FRAMES.map((f) => f.x + f.w));
  const y1 = Math.max(...FRAMES.map((f) => f.y + f.h));
  fitBox(0, -40, x1, y1, 0.96);
  activeIdx = -1;
  markActive();
}

/* ---------- HUD: frames list ---------- */
const layers = $("layers");
FRAMES.forEach((f, i) => {
  const b = document.createElement("button");
  b.innerHTML = '<span class="n">' + f.n + "</span><i></i>" + f.t;
  b.addEventListener("click", () => fitFrame(i));
  layers.appendChild(b);
});
function markActive() {
  [...layers.querySelectorAll("button")].forEach((b, i) => b.classList.toggle("on", i === activeIdx));
}

/* ---------- interaction ---------- */
const ptrs = new Map();
let lastPinch = 0;
addEventListener("pointerdown", (e) => {
  if (e.target.closest(".hud")) return;
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  document.body.style.cursor = "grabbing";
});
addEventListener("pointermove", (e) => {
  const p = ptrs.get(e.pointerId);
  if (!p) return;
  if (ptrs.size === 2) {
    const [a, b] = [...ptrs.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if (lastPinch) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / lastPinch);
    lastPinch = d;
    p.x = e.clientX; p.y = e.clientY;
    return;
  }
  const dx = e.clientX - p.x, dy = e.clientY - p.y;
  p.x = e.clientX; p.y = e.clientY;
  target.x -= dx / view.zoom; target.y += dy / view.zoom;
  view.x = target.x; view.y = target.y;
  dirty = true;
});
function endPtr(e) { ptrs.delete(e.pointerId); lastPinch = 0; if (!ptrs.size) document.body.style.cursor = ""; }
addEventListener("pointerup", endPtr);
addEventListener("pointercancel", endPtr);

function zoomAt(px, py, factor) {
  const z0 = target.zoom;
  const z1 = Math.min(3, Math.max(0.04, z0 * factor));
  if (target.az === 0 && target.el === 0) {
    const wx = target.x + (px - innerWidth / 2) / z0;
    const wy = target.y - (py - innerHeight / 2) / z0;
    target.x = wx - (px - innerWidth / 2) / z1;
    target.y = wy + (py - innerHeight / 2) / z1;
    view.x = target.x; view.y = target.y;
  }
  target.zoom = z1; view.zoom = z1;
  dirty = true;
}
addEventListener("wheel", (e) => {
  if (e.target.closest(".hud")) return;
  e.preventDefault();
  zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)));
}, { passive: false });

addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "]") fitFrame(activeIdx + 1);
  else if (e.key === "ArrowLeft" || e.key === "[") fitFrame(activeIdx < 0 ? 0 : activeIdx - 1);
  else if (e.key === "0") fitAll();
  else if (e.key === "+" || e.key === "=") zoomAt(innerWidth / 2, innerHeight / 2, 1.25);
  else if (e.key === "-") zoomAt(innerWidth / 2, innerHeight / 2, 0.8);
});

$("fitAll").onclick = fitAll;
$("zoomIn").onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, 1.25);
$("zoomOut").onclick = () => zoomAt(innerWidth / 2, innerHeight / 2, 0.8);

function setMode(styled) {
  document.body.classList.toggle("styled", styled);
  $("modeStyled").classList.toggle("on", styled);
  $("modeWire").classList.toggle("on", !styled);
  try { localStorage.setItem("adm.mode", styled ? "styled" : "wire"); } catch (e) { /* storage blocked */ }
  dirty = true;
}
$("modeWire").onclick = () => setMode(false);
$("modeStyled").onclick = () => setMode(true);

function setDark(dark) {
  document.body.classList.toggle("dark", dark);
  $("themeBtn").textContent = dark ? "Light" : "Dark";
  dotMat.uniforms.uColor.value.set(dark ? "#34363b" : "#c4c9cf");
  try { localStorage.setItem("adm.dark", dark ? "1" : "0"); } catch (e) { /* storage blocked */ }
  dirty = true;
}
$("themeBtn").onclick = () => setDark(!document.body.classList.contains("dark"));

let exploded = false;
function setExploded(on) {
  exploded = on;
  document.body.classList.toggle("exploded", on);
  $("explodeBtn").classList.toggle("on", on);
  target.az = on ? 0.5 : 0;
  target.el = on ? 0.42 : 0;
  dirty = true;
}
$("explodeBtn").onclick = () => setExploded(!exploded);

/* ---------- boot ---------- */
resize();
try {
  setMode(localStorage.getItem("adm.mode") === "styled");
  setDark(localStorage.getItem("adm.dark") === "1");
} catch (e) { /* storage blocked */ }
const startHash = Number((location.hash.match(/#f(\d+)/) || [])[1]);
fitFrame(Number.isFinite(startHash) ? startHash : 0);
view.x = target.x; view.y = target.y; view.zoom = target.zoom;
requestAnimationFrame(tick);
window.__adm = { view, target, fitFrame, fitAll, setExploded, setMode, setDark, FRAMES };
