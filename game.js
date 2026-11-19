import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js';

const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), overlay: $('overlay'), copy: $('overlay-copy'), start: $('start-button'),
  health: $('health'), healthBar: $('health-bar'), oxygen: $('oxygen'), oxygenBar: $('oxygen-bar'),
  ammo: $('ammo'), reserve: $('reserve'), objective: $('objective'), progress: $('progress'), guidance: $('guidance'),
  prompt: $('prompt'), notice: $('notice'), damage: $('damage-flash'),
};
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202c36);
scene.fog = new THREE.FogExp2(0x2b3d45, 0.013);
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.07, 200);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
$('game').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb5d8e5, 0x352219, 1.6));
const sun = new THREE.DirectionalLight(0xf9b48b, 2.2);
sun.position.set(-25, 42, -35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
scene.add(sun);

const earth = new THREE.Group();
const mars = new THREE.Group();
scene.add(earth, mars);
mars.visible = false;
const mat = (color, metalness = 0, roughness = 1, emissive = 0x000000, intensity = 0) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: intensity });
const groundMat = mat(0x353c3b), concrete = mat(0x566161), darkMetal = mat(0x26343b, .65, .5);
const rust = mat(0x965b45, .2), glass = mat(0x29494e, .45, .25), alienMat = mat(0x253d39, .25, .7);
const glowMat = mat(0x9cebd2, .1, .35, 0x47ffcc, 2.4);
const orangeGlow = mat(0xf0a062, .1, .4, 0xff6b30, 1.7);
const block = (parent, w, h, d, x, y, z, material, cast = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
};
const sphere = (parent, r, x, y, z, material, segments = 12) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, segments, 8), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
};
const cylinder = (parent, rt, rb, h, x, y, z, material, segments = 10) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
};
const ground = block(earth, 82, .35, 112, 0, -.22, 0, groundMat, false);
ground.receiveShadow = true;
const grid = new THREE.GridHelper(82, 41, 0x4a6663, 0x43504f);
grid.position.y = -.035; earth.add(grid);

const obstacles = [];
function ruin(x, z, w, d, h) {
  const b = block(earth, w, h, d, x, h / 2, z, concrete);
  obstacles.push({ x, z, w, d, mesh: b });
  block(earth, w + .2, .22, d + .2, x, h + .08, z, rust);
  for (let y = 1.6; y < h - .3; y += 2.2) {
    block(earth, .08, .85, .75, x + w / 2 + .05, y, z - d * .22, glass, false);
  }
}
ruin(-31, -21, 10, 22, 10);
ruin(30, -10, 10, 28, 13);
ruin(-28, 19, 12, 13, 8);
ruin(29, 27, 10, 15, 9);
ruin(-9, -4, 7, 9, 5);
ruin(10, 13, 8, 9, 4);
for (const [x, z, w, d] of [[-14, 23, 3, 3], [15, 31, 4, 3], [-21, -7, 3, 3], [18, -24, 4, 3], [3, -20, 3, 3]]) {
  const b = block(earth, w, 2, d, x, 1, z, rust);
  obstacles.push({ x, z, w, d, mesh: b });
  block(earth, w - .2, .12, d - .2, x, 2.1, z, darkMetal);
}
// The high walls make the mission boundary clear without an invisible edge.
block(earth, 82, 8, 1, 0, 4, -55, darkMetal);
block(earth, 82, 8, 1, 0, 4, 55, darkMetal);
block(earth, 1, 8, 110, -41, 4, 0, darkMetal);
block(earth, 1, 8, 110, 41, 4, 0, darkMetal);
for (let i = 0; i < 22; i++) {
  const x = (i * 31 % 75) - 37, z = (i * 47 % 101) - 50;
  if (Math.abs(x) < 8 && z > 28) continue;
  const debris = block(earth, 1.2 + (i % 3), .25 + (i % 4) * .18, .7 + (i % 5) * .2, x, .2, z, i % 2 ? rust : concrete, false);
  debris.rotation.y = i * 1.7;
}
// Alien growth gives the ruined Earth its own visual identity.
for (const [x, z, s] of [[-22, 4, 1], [23, -36, 1.3], [-13, -29, .8], [33, 8, 1.1], [2, 43, .7]]) {
  for (let i = 0; i < 5; i++) {
    const c = cylinder(earth, .07, .55, (2 + i * .7) * s, x + Math.sin(i * 2) * .7, (1 + i * .35) * s, z + Math.cos(i * 2) * .7, alienMat, 5);
    c.rotation.z = Math.sin(i * 2) * .3;
    c.rotation.x = Math.cos(i * 2) * .3;
  }
  sphere(earth, .52 * s, x, 1.2 * s, z, glowMat);
  const light = new THREE.PointLight(0x52ffc7, 4, 7 * s);
  light.position.set(x, 1.7 * s, z); earth.add(light);
}
// A simple launch vehicle at the north end of the map.
const ship = new THREE.Group();
ship.position.set(0, 0, -43);
earth.add(ship);
cylinder(ship, 2.2, 3.4, 10, 0, 5.5, 0, mat(0xb9c9c7, .6, .4), 12);
const nose = new THREE.Mesh(new THREE.ConeGeometry(2.2, 4.5, 12), mat(0xdeddd0, .35, .45));
nose.position.y = 12.75; nose.castShadow = true; ship.add(nose);
for (const side of [-1, 1]) {
  const fin = block(ship, 2.7, 4.5, .4, side * 3, 2.1, 0, rust);
  fin.rotation.z = side * .22;
}
block(ship, 1.5, 2.5, .12, 0, 2.4, 2.25, darkMetal);
block(ship, 1.2, .12, .16, 0, 3.1, 2.35, glowMat, false);
const beacon = new THREE.PointLight(0xff9b65, 7, 19);
beacon.position.set(0, 6, -42); earth.add(beacon);
const shipPad = block(earth, 14, .35, 13, 0, -.05, -43, darkMetal, false);
shipPad.receiveShadow = true;

const coreSites = [[-18, 1], [18, -13], [-17, -36]];
let cores = [];
function makeCore(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  cylinder(g, .95, 1.1, .55, 0, .28, 0, darkMetal);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(.62), glowMat);
  crystal.position.y = 1.25; g.add(crystal);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.85, .08, 6, 20), mat(0x79e8ce, .6, .3, 0x42ffbb, 1));
  ring.rotation.x = Math.PI / 2; ring.position.y = 1.25; g.add(ring);
  const light = new THREE.PointLight(0x63ffd4, 6, 9);
  light.position.y = 1.3; g.add(light);
  const beamMaterial = new THREE.MeshBasicMaterial({ color: 0x58f5d2, transparent: true, opacity: .17, depthWrite: false });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 21, 12, 1, true), beamMaterial);
  beam.position.y = 11; g.add(beam);
  earth.add(g);
  return { x, z, group: g, crystal, ring, collected: false };
}

// Astronaut gloves and a compact plasma carbine stay in the first-person view.
const weapon = new THREE.Group();
camera.add(weapon); scene.add(camera);
weapon.position.set(.32, -.33, -.62);
block(weapon, .2, .17, .8, .05, -.08, -.22, darkMetal);
block(weapon, .32, .22, .38, .02, -.04, -.46, mat(0xb7c7c5, .5, .45));
block(weapon, .12, .12, .43, .03, -.015, -.77, darkMetal);
block(weapon, .07, .09, .32, -.03, .09, -.35, glowMat, false);
const glove = mat(0xd5e3dd, .18, .67);
sphere(weapon, .16, .29, -.23, .06, glove);
sphere(weapon, .14, -.11, -.23, -.28, glove);
const muzzle = new THREE.PointLight(0x59ffe0, 0, 5);
muzzle.position.set(.03, -.01, -.96); weapon.add(muzzle);

const aliens = [];
const keys = new Set();
const raycaster = new THREE.Raycaster();
const aim = new THREE.Vector2(0, 0);
const state = { mode: 'menu', health: 100, oxygen: 100, ammo: 30, reserve: 180,
  collected: 0, kills: 0, lastShot: 0, lastSpawn: 0, reloadAt: 0, noticeUntil: 0, fireUntil: 0,
  yaw: 0, pitch: 0, elapsed: 0, invulnerableUntil: 0, marsAt: 0 };
const alienSkin = mat(0x354d49, .2, .65), alienEyes = mat(0xafffe7, .1, .3, 0x46ffc8, 2.5);
function spawnAlien(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = cylinder(group, .39, .56, 1.34, 0, 1.0, 0, alienSkin, 8);
  const head = sphere(group, .43, 0, 1.89, 0, alienSkin);
  head.scale.set(1.25, .83, 1);
  for (const side of [-1, 1]) {
    const eye = sphere(group, .10, side * .22, 1.92, .35, alienEyes, 8);
    eye.scale.set(1.3, .6, .4);
    const arm = cylinder(group, .11, .16, 1.15, side * .6, 1.04, .05, alienSkin, 6);
    arm.rotation.z = side * .25;
  }
  group.traverse((part) => { if (part.isMesh) part.userData.alien = group; });
  earth.add(group);
  aliens.push({ group, hp: 3, speed: 1.8 + Math.random() * .6, attackAt: 0, phase: Math.random() * 7 });
}
function canStand(x, z, radius = .58) {
  if (Math.abs(x) > 39 || Math.abs(z) > 53) return false;
  return !obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + radius && Math.abs(z - o.z) < o.d / 2 + radius);
}
function spawnAtEdge() {
  for (let tries = 0; tries < 24; tries++) {
    const x = (Math.random() - .5) * 72, z = (Math.random() - .5) * 97;
    if (!canStand(x, z, 1) || Math.hypot(x - camera.position.x, z - camera.position.z) < 19) continue;
    spawnAlien(x, z); return;
  }
}
function updateHud() {
  ui.health.textContent = Math.ceil(state.health) + '%';
  ui.healthBar.style.width = state.health + '%';
  ui.oxygen.textContent = Math.ceil(state.oxygen) + '%';
  ui.oxygenBar.style.width = state.oxygen + '%';
  ui.ammo.textContent = state.ammo;
  ui.reserve.textContent = state.reserve;
  ui.progress.textContent = state.collected + ' / 3 CORES';
  ui.objective.textContent = state.collected === 3 ? 'Board the escape ship' : 'Recover the power cores';
  const next = state.collected === 3
    ? { x: 0, z: -43, label: 'SHIP' }
    : cores.filter(c => !c.collected).map(c => ({ ...c, label: 'CORE' }))
      .sort((a, b) => Math.hypot(a.x - camera.position.x, a.z - camera.position.z) -
        Math.hypot(b.x - camera.position.x, b.z - camera.position.z))[0];
  if (next) {
    const dx = next.x - camera.position.x, dz = next.z - camera.position.z;
    const distance = Math.round(Math.hypot(dx, dz));
    const relative = ((Math.atan2(dx, -dz) - state.yaw) * 180 / Math.PI + 360) % 360;
    const direction = ['AHEAD', 'AHEAD-RIGHT', 'RIGHT', 'BEHIND-RIGHT',
      'BEHIND', 'BEHIND-LEFT', 'LEFT', 'AHEAD-LEFT'][Math.round(relative / 45) % 8];
    ui.guidance.textContent = `${next.label}: ${distance}m ${direction}`;
  }
}
function notice(message, seconds = 2.2) {
  ui.notice.textContent = message;
  ui.notice.classList.remove('hidden');
  state.noticeUntil = performance.now() + seconds * 1000;
}
function reset() {
  for (const a of aliens) earth.remove(a.group);
  aliens.length = 0;
  for (const c of cores) earth.remove(c.group);
  cores = coreSites.map(([x, z]) => makeCore(x, z));
  Object.assign(state, { mode: 'playing', health: 100, oxygen: 100, ammo: 30, reserve: 180,
    collected: 0, kills: 0, lastShot: 0, lastSpawn: performance.now(), reloadAt: 0,
    yaw: 0, pitch: 0, elapsed: 0, invulnerableUntil: 0, marsAt: 0 });
  mars.visible = false; earth.visible = true;
  scene.background.setHex(0x202c36); scene.fog.color.setHex(0x2b3d45);
  scene.fog.density = .013;
  sun.color.setHex(0xf9b48b); sun.intensity = 2.2;
  camera.position.set(0, 1.72, 38);
  camera.rotation.set(0, 0, 0);
  keys.clear();
  for (let i = 0; i < 3; i++) spawnAtEdge();
  ui.hud.classList.remove('hidden');
  ui.overlay.classList.add('hidden');
  updateHud();
  notice('MISSION START', 2);
}
function pause() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  ui.copy.textContent = 'Mission paused. Return when you are ready.';
  ui.start.innerHTML = 'RESUME MISSION <span>→</span>';
  ui.overlay.classList.remove('hidden');
}
function resume() {
  if (state.mode === 'menu' || state.mode === 'dead' || state.mode === 'won') reset();
  else { state.mode = 'playing'; ui.overlay.classList.add('hidden'); }
  requestMouseLock();
}
function requestMouseLock() {
  const result = renderer.domElement.requestPointerLock?.();
  if (result?.catch) result.catch(() => {});
}
function endGame(win) {
  document.exitPointerLock?.();
  state.mode = win ? 'won' : 'dead';
  ui.hud.classList.add('hidden');
  ui.overlay.classList.remove('hidden');
  if (win) {
    ui.copy.textContent = 'The ship reached Mars. Beyond the red dunes, the lights of the last human colony are still on. Your crew made it home.';
    ui.start.innerHTML = 'PLAY AGAIN <span>→</span>';
  } else {
    ui.copy.textContent = 'Your suit failed before you could escape Earth. The ship is still waiting at the launch site.';
    ui.start.innerHTML = 'TRY AGAIN <span>→</span>';
  }
}
function reload() {
  if (state.mode !== 'playing' || state.reloadAt || state.ammo >= 30 || state.reserve <= 0) return;
  state.reloadAt = performance.now() + 1250;
  notice('RELOADING', 1.1);
}
function shoot() {
  const now = performance.now();
  if (state.mode !== 'playing' || state.reloadAt || now - state.lastShot < 145) return;
  if (state.ammo <= 0) { reload(); return; }
  state.lastShot = now;
  state.ammo--;
  state.fireUntil = now + 75;
  muzzle.intensity = 13;
  weapon.position.z = -.53;
  raycaster.setFromCamera(aim, camera);
  raycaster.far = 60;
  const objects = [...aliens.flatMap(a => a.group.children), ...obstacles.map(o => o.mesh)];
  const hit = raycaster.intersectObjects(objects, true)[0];
  if (hit?.object.userData.alien) {
    const alien = aliens.find(a => a.group === hit.object.userData.alien);
    if (alien) {
      alien.hp -= hit.object.geometry?.type === 'SphereGeometry' ? 2 : 1;
      alien.group.scale.setScalar(alien.hp > 0 ? 1.08 : 1);
      if (alien.hp <= 0) {
        earth.remove(alien.group);
        aliens.splice(aliens.indexOf(alien), 1);
        state.kills++;
        if (state.kills % 5 === 0) {
          state.reserve = Math.min(240, state.reserve + 30);
          notice('AMMO RECOVERED FROM FIELD CACHE');
        }
      }
    }
  }
  updateHud();
}
function interact() {
  if (state.mode !== 'playing') return;
  for (const c of cores) {
    if (!c.collected && Math.hypot(camera.position.x - c.x, camera.position.z - c.z) < 3.2) {
      c.collected = true; c.group.visible = false; state.collected++;
      state.oxygen = Math.min(100, state.oxygen + 22);
      notice('POWER CORE SECURED // OXYGEN REFILLED', 3);
      updateHud(); return;
    }
  }
  if (Math.hypot(camera.position.x, camera.position.z + 43) < 6) {
    if (state.collected === 3) launch();
    else notice('SHIP REQUIRES ' + (3 - state.collected) + ' MORE POWER CORES');
  }
}
function launch() {
  state.mode = 'launching';
  document.exitPointerLock?.();
  ui.hud.classList.add('hidden');
  notice('LAUNCH SEQUENCE INITIATED', 3);
  state.marsAt = performance.now() + 2400;
}
function buildMars() {
  const soil = mat(0xa76349);
  block(mars, 160, .35, 160, 0, -.25, 0, soil, false);
  const domeMat = new THREE.MeshStandardMaterial({ color: 0xc2d9d4, metalness: .2, roughness: .4, transparent: true, opacity: .72 });
  for (const [x, z, r] of [[-14, -18, 6], [4, -24, 9], [20, -15, 5]]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.set(x, 0, z); mars.add(dome);
    cylinder(mars, r, r, .7, x, .35, z, darkMetal, 24);
    const lamp = new THREE.PointLight(0xb4f7e9, 5, r * 3);
    lamp.position.set(x, 3.5, z); mars.add(lamp);
  }
  for (let i = 0; i < 38; i++) {
    const x = (i * 41 % 140) - 70, z = (i * 67 % 115) - 62;
    if (Math.abs(x) < 28 && z < -5) continue;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(.4 + i % 4 * .35, 0), soil);
    rock.position.set(x, .15, z); rock.scale.y = .5; mars.add(rock);
  }
  const earthInSky = sphere(mars, 1.3, -40, 31, -73, mat(0x8fd3de, 0, 1, 0x387fa3, .45), 20);
  earthInSky.material.fog = false;
}
buildMars();
function arriveMars() {
  earth.visible = false; mars.visible = true;
  scene.background.setHex(0x963f35);
  scene.fog.color.setHex(0xaa6350); scene.fog.density = .009;
  sun.color.setHex(0xffd1a5); sun.intensity = 3;
  camera.position.set(0, 2.2, 25);
  camera.rotation.set(-.13, 0, 0);
  state.mode = 'arriving';
  state.marsAt = performance.now() + 4000;
  notice('MARS COLONY // HUMAN SIGNAL CONFIRMED', 4);
}
function updateAliens(dt, now) {
  if (now - state.lastSpawn > 7000 && aliens.length < 9) {
    spawnAtEdge(); state.lastSpawn = now;
  }
  for (const a of aliens) {
    const p = a.group.position;
    const dx = camera.position.x - p.x, dz = camera.position.z - p.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 38 && dist > 1.25) {
      const step = Math.min(a.speed * dt, dist - 1.25);
      const nx = p.x + dx / dist * step, nz = p.z + dz / dist * step;
      if (canStand(nx, nz, .45)) { p.x = nx; p.z = nz; }
      else if (canStand(nx, p.z, .45)) p.x = nx;
      else if (canStand(p.x, nz, .45)) p.z = nz;
    }
    a.group.lookAt(camera.position.x, 0, camera.position.z);
    a.group.position.y = Math.sin(now * .004 + a.phase) * .065;
    if (dist < 1.7 && now > a.attackAt && now > state.invulnerableUntil) {
      a.attackAt = now + 1300;
      state.health = Math.max(0, state.health - 10);
      state.invulnerableUntil = now + 400;
      ui.damage.style.opacity = .85;
      setTimeout(() => ui.damage.style.opacity = 0, 180);
      updateHud();
      if (state.health <= 0) endGame(false);
    }
  }
}
function updatePrompt() {
  let label = '';
  for (const c of cores) {
    if (!c.collected && Math.hypot(camera.position.x - c.x, camera.position.z - c.z) < 3.2) {
      label = '<b>E</b> RECOVER POWER CORE'; break;
    }
  }
  if (!label && Math.hypot(camera.position.x, camera.position.z + 43) < 6)
    label = state.collected === 3 ? '<b>E</b> BOARD SHIP AND LAUNCH' : 'SHIP NEEDS ' + (3 - state.collected) + ' POWER CORES';
  ui.prompt.innerHTML = label;
  ui.prompt.classList.toggle('hidden', !label);
}
function updateMovement(dt) {
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  if (!forward && !strafe) return;
  const length = Math.hypot(forward, strafe);
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9 : 6;
  const dx = (Math.sin(state.yaw) * forward + Math.cos(state.yaw) * strafe) / length * speed * dt;
  const dz = (-Math.cos(state.yaw) * forward + Math.sin(state.yaw) * strafe) / length * speed * dt;
  const x = camera.position.x + dx, z = camera.position.z + dz;
  if (canStand(x, camera.position.z)) camera.position.x = x;
  if (canStand(camera.position.x, z)) camera.position.z = z;
  weapon.position.y = -.33 + Math.sin(state.elapsed * (speed * 1.3)) * .012;
}
let previous = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, .05); previous = now;
  if (state.mode === 'playing') {
    state.elapsed += dt;
    updateMovement(dt);
    updateAliens(dt, now);
    for (const c of cores) if (!c.collected) {
      c.crystal.rotation.y += dt * 1.4;
      c.ring.rotation.z += dt * .5;
      c.crystal.position.y = 1.25 + Math.sin(now * .002) * .12;
    }
    if (state.reloadAt && now >= state.reloadAt) {
      const amount = Math.min(30 - state.ammo, state.reserve);
      state.ammo += amount; state.reserve -= amount; state.reloadAt = 0; updateHud();
    }
    state.oxygen = Math.max(0, state.oxygen - dt * .14);
    if (state.oxygen === 0) {
      state.health = Math.max(0, state.health - dt * 10);
      if (state.health === 0) endGame(false);
    }
    updateHud(); updatePrompt();
  } else if (state.mode === 'launching' && now >= state.marsAt) arriveMars();
  else if (state.mode === 'arriving') {
    camera.position.z -= dt * 2.2;
    if (now >= state.marsAt) endGame(true);
  }
  if (state.noticeUntil && now >= state.noticeUntil) { ui.notice.classList.add('hidden'); state.noticeUntil = 0; }
  if (now > state.fireUntil) muzzle.intensity = 0;
  weapon.position.z += (-.62 - weapon.position.z) * Math.min(1, dt * 14);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

ui.start.addEventListener('click', resume);
renderer.domElement.addEventListener('click', () => {
  if (state.mode === 'playing' && document.pointerLockElement !== renderer.domElement) requestMouseLock();
  shoot();
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== renderer.domElement && state.mode === 'playing') pause();
});
document.addEventListener('mousemove', (event) => {
  if (state.mode !== 'playing') return;
  state.yaw -= event.movementX * .0023;
  state.pitch = THREE.MathUtils.clamp(state.pitch - event.movementY * .0023, -1.35, 1.35);
  camera.rotation.set(state.pitch, state.yaw, 0);
});
document.addEventListener('keydown', (event) => {
  keys.add(event.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyE') interact();
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('mousedown', (event) => { if (event.button === 0 && event.target === renderer.domElement) shoot(); });
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
