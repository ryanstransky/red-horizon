import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const $ = (id) => document.getElementById(id);
const ui = {
  hud: $('hud'), overlay: $('overlay'), copy: $('overlay-copy'), start: $('start-button'),
  health: $('health'), healthBar: $('health-bar'), oxygen: $('oxygen'), oxygenBar: $('oxygen-bar'),
  ammo: $('ammo'), reserve: $('reserve'), weaponName: $('weapon-name'), loadout: $('loadout'),
  objective: $('objective'), progress: $('progress'), guidance: $('guidance'),
  prompt: $('prompt'), notice: $('notice'), damage: $('damage-flash'),
};
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111a1c);
scene.fog = new THREE.FogExp2(0x263135, 0.013);
const camera = new THREE.PerspectiveCamera(74, innerWidth / innerHeight, 0.07, 200);
camera.rotation.order = 'YXZ';
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1));
renderer.shadowMap.enabled = false;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
$('game').append(renderer.domElement);
scene.add(new THREE.HemisphereLight(0x829da2, 0x211916, .75));
const sun = new THREE.DirectionalLight(0xb7a493, 1.65);
sun.position.set(-25, 42, -35);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
scene.add(sun);

const earth = new THREE.Group();
const mars = new THREE.Group();
scene.add(earth, mars);
mars.visible = false;
const mat = (color, metalness = 0, roughness = 1, emissive = 0x000000, intensity = 0) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: intensity });
function gritTexture(base, seed, repeatX, repeatY) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  let randomSeed = seed;
  const random = () => ((randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const noise = (random() - .5) * 38 + Math.sin(x * .11) * 4 + Math.sin(y * .075) * 5;
    const i = (y * 256 + x) * 4;
    for (let c = 0; c < 3; c++) image.data[i + c] = Math.max(0, Math.min(255, base[c] + noise));
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 55; i++) {
    const x = random() * 256, y = random() * 256;
    ctx.strokeStyle = random() > .5 ? 'rgba(12,15,16,.22)' : 'rgba(190,172,140,.12)';
    ctx.lineWidth = .4 + random() * 1.5;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + random() * 20 - 10, y + random() * 24 - 12); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
const facadeCanvases = [];
const concretePhoto = new Image();
concretePhoto.onload = () => facadeCanvases.forEach(draw => draw());
concretePhoto.src = './assets/textures/concrete_wall_003_diff_1k.jpg';
function facadeTexture(seed) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  const draw = () => {
  if (concretePhoto.complete && concretePhoto.naturalWidth) {
    ctx.drawImage(concretePhoto, 0, 0, 256, 512);
    ctx.fillStyle = 'rgba(44,52,51,.34)'; ctx.fillRect(0, 0, 256, 512);
  } else {
    ctx.fillStyle = '#626967'; ctx.fillRect(0, 0, 256, 512);
  }
  let value = (Math.abs(seed * 1009) + 13) >>> 0;
  const random = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 8500; i++) {
    const shade = random() > .5 ? 'rgba(17,25,25,.15)' : 'rgba(194,181,156,.08)';
    ctx.fillStyle = shade;
    ctx.fillRect(random() * 256, random() * 512, 1 + random() * 4, 1 + random() * 7);
  }
  for (let row = 0; row < 7; row++) for (let col = 0; col < 4; col++) {
    const x = 15 + col * 61, y = 17 + row * 70;
    ctx.fillStyle = '#1b2a2d'; ctx.fillRect(x, y, 41, 49);
    ctx.fillStyle = random() > .88 ? '#856956' : '#24393a';
    ctx.fillRect(x + 3, y + 3, 35, 43);
    ctx.fillStyle = 'rgba(160,181,169,.32)';
    ctx.fillRect(x + 20, y, 2, 49);
    ctx.fillRect(x, y + 24, 41, 2);
    if (random() > .62) {
      ctx.strokeStyle = 'rgba(181,186,174,.34)';
      ctx.lineWidth = 1; ctx.beginPath();
      ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + 34, y + 38); ctx.lineTo(x + 22, y + 44); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(15,21,23,.5)'; ctx.fillRect(x - 1, y + 49, 43, 4);
  }
  for (let i = 0; i < 85; i++) {
    ctx.strokeStyle = random() > .6 ? 'rgba(20,21,20,.3)' : 'rgba(188,174,150,.13)';
    ctx.lineWidth = 1 + random() * 2;
    const x = random() * 256, y = random() * 512;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - random() * 18, y + random() * 30); ctx.stroke();
  }
  texture.needsUpdate = true;
  };
  facadeCanvases.push(draw);
  draw();
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
const groundMat = new THREE.MeshStandardMaterial({ map: gritTexture([52, 55, 52], 23, 10, 14), roughness: 1 });
const concrete = new THREE.MeshStandardMaterial({ map: gritTexture([89, 95, 91], 47, 2, 3), roughness: .95 });
const surfaceLoader = new THREE.TextureLoader();
function applySurface(material, stem, repeatX, repeatY) {
  for (const [suffix, property] of [['diff', 'map'], ['nor_gl', 'normalMap'], ['rough', 'roughnessMap']]) {
    surfaceLoader.load(`./assets/textures/${stem}_${suffix}_1k.jpg`, texture => {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(repeatX, repeatY);
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (property === 'map') texture.colorSpace = THREE.SRGBColorSpace;
      material[property] = texture;
      material.needsUpdate = true;
    }, undefined, error => console.warn(`Could not load ${stem} ${suffix}; using game texture.`, error));
  }
  material.normalScale = new THREE.Vector2(.35, .35);
}
applySurface(concrete, 'concrete_wall_003', 2, 2);
const darkMetal = mat(0x253039, .65, .56);
const rust = new THREE.MeshStandardMaterial({ map: gritTexture([102, 69, 54], 83, 1, 1), metalness: .25, roughness: .88 });
const glass = mat(0x182629, .48, .3, 0x0b1c1a, .12), alienMat = mat(0x1f3935, .16, .78);
const glowMat = mat(0x9cebd2, .1, .35, 0x47ffcc, 2.4);
const orangeGlow = mat(0xf0a062, .1, .4, 0xff6b30, 1.7);
const block = (parent, w, h, d, x, y, z, material, cast = true) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
};
const sphere = (parent, r, x, y, z, material, segments = 20) => {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, segments, 14), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
};
const cylinder = (parent, rt, rb, h, x, y, z, material, segments = 16) => {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
};
function rod(parent, start, end, radius, material) {
  const from = new THREE.Vector3(...start), to = new THREE.Vector3(...end);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, from.distanceTo(to), 10), material);
  mesh.position.copy(from).add(to).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.sub(from).normalize());
  mesh.castShadow = true; parent.add(mesh); return mesh;
}
const ground = block(earth, 128, .35, 192, 0, -.22, 0, groundMat, false);
ground.receiveShadow = true;
const roadMat = new THREE.MeshStandardMaterial({ map: gritTexture([42, 44, 44], 123, 3, 16), roughness: 1 });
applySurface(roadMat, 'worn_asphalt', 3, 24);
const road = block(earth, 9.5, .025, 186, 0, .005, 0, roadMat, false);
road.receiveShadow = true;
for (const z of [-39, 22]) block(earth, 110, .02, 7, 0, .006, z, roadMat, false);
for (let z = -88; z < 90; z += 9) {
  const mark = block(earth, .11, .026, 3.2, 0, .025, z, mat(0x777467), false);
  mark.material.transparent = true; mark.material.opacity = .34;
}

const obstacles = [];
function ruin(x, z, w, d, h) {
  const facade = new THREE.MeshStandardMaterial({ map: facadeTexture(x + z), roughness: .93 });
  const b = block(earth, w, h, d, x, h / 2, z, facade);
  obstacles.push({ x, z, w, d, mesh: b });
  const roof = block(earth, w + .3, .23, d + .2, x, h + .05, z, concrete);
  roof.rotation.z = (x > 0 ? 1 : -1) * .025;
  for (let i = 0; i < 2; i++) {
    const rubble = new THREE.Mesh(new THREE.DodecahedronGeometry(.45 + i * .25), concrete);
    rubble.scale.set(1.7, .4, 1.2); rubble.position.set(x - w * .25 + i * w * .25, h + .18, z + d * .25);
    earth.add(rubble);
  }
  rod(earth, [x + w * .32, h + .1, z], [x + w * .32 + 1.3, h + 2.2, z + .5], .035, darkMetal);
  rod(earth, [x + w * .32 + 1.3, h + 2.2, z + .5], [x + w * .32 + 1.7, h + 2.5, z + .5], .025, darkMetal);
}
ruin(-31, -21, 10, 22, 10);
ruin(30, -10, 10, 28, 13);
ruin(-28, 19, 12, 13, 8);
ruin(29, 27, 10, 15, 9);
ruin(-9, -4, 7, 9, 5);
ruin(10, 13, 8, 9, 4);
for (const [x, z, w, d, h] of [
  [-35, 61, 15, 18, 13], [37, 63, 14, 19, 10], [-39, 39, 12, 13, 8],
  [36, 39, 16, 15, 16], [-43, 4, 12, 16, 10], [43, 5, 13, 18, 12],
  [-39, -43, 17, 16, 15], [40, -49, 15, 17, 11], [-33, -72, 16, 13, 9],
  [32, -72, 14, 15, 12], [-13, 70, 7, 9, 5], [16, -69, 8, 9, 6]
]) ruin(x, z, w, d, h);
for (const [x, z, w, d] of [[-14, 23, 3, 3], [15, 31, 4, 3], [-21, -7, 3, 3], [18, -24, 4, 3], [3, -20, 3, 3]]) {
  const b = block(earth, w, 2, d, x, 1, z, rust);
  obstacles.push({ x, z, w, d, mesh: b });
  block(earth, w - .2, .12, d - .2, x, 2.1, z, darkMetal);
}
// The high walls make the mission boundary clear without an invisible edge.
block(earth, 128, 8, 1, 0, 4, -96, darkMetal);
block(earth, 128, 8, 1, 0, 4, 96, darkMetal);
block(earth, 1, 8, 192, -64, 4, 0, darkMetal);
block(earth, 1, 8, 192, 64, 4, 0, darkMetal);
for (let i = 0; i < 110; i++) {
  const x = (i * 31 % 121) - 60, z = (i * 47 % 181) - 90;
  if (Math.abs(x) < 7 || Math.hypot(x + 29, z - 30) < 5 ||
      Math.hypot(x - 30, z + 20) < 5 || Math.hypot(x + 25, z + 58) < 5) continue;
  const debris = new THREE.Mesh(new THREE.DodecahedronGeometry(.24 + (i % 5) * .13, 0), i % 3 ? concrete : rust);
  debris.position.set(x, .06 + (i % 5) * .025, z);
  debris.scale.set(1.35, .36, .8 + (i % 4) * .1);
  debris.rotation.set(i * .4, i * 1.7, i * .17);
  debris.castShadow = false; earth.add(debris);
}
// Abandoned vehicles, warnings, and three distinct recovery sites tell the story of the evacuation.
const tireMat = mat(0x111719, .05, .95), wreckGlass = mat(0x1b3035, .45, .3);
function wreck(x, z, angle, color) {
  const car = new THREE.Group(); car.position.set(x, .45, z); car.rotation.y = angle;
  earth.add(car);
  const shell = mat(color, .35, .82);
  block(car, 3.3, .67, 1.8, 0, 0, 0, shell);
  block(car, 1.65, .55, 1.55, -.2, .58, 0, wreckGlass);
  block(car, .17, .58, 1.85, 1.62, .02, 0, darkMetal);
  for (const wx of [-1.05, 1.05]) for (const wz of [-.89, .89]) {
    const wheel = cylinder(car, .34, .34, .18, wx, -.3, wz, tireMat, 12);
    wheel.rotation.x = Math.PI / 2;
  }
  car.rotation.z = (x < 0 ? -1 : 1) * .045;
  obstacles.push({x, z, w: 3.7, d: 2.5, mesh: car});
}
for (const [x,z,a,c] of [[-10,68,.3,0x4c605d],[12,55,-.4,0x766454],
  [-11,9,.9,0x544e4b],[11,-5,.2,0x626363],[-12,-30,-.6,0x7b513e],
  [11,-52,.5,0x3f5556],[-11,-75,1.1,0x65534b]]) wreck(x,z,a,c);
function sign(label, x, z, direction = 1) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#243a37'; ctx.fillRect(0,0,512,128);
  ctx.strokeStyle = '#ca8865'; ctx.lineWidth = 8; ctx.strokeRect(4,4,504,120);
  ctx.font = 'bold 44px sans-serif'; ctx.fillStyle = '#dce0ce'; ctx.textAlign = 'center';
  ctx.fillText(label,256,80);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(5.8,1.45),
    new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
  panel.position.set(x,3.1,z); panel.rotation.y = direction * Math.PI/2; earth.add(panel);
  rod(earth,[x-1.8,0,z],[x-1.8,2.4,z],.08,darkMetal);
  rod(earth,[x+1.8,0,z],[x+1.8,2.4,z],.08,darkMetal);
}
sign('EVACUATION ROUTE',-8,55);
sign('FIELD HOSPITAL',-20,38);
sign('SIGNAL STATION',20,-12,-1);
sign('LAUNCH SITE',-8,-69);
// A roofless clinic can be entered from the road side to recover the first core.
for (const [x,z,w,d] of [[-29,27,7,.4],[-32.5,30,.4,6],[-25.5,30,.4,6],
  [-31.7,33,1.6,.4],[-26.3,33,1.6,.4]]) {
  const wall = block(earth,w,2.7,d,x,1.35,z,concrete);
  obstacles.push({x,z,w,d,mesh:wall});
}
for (const [x,z] of [[-31,29],[-27,29]]) {
  block(earth,1.1,.7,.9,x,.35,z,rust);
  sphere(earth,.12,x,.78,z,orangeGlow);
}
// A fallen relay mast points toward the second core.
rod(earth,[30,0,-25],[36,8,-19],.17,darkMetal);
rod(earth,[36,8,-19],[38,10,-17],.09,darkMetal);
for (let i=0;i<4;i++) block(earth,.5,.12,1.2,30+i*1.6,.5+i*1.7,-25+i*1.6,rust);
const relayLamp = new THREE.PointLight(0xff5d45,4,11);
relayLamp.position.set(35,7,-20); earth.add(relayLamp);
// The last core sits beside a crater and a broken transport.
const crater = new THREE.Mesh(new THREE.TorusGeometry(4.1,.7,8,22),rust);
crater.rotation.x = Math.PI/2; crater.position.set(-31,.2,-65); earth.add(crater);
for (let i=0;i<7;i++) {
  const angle=i*Math.PI*2/7;
  const shard = new THREE.Mesh(new THREE.ConeGeometry(.45,1.4+i%3*.3,5),darkMetal);
  shard.position.set(-31+Math.cos(angle)*3.7,.7,-65+Math.sin(angle)*3.7);
  shard.rotation.z=Math.sin(angle)*.6; earth.add(shard);
}
// Layers of blowing ash and low fog move independently of the camera.
const fogCanvas = document.createElement('canvas');
fogCanvas.width = fogCanvas.height = 128;
const fogContext = fogCanvas.getContext('2d');
const gradient = fogContext.createRadialGradient(64, 64, 6, 64, 64, 64);
gradient.addColorStop(0, 'rgba(154,163,158,.28)');
gradient.addColorStop(.5, 'rgba(139,149,146,.13)');
gradient.addColorStop(1, 'rgba(139,149,146,0)');
fogContext.fillStyle = gradient; fogContext.fillRect(0, 0, 128, 128);
const fogTexture = new THREE.CanvasTexture(fogCanvas);
const fogBanks = [];
for (let i = 0; i < 28; i++) {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: fogTexture, color: 0xb0b9b2, transparent: true, opacity: .42, depthWrite: false
  }));
  sprite.position.set(((i * 67) % 119) - 59, 1.2 + i % 3, ((i * 41) % 181) - 90);
  sprite.scale.set(10 + i % 5 * 3, 3.8 + i % 3, 1);
  earth.add(sprite); fogBanks.push(sprite);
}
const dustCanvas = document.createElement('canvas');
dustCanvas.width = dustCanvas.height = 32;
const dustContext = dustCanvas.getContext('2d');
const dustGradient = dustContext.createRadialGradient(16, 16, 1, 16, 16, 16);
dustGradient.addColorStop(0, 'rgba(255,249,232,.7)');
dustGradient.addColorStop(.35, 'rgba(226,205,176,.18)');
dustGradient.addColorStop(1, 'rgba(226,205,176,0)');
dustContext.fillStyle = dustGradient;
dustContext.fillRect(0, 0, 32, 32);
const dustTexture = new THREE.CanvasTexture(dustCanvas);
const dustCount = 300;
const dustPositions = new Float32Array(dustCount * 3);
for (let i = 0; i < dustCount; i++) {
  dustPositions[i * 3] = (Math.random() - .5) * 26;
  dustPositions[i * 3 + 1] = (Math.random() - .5) * 11;
  dustPositions[i * 3 + 2] = -1 - Math.random() * 23;
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
  map: dustTexture, color: 0xb9a98f, size: .12, transparent: true, opacity: .33,
  sizeAttenuation: true, depthWrite: false, alphaTest: .005
}));
camera.add(dust);
const streakCount = 48;
const streakPositions = new Float32Array(streakCount * 6);
for (let i = 0; i < streakCount; i++) {
  const j = i * 6, x = (Math.random() - .5) * 26, y = (Math.random() - .5) * 11;
  const z = -1 - Math.random() * 20;
  streakPositions.set([x, y, z, x + .2 + Math.random() * .48, y + .025, z], j);
}
const streakGeometry = new THREE.BufferGeometry();
streakGeometry.setAttribute('position', new THREE.BufferAttribute(streakPositions, 3));
camera.add(new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({
  color: 0xc0ae98, transparent: true, opacity: .17, depthWrite: false
})));
for (const [x, z] of [[-6, 72], [6, 48], [-6, 30], [6, 11], [-6, -17], [6, -35], [-6, -61], [6, -79]]) {
  rod(earth, [x, 0, z], [x + .45, 7.2, z], .085, darkMetal);
  rod(earth, [x + .45, 7.2, z], [x + (x < 0 ? 1.8 : -1.8), 7.1, z], .055, darkMetal);
  sphere(earth, .15, x + (x < 0 ? 1.8 : -1.8), 7.02, z, orangeGlow);
  const lamp = new THREE.PointLight(0xd27b55, 2.5, 11);
  lamp.position.set(x, 6.8, z); earth.add(lamp);
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
ship.position.set(0, 0, -78);
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
beacon.position.set(0, 6, -78); earth.add(beacon);
const shipPad = block(earth, 14, .35, 13, 0, -.05, -78, darkMetal, false);
shipPad.receiveShadow = true;
const shipFlame = new THREE.Mesh(new THREE.ConeGeometry(1.3,5,16),
  new THREE.MeshBasicMaterial({color:0xff8948,transparent:true,opacity:.8}));
shipFlame.rotation.z = Math.PI; shipFlame.position.y = -2; shipFlame.visible = false;
ship.add(shipFlame);

const coreSites = [[-29, 30], [30, -20], [-25, -58]];
let cores = [];
function makeCore(x, z, label) {
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
  return { x, z, label, group: g, crystal, ring, collected: false };
}

const weaponSpecs = {
  pistol: {name:'PISTOL',mag:12,reserve:72,rate:330,damage:1.25,pellets:1,spread:.004,
    reload:1050,range:55,auto:false,color:0xffd29a,travel:72,tip:-.68},
  assault: {name:'ASSAULT RIFLE',mag:30,reserve:180,rate:125,damage:1.1,pellets:1,spread:.008,
    reload:1450,range:75,auto:true,color:0x89ffda,travel:45,tip:-1.05},
  shotgun: {name:'SHOTGUN',mag:6,reserve:42,rate:720,damage:.75,pellets:8,spread:.055,
    reload:1800,range:28,auto:false,color:0xffa472,travel:38,tip:-.99},
  sniper: {name:'SNIPER RIFLE',mag:5,reserve:35,rate:900,damage:6,pellets:1,spread:0,
    reload:2050,range:130,auto:false,color:0x8bddff,travel:22,tip:-1.28},
  minigun: {name:'MINIGUN',mag:120,reserve:360,rate:78,damage:.62,pellets:1,spread:.018,
    reload:3000,range:65,auto:true,color:0xffc36d,travel:32,tip:-1.04},
};
const weaponOrder = ['pistol','assault','shotgun','sniper','minigun'];
const weaponPoses = {
  pistol:{x:.36,y:-.47,z:-.77}, assault:{x:.29,y:-.39,z:-.65},
  shotgun:{x:.31,y:-.41,z:-.66}, sniper:{x:.34,y:-.43,z:-.72},
  minigun:{x:.32,y:-.39,z:-.69},
};
const inventory = Object.fromEntries(weaponOrder.map(id => [id,{owned:id==='pistol',mag:weaponSpecs[id].mag,
  reserve:weaponSpecs[id].reserve}]));
let activeWeapon = 'pistol';
let firing = false;
const weapon = new THREE.Group();
camera.add(weapon); scene.add(camera);
const suitLight = new THREE.PointLight(0xa9c4bb, 1.75, 11);
suitLight.position.set(0, -.12, -.35); camera.add(suitLight);
weapon.position.set(...Object.values(weaponPoses.pistol));
const suit = mat(0xb7c4bf, .28, .62), glove = mat(0xc5d1c9, .14, .77);
const grip = mat(0x18252a, .25, .7);
const forearm = cylinder(weapon, .17, .18, .47, .28, -.32, .13, suit);
forearm.rotation.x = .7;
sphere(weapon, .16, .26, -.17, -.06, glove);
sphere(weapon, .12, -.12, -.22, -.32, glove);
const weaponModels = new Map();
let minigunRotor = null, minigunSpin = 0;
function buildGunModel(id) {
  const g = new THREE.Group();
  const metal = mat(id==='shotgun'?0x584943:id==='sniper'?0x435760:id==='minigun'?0x555450:0x25343a,.55,.57);
  const accent = mat(weaponSpecs[id].color,.2,.5,weaponSpecs[id].color,.12);
  const long = id==='sniper'?1.13:id==='pistol'?.46:.9;
  block(g,id==='minigun'?.4:.29,.18,long*.64,0,-.04,-.37,metal);
  block(g,.11,.26,.16,.04,-.25,-.2,grip);
  if (id==='pistol') {
    block(g,.235,.075,.34,0,.045,-.36,metal);
    block(g,.13,.018,.2,0,.092,-.36,suit,false);
    rod(g,[0,-.035,-.53],[0,-.035,-.68],.043,grip);
  } else if (id==='shotgun') {
    for (const x of [-.075,.075]) rod(g,[x,-.04,-.49],[x,-.04,-1],.045,grip);
    block(g,.3,.14,.31,0,-.13,-.68,rust);
    block(g,.24,.13,.22,0,.08,-.32,metal);
  } else if (id==='sniper') {
    rod(g,[0,-.04,-.55],[0,-.04,-1.28],.044,grip);
    const scope = cylinder(g,.085,.085,.53,0,.17,-.45,grip,12);
    scope.rotation.x = Math.PI/2;
    block(g,.16,.24,.2,0,-.25,-.45,metal);
    rod(g,[-.08,-.12,-.92],[-.23,-.31,-1.02],.025,metal);
    rod(g,[.08,-.12,-.92],[.23,-.31,-1.02],.025,metal);
  } else if (id==='minigun') {
    const rotor = new THREE.Group(); g.add(rotor); minigunRotor=rotor;
    for (let i=0;i<6;i++) {
      const a=i*Math.PI/3, x=Math.cos(a)*.115, y=Math.sin(a)*.115-.035;
      rod(rotor,[x,y,-.48],[x,y,-1.04],.034,grip);
    }
    for (const z of [-.55,-.85]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.18,.026,8,18),metal);
      ring.position.set(0,-.035,z); rotor.add(ring);
    }
    cylinder(g,.24,.24,.26,.25,-.17,-.35,metal,16).rotation.z=Math.PI/2;
  } else {
    rod(g,[0,-.04,-.55],[0,-.04,-1.05],.053,grip);
    block(g,.25,.1,.4,0,.075,-.46,accent);
    block(g,.13,.3,.15,0,-.27,-.48,metal);
    block(g,.19,.11,.18,0,.19,-.4,grip);
  }
  block(g,.08,.025,.18,0,.085,-.34,accent,false);
  return g;
}
for (const id of weaponOrder) {
  const model=buildGunModel(id); model.visible=id==='pistol'; weapon.add(model); weaponModels.set(id,model);
}
const muzzle = new THREE.PointLight(0xffd29a,0,5);
muzzle.position.set(.03,-.02,weaponSpecs.pistol.tip); weapon.add(muzzle);
const pickupSites = [
  {id:'assault',x:-8,z:52}, {id:'shotgun',x:-17,z:42},
  {id:'sniper',x:18,z:-16}, {id:'minigun',x:-12,z:-48},
];
const weaponPickups = pickupSites.map(site => {
  const group=new THREE.Group(); group.position.set(site.x,0,site.z); earth.add(group);
  cylinder(group,.85,.97,.2,0,.13,0,darkMetal);
  const display=weaponModels.get(site.id).clone(true);
  display.scale.setScalar(.75); display.position.set(0,1.1,.28);
  display.rotation.y=Math.PI/2; group.add(display);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.78,.045,8,24),
    new THREE.MeshBasicMaterial({color:weaponSpecs[site.id].color}));
  ring.rotation.x=Math.PI/2; ring.position.y=.33; group.add(ring);
  const glow=new THREE.PointLight(weaponSpecs[site.id].color,3,7);
  glow.position.y=1.2; group.add(glow);
  const labelCanvas=document.createElement('canvas'); labelCanvas.width=512; labelCanvas.height=96;
  const context=labelCanvas.getContext('2d');
  context.fillStyle='rgba(4,20,23,.82)'; context.fillRect(0,0,512,96);
  context.font='bold 42px sans-serif'; context.textAlign='center';
  context.fillStyle='#e6fff6'; context.fillText(weaponSpecs[site.id].name,256,62);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(labelCanvas),
    transparent:true,depthWrite:false}));
  label.position.y=2.05; label.scale.set(3.3,.62,1); group.add(label);
  return {...site,group,display,ring,collected:false};
});

const aliens = [];
const alienShots = [];
const tracers = [];
const impacts = [];
const keys = new Set();
const raycaster = new THREE.Raycaster();
const aim = new THREE.Vector2(0, 0);
const state = { mode: 'menu', health: 100, oxygen: 100,
  collected: 0, kills: 0, lastShot: 0, lastSpawn: 0, reloadAt: 0, noticeUntil: 0, fireUntil: 0,
  yaw: 0, pitch: 0, elapsed: 0, invulnerableUntil: 0, marsAt: 0,
  escapeLeft: 0, lastSiren: 0, launchStart: 0, hitUntil: 0 };
// Small synthesized effects keep the prototype self-contained and work after the first click.
const audio = {context: null, master: null, muted: false, noise: null};
function initAudio() {
  if (audio.context) { audio.context.resume(); return; }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  audio.context = new AudioContextClass();
  audio.master = audio.context.createGain();
  audio.master.gain.value = audio.muted ? 0 : .18;
  audio.master.connect(audio.context.destination);
  const buffer = audio.context.createBuffer(1, audio.context.sampleRate / 2, audio.context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i=0;i<data.length;i++) data[i] = Math.random() * 2 - 1;
  audio.noise = buffer;
  for (const freq of [44, 61]) {
    const osc = audio.context.createOscillator(), gain = audio.context.createGain();
    osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = .032;
    osc.connect(gain).connect(audio.master); osc.start();
  }
}
function tone(from, to, duration, volume = .4, shape = 'sawtooth') {
  if (!audio.context || audio.muted) return;
  const t = audio.context.currentTime;
  const osc = audio.context.createOscillator(), gain = audio.context.createGain();
  osc.type = shape; osc.frequency.setValueAtTime(from,t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);
  gain.gain.setValueAtTime(volume,t);
  gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  osc.connect(gain).connect(audio.master); osc.start(t); osc.stop(t+duration+.02);
}
function noise(duration, volume = .3) {
  if (!audio.context || audio.muted) return;
  const source = audio.context.createBufferSource(), gain = audio.context.createGain();
  const t = audio.context.currentTime;
  source.buffer = audio.noise;
  gain.gain.setValueAtTime(volume,t);
  gain.gain.exponentialRampToValueAtTime(.001,t+duration);
  source.connect(gain).connect(audio.master); source.start(t); source.stop(t+duration);
}
function sound(kind, weaponId = activeWeapon) {
  if (kind === 'shot') {
    if (weaponId === 'pistol') { tone(480,120,.12,.42); noise(.065,.18); }
    else if (weaponId === 'assault') { tone(310,85,.095,.42); noise(.05,.23); }
    else if (weaponId === 'shotgun') { tone(175,45,.24,.72); noise(.24,.65); }
    else if (weaponId === 'sniper') { tone(680,50,.34,.68); noise(.19,.6); }
    else { tone(220,68,.065,.27,'square'); noise(.04,.17); }
  }
  else if (kind === 'hit') tone(340,150,.09,.24,'square');
  else if (kind === 'kill') { tone(220,55,.28,.35); noise(.18,.18); }
  else if (kind === 'damage') { tone(110,42,.35,.8); noise(.2,.25); }
  else if (kind === 'warning') tone(620,210,.28,.3,'square');
  else if (kind === 'spit') tone(390,105,.22,.25,'sawtooth');
  else if (kind === 'pickup') { tone(440,880,.3,.3,'sine'); tone(660,1100,.26,.17,'sine'); }
  else if (kind === 'reload') tone(95,180,.18,.25,'square');
  else if (kind === 'siren') { tone(260,620,.65,.32,'sine'); tone(620,260,.65,.25,'sine'); }
  else if (kind === 'launch') { tone(75,180,1.7,.65); noise(1.6,.35); }
}
const alienSkin = new THREE.MeshStandardMaterial({
  map: gritTexture([69, 95, 82], 252, 1, 1), roughness: .78,
  emissive: 0x10231b, emissiveIntensity: .13
});
const alienShell = mat(0x344d49, .2, .65);
const alienEyes = mat(0x9ed6c4, .1, .42, 0x40c39e, .75);
const alienKinds = {
  stalker: {scale: 1, speed: 2.05, hp: 3, damage: 10, range: 1.7, tint: 0xdde9dc},
  runner: {scale: .76, speed: 3.35, hp: 2, damage: 7, range: 1.55, tint: 0xb9ffd9},
  brute: {scale: 1.4, speed: 1.3, hp: 7, damage: 18, range: 2.2, tint: 0xffb4a0},
  spitter: {scale: .9, speed: 1.65, hp: 3, damage: 9, range: 2, tint: 0x96f3e5},
};
let alienTemplate = null;
let alienClips = [];
function attachDetailedAlien(alien) {
  if (!alienTemplate || alien.detail) return;
  const visual = cloneSkinned(alienTemplate);
  const materials = [];
  visual.traverse(part => {
    if (part.isMesh) {
      part.userData.alien = alien.group;
      part.castShadow = false;
      part.material = part.material.clone();
      part.material.color.multiply(new THREE.Color(alienKinds[alien.kind].tint));
      materials.push({material: part.material, emissive: part.material.emissive.clone()});
    }
  });
  alien.group.add(visual);
  alien.detail = visual;
  alien.materials = materials;
  alien.detailBaseY = visual.position.y;
  alien.detailBaseZ = visual.position.z;
  visual.visible = false;
  alien.mixer = new THREE.AnimationMixer(visual);
  alien.walkAction = alien.mixer.clipAction(alienClips.find(clip => /walk/i.test(clip.name)));
  alien.runAction = alien.mixer.clipAction(alienClips.find(clip => /run/i.test(clip.name)));
  alien.walkAction.play(); alien.runAction.play();
  alien.walkAction.setEffectiveWeight(alien.kind === 'brute' ? 1 : .35);
  alien.runAction.setEffectiveWeight(alien.kind === 'brute' ? 0 : .65);
}
new GLTFLoader().load('./assets/models/alien-grey-rigged.glb', gltf => {
  const visual = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(visual);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.y) || size.y <= 0) return;
  visual.scale.setScalar(2.1 / size.y);
  visual.position.set(-center.x * visual.scale.x, -bounds.min.y * visual.scale.y,
    -center.z * visual.scale.z);
  alienTemplate = visual;
  alienClips = gltf.animations;
  renderer.compileAsync(visual, camera, scene).catch(() => {});
  aliens.forEach(attachDetailedAlien);
}, undefined, error => console.warn('Detailed alien unavailable; using game model.', error));
function spawnAlien(x, z, kind = Math.random() < .18 ? 'brute' : Math.random() < .45 ? 'runner' : 'stalker') {
  const profile = alienKinds[kind];
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(profile.scale);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .66, 7, 14), alienSkin);
  body.position.y = 1.08; body.castShadow = true; group.add(body);
  const chest = sphere(group, .39, 0, 1.31, .17, alienShell);
  chest.scale.set(1.03, .9, .53);
  const head = sphere(group, .44, 0, 1.88, .08, alienSkin);
  head.scale.set(1.18, .79, .94);
  const jaw = sphere(group, .19, 0, 1.57, .37, alienShell);
  jaw.scale.set(1.35, .52, .9);
  const arms = [];
  for (const side of [-1, 1]) {
    const eye = sphere(group, .074, side * .22, 1.91, .43, alienEyes);
    eye.scale.set(1.3, .55, .4);
    const arm = new THREE.Group();
    arm.position.set(side * .37, 1.43, 0);
    rod(arm, [0, 0, 0], [side * .26, -.46, .2], .115, alienSkin);
    rod(arm, [side * .26, -.46, .2], [side * .24, -.95, .48], .075, alienSkin);
    for (let claw = -1; claw <= 1; claw++) {
      rod(arm, [side * .24, -.95, .48], [side * .24 + claw * .065, -1.14, .68], .023, alienShell);
    }
    group.add(arm); arms.push(arm);
    rod(group, [side * .21, .64, 0], [side * .32, .18, -.07], .14, alienSkin);
    rod(group, [side * .32, .18, -.07], [side * .36, .05, .28], .105, alienShell);
  }
  for (let i = 0; i < 3; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(.11, .38 + i * .13, 7), alienShell);
    spine.position.set(0, 1.2 + i * .25, -.36); spine.rotation.x = -.65;
    group.add(spine);
  }
  group.traverse((part) => { if (part.isMesh) part.userData.alien = group; });
  earth.add(group);
  const alien = { group, arms, fallbackParts: [...group.children], detail: null,
    kind, hp: profile.hp, speed: profile.speed, damage: profile.damage, range: profile.range,
    attackAt: 0, windupUntil: 0, spitAt: 0, hitUntil: 0, dyingAt: 0, phase: Math.random() * 7,
    heading: Math.random()*Math.PI*2, velocity: new THREE.Vector2() };
  aliens.push(alien);
  attachDetailedAlien(alien);
}
function canStand(x, z, radius = .58) {
  if (Math.abs(x) > 61 || Math.abs(z) > 93) return false;
  return !obstacles.some(o => Math.abs(x - o.x) < o.w / 2 + radius && Math.abs(z - o.z) < o.d / 2 + radius);
}
function spawnAtEdge(type) {
  for (let tries = 0; tries < 36; tries++) {
    const angle = Math.random() * Math.PI * 2, distance = 20 + Math.random() * 15;
    const x = camera.position.x + Math.cos(angle) * distance;
    const z = camera.position.z + Math.sin(angle) * distance;
    if (!canStand(x, z, 1)) continue;
    spawnAlien(x, z, type || (state.collected > 0 && Math.random() < .28 ? 'spitter' : undefined)); return;
  }
}
function updateHud() {
  ui.health.textContent = Math.ceil(state.health) + '%';
  ui.healthBar.style.width = state.health + '%';
  ui.oxygen.textContent = Math.ceil(state.oxygen) + '%';
  ui.oxygenBar.style.width = state.oxygen + '%';
  ui.ammo.textContent = inventory[activeWeapon].mag;
  ui.reserve.textContent = inventory[activeWeapon].reserve;
  ui.weaponName.textContent = weaponSpecs[activeWeapon].name;
  ui.loadout.textContent = `SLOT ${weaponOrder.indexOf(activeWeapon)+1} · `+
    `${weaponOrder.filter(id => inventory[id].owned).length}/5 UNLOCKED`;
  ui.progress.textContent = state.collected === 3
    ? `${Math.ceil(state.escapeLeft)}s UNTIL LAUNCH` : state.collected + ' / 3 CORES';
  ui.progress.classList.toggle('urgent',state.collected===3);
  ui.objective.textContent = state.collected === 3 ? 'Reach the escape ship' : 'Recover the power cores';
  const next = state.collected === 3
    ? { x: 0, z: -78, label: 'SHIP' }
    : cores.filter(c => !c.collected)
      .sort((a, b) => Math.hypot(a.x - camera.position.x, a.z - camera.position.z) -
        Math.hypot(b.x - camera.position.x, b.z - camera.position.z))[0];
  if (next) {
    const dx = next.x - camera.position.x, dz = next.z - camera.position.z;
    const distance = Math.round(Math.hypot(dx, dz));
    const relative = ((Math.atan2(dx, -dz) + state.yaw) * 180 / Math.PI + 360) % 360;
    const direction = ['AHEAD', 'AHEAD-RIGHT', 'RIGHT', 'BEHIND-RIGHT',
      'BEHIND', 'BEHIND-LEFT', 'LEFT', 'AHEAD-LEFT'][Math.round(relative / 45) % 8];
    ui.guidance.textContent = `${next.label}: ${distance}m ${direction}`;
  }
}
function selectWeapon(id, announce = true) {
  if (!inventory[id]?.owned || activeWeapon === id && announce) return;
  activeWeapon = id;
  const pose=weaponPoses[id];
  weapon.position.set(pose.x,pose.y,pose.z);
  state.reloadAt = 0;
  state.reloadingWeapon = null;
  state.lastShot = 0;
  for (const [key,model] of weaponModels) model.visible = key === id;
  muzzle.color.setHex(weaponSpecs[id].color);
  muzzle.position.z = weaponSpecs[id].tip;
  if (announce) { sound('pickup'); notice(`${weaponSpecs[id].name} EQUIPPED`,1.5); }
  updateHud();
}
function notice(message, seconds = 2.2) {
  ui.notice.textContent = message;
  ui.notice.classList.remove('hidden');
  state.noticeUntil = performance.now() + seconds * 1000;
}
function reset() {
  for (const a of aliens) earth.remove(a.group);
  aliens.length = 0;
  for (const shot of alienShots) { earth.remove(shot.mesh); shot.mesh.geometry.dispose(); shot.mesh.material.dispose(); }
  alienShots.length = 0;
  for (const c of cores) earth.remove(c.group);
  cores = coreSites.map(([x, z],i) => makeCore(x, z,
    ['CLINIC CORE','RELAY CORE','CRASH CORE'][i]));
  Object.assign(state, { mode: 'playing', health: 100, oxygen: 100,
    collected: 0, kills: 0, lastShot: 0, lastSpawn: performance.now(), reloadAt: 0,
    yaw: 0, pitch: 0, elapsed: 0, invulnerableUntil: 0, marsAt: 0,
    escapeLeft: 0, lastSiren: 0, launchStart: 0, hitUntil: 0 });
  ship.position.y = 0;
  shipFlame.visible = false;
  weapon.visible = true;
  beacon.intensity = 7;
  mars.visible = false; earth.visible = true;
  scene.background.setHex(0x111a1c); scene.fog.color.setHex(0x263135);
  scene.fog.density = .013;
  sun.color.setHex(0xb7a493); sun.intensity = 1.65;
  renderer.toneMappingExposure = 1.04;
  camera.position.set(0, 1.72, 79);
  camera.rotation.set(0, 0, 0);
  lastPointer = null;
  keys.clear();
  firing = false;
  for (const id of weaponOrder) {
    inventory[id].owned = id === 'pistol';
    inventory[id].mag = weaponSpecs[id].mag;
    inventory[id].reserve = weaponSpecs[id].reserve;
  }
  for (const pickup of weaponPickups) {
    pickup.collected = false; pickup.group.visible = true;
  }
  activeWeapon = 'pistol';
  selectWeapon('pistol',false);
  for (let i = 0; i < 3; i++) spawnAtEdge(i === 0 ? 'runner' : 'stalker');
  spawnAlien(-21,36,'runner');
  spawnAlien(35,-19,'brute');
  spawnAlien(-19,-55,'stalker');
  ui.hud.classList.remove('hidden');
  ui.overlay.classList.add('hidden');
  updateHud();
  notice('MISSION START', 2);
}
function pause() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  lastPointer = null;
  ui.copy.textContent = 'Mission paused. Return when you are ready.';
  ui.start.innerHTML = 'RESUME MISSION <span>→</span>';
  ui.overlay.classList.remove('hidden');
}
function resume() {
  initAudio();
  if (state.mode === 'menu' || state.mode === 'dead' || state.mode === 'won') reset();
  else { state.mode = 'playing'; ui.overlay.classList.add('hidden'); }
  requestMouseLock();
}
function requestMouseLock() {
  const result = renderer.domElement.requestPointerLock?.();
  if (result?.catch) result.catch(() => {});
}
function endGame(win, reason = '') {
  document.exitPointerLock?.();
  state.mode = win ? 'won' : 'dead';
  ui.hud.classList.add('hidden');
  ui.overlay.classList.remove('hidden');
  if (win) {
    ui.copy.textContent = 'The ship reached Mars. Beyond the red dunes, the lights of the last human colony are still on. Your crew made it home.';
    ui.start.innerHTML = 'PLAY AGAIN <span>→</span>';
  } else {
    ui.copy.textContent = reason || 'Your suit failed before you could escape Earth. The ship is still waiting at the launch site.';
    ui.start.innerHTML = 'TRY AGAIN <span>→</span>';
  }
}
function reload() {
  const ammo = inventory[activeWeapon], spec = weaponSpecs[activeWeapon];
  if (state.mode !== 'playing' || state.reloadAt || ammo.mag >= spec.mag || ammo.reserve <= 0) return;
  state.reloadAt = performance.now() + spec.reload;
  state.reloadingWeapon = activeWeapon;
  sound('reload');
  notice('RELOADING', 1.1);
}
function shoot() {
  const now = performance.now();
  const id = activeWeapon, spec = weaponSpecs[id], ammo = inventory[id];
  if (state.mode !== 'playing' || state.reloadAt || now - state.lastShot < spec.rate) return;
  if (ammo.mag <= 0) { reload(); return; }
  state.lastShot = now;
  ammo.mag--;
  state.fireUntil = now + (id==='minigun'?48:id==='sniper'?140:85);
  sound('shot',id);
  muzzle.intensity = id==='shotgun'||id==='sniper'?18:11;
  weapon.position.z = weaponPoses[id].z + (id==='sniper'?.18:id==='shotgun'?.16:id==='minigun'?.06:.09);
  const objects = [...aliens.flatMap(a => a.dyingAt ? [] :
    a.detail?.visible ? [a.detail] : a.fallbackParts.filter(part => part.visible)),
    ...obstacles.map(o => o.mesh)];
  for (let pellet=0; pellet<spec.pellets; pellet++) {
    const deviation = spec.spread;
    aim.set((Math.random()-.5)*deviation*2,(Math.random()-.5)*deviation*2);
    raycaster.setFromCamera(aim,camera);
    raycaster.far=spec.range;
    const hit=raycaster.intersectObjects(objects,true)[0];
    const start=weapon.localToWorld(new THREE.Vector3(.03,-.02,spec.tip));
    const end=hit?.point.clone() || raycaster.ray.direction.clone().multiplyScalar(spec.range).add(raycaster.ray.origin);
    const tracer=new THREE.Line(new THREE.BufferGeometry().setFromPoints([start,start.clone()]),
      new THREE.LineBasicMaterial({color:spec.color,transparent:true,
        opacity:id==='sniper'?.96:id==='shotgun'?.42:.73,depthWrite:false}));
    scene.add(tracer);
    tracers.push({mesh:tracer,start,end,born:now,travel:spec.travel,until:now+spec.travel+95,
      opacity:tracer.material.opacity});
    if (hit) {
      const spark=new THREE.Mesh(new THREE.SphereGeometry(id==='shotgun'?.045:.075,6,6),
        new THREE.MeshBasicMaterial({color:hit.object.userData.alien?0xff5548:spec.color}));
      spark.position.copy(hit.point); scene.add(spark); impacts.push({mesh:spark,until:now+140});
    }
    if (hit?.object.userData.alien) {
      const alien=aliens.find(a=>a.group===hit.object.userData.alien);
      if (alien && !alien.dyingAt) {
        const headshot=hit.object.geometry?.type==='SphereGeometry';
        alien.hp-=spec.damage*(headshot?1.5:1);
        alien.hitUntil=now+170;
        state.hitUntil=now+150;
        $('crosshair').classList.add('hit');
        sound('hit');
        if (alien.hp<=0) {
          alien.dyingAt=now; sound('kill'); state.kills++;
          if (state.kills%5===0) {
            ammo.reserve=Math.min(spec.reserve*2,ammo.reserve+spec.mag);
            notice('AMMO RECOVERED FROM FIELD CACHE');
          }
        }
      }
    }
  }
  aim.set(0,0);
  updateHud();
}
function interact() {
  if (state.mode !== 'playing') return;
  for (const c of cores) {
    if (!c.collected && Math.hypot(camera.position.x - c.x, camera.position.z - c.z) < 3.2) {
      c.collected = true; c.group.visible = false; state.collected++;
      state.oxygen = Math.min(100, state.oxygen + 22);
      sound('pickup');
      if (state.collected === 3) {
        state.escapeLeft = 120;
        state.lastSiren = 0;
        notice('ALL CORES SECURED // SHIP LAUNCHES IN 120 SECONDS', 4);
        for (let i=0;i<4;i++) spawnAtEdge(i===0?'brute':i===1?'runner':'stalker');
      } else {
        notice('POWER CORE SECURED // OXYGEN REFILLED', 3);
        spawnAtEdge(state.collected===2?'brute':'runner');
      }
      updateHud(); return;
    }
  }
  for (const pickup of weaponPickups) {
    if (!pickup.collected && Math.hypot(camera.position.x-pickup.x,camera.position.z-pickup.z)<3.4) {
      pickup.collected=true; pickup.group.visible=false;
      inventory[pickup.id].owned=true;
      selectWeapon(pickup.id,false);
      sound('pickup');
      notice(`${weaponSpecs[pickup.id].name} EQUIPPED // USE 1–5 TO SWITCH`,3);
      updateHud(); return;
    }
  }
  if (Math.hypot(camera.position.x, camera.position.z + 78) < 6) {
    if (state.collected === 3) launch();
    else notice('SHIP REQUIRES ' + (3 - state.collected) + ' MORE POWER CORES');
  }
}
function launch() {
  state.mode = 'launching';
  document.exitPointerLock?.();
  ui.hud.classList.add('hidden');
  weapon.visible = false;
  shipFlame.visible = true;
  sound('launch');
  notice('LAUNCH SEQUENCE INITIATED', 3.6);
  state.launchStart = performance.now();
  state.marsAt = state.launchStart + 3600;
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
  renderer.toneMappingExposure = 1.2;
  camera.position.set(0, 2.2, 25);
  camera.rotation.set(-.13, 0, 0);
  state.mode = 'arriving';
  state.marsAt = performance.now() + 4000;
  notice('MARS COLONY // HUMAN SIGNAL CONFIRMED', 4);
}
function updateAliens(dt, now) {
  if (now - state.lastSpawn > (state.collected === 3 ? 5000 : 8000) && aliens.length < 12) {
    spawnAtEdge(); state.lastSpawn = now;
  }
  const detailed = new Set(aliens.filter(a => a.detail && !a.dyingAt)
    .sort((a, b) => a.group.position.distanceToSquared(camera.position) -
      b.group.position.distanceToSquared(camera.position)).slice(0, 1));
  for (const a of [...aliens]) {
    if (a.dyingAt) {
      const death = Math.min(1,(now-a.dyingAt)/620);
      a.group.rotation.z = death * Math.PI * .48;
      a.group.position.y = -death * .8;
      a.group.scale.setScalar(alienKinds[a.kind].scale * (1-death*.32));
      if (death >= 1) {
        earth.remove(a.group);
        aliens.splice(aliens.indexOf(a),1);
      }
      continue;
    }
    const showDetail = detailed.has(a) && a.group.position.distanceTo(camera.position) < 24;
    if (a.detail) a.detail.visible = showDetail;
    for (const part of a.fallbackParts) part.visible = !showDetail;
    const p = a.group.position;
    const dx = camera.position.x - p.x, dz = camera.position.z - p.z;
    const dist = Math.hypot(dx, dz);
    const desired = new THREE.Vector2();
    if (dist < 48 && !a.windupUntil && !a.spitAt && (a.kind==='spitter' || dist > a.range*.78)) {
      const approach = a.kind==='spitter' && dist < 8 ? -1 : 1;
      if (a.kind!=='spitter' || dist > 10 || dist < 8) desired.set(dx/dist*approach,dz/dist*approach);
      for (const other of aliens) if (other!==a && !other.dyingAt) {
        const sx=p.x-other.group.position.x, sz=p.z-other.group.position.z;
        const gap=Math.hypot(sx,sz);
        if (gap>.01 && gap<2.3) desired.add(new THREE.Vector2(sx,sz)
          .multiplyScalar((2.3-gap)/(gap*2.3)));
      }
      if (a.kind==='runner') {
        const weave=Math.sin(now*.0018+a.phase)*.18;
        desired.add(new THREE.Vector2(-dz/dist,dx/dist).multiplyScalar(weave));
      }
      desired.normalize().multiplyScalar(a.speed);
    }
    a.velocity.lerp(desired,Math.min(1,dt*(a.kind==='brute'?2:3.5)));
    const nx=p.x+a.velocity.x*dt, nz=p.z+a.velocity.y*dt;
    if (canStand(nx,nz,.45)) {p.x=nx;p.z=nz;}
    else if (canStand(nx,p.z,.45)) {p.x=nx;a.velocity.y=0;}
    else if (canStand(p.x,nz,.45)) {p.z=nz;a.velocity.x=0;}
    else a.velocity.set(0,0);
    const targetHeading=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
    const headingDelta=Math.atan2(Math.sin(targetHeading-a.heading),Math.cos(targetHeading-a.heading));
    a.heading+=THREE.MathUtils.clamp(headingDelta,-dt*3.3,dt*3.3);
    a.group.rotation.y=a.heading;
    const stride = Math.sin(now * .011 * a.speed + a.phase);
    a.group.position.y = Math.abs(stride) * .022;
    a.group.scale.setScalar(alienKinds[a.kind].scale * (now<a.hitUntil?1.1:1));
    a.arms[0].rotation.x = stride * .34 - (a.windupUntil ? .6 : 0);
    a.arms[1].rotation.x = -stride * .34 - (a.windupUntil ? .6 : 0);
    if (a.detail) {
      a.detail.position.y = a.detailBaseY + Math.abs(stride)*.02;
      a.detail.position.z = a.detailBaseZ + (a.windupUntil ? .24 : 0);
      a.detail.rotation.z = stride*.023 + (a.windupUntil ? .09 : 0);
      a.detail.rotation.x = a.windupUntil ? -.17 : 0;
      if (showDetail && a.mixer) {
        const runWeight=a.kind==='runner' ? .92 : a.kind==='brute' ? .12 : .55;
        a.runAction.setEffectiveWeight(runWeight);
        a.walkAction.setEffectiveWeight(1-runWeight);
        a.mixer.timeScale = a.windupUntil ? .25 : Math.max(.2,a.velocity.length()/a.speed);
        a.mixer.update(dt);
      }
      for (const {material,emissive} of a.materials) {
        material.emissive.copy(emissive);
        if (now < a.hitUntil) material.emissive.setHex(0xff3520);
        else if (a.spitAt) material.emissive.setHex(0x42e9c9);
        else if (a.windupUntil) material.emissive.setHex(0xff4f18);
        material.emissiveIntensity = a.spitAt || a.windupUntil ? .7 : now<a.hitUntil ? .8 : 1;
      }
    }
    if (a.kind==='spitter') {
      if (!a.spitAt && now >= a.attackAt && dist > 3 && dist < 20) {
        a.spitAt = now + 650;
        sound('warning');
      }
      if (a.spitAt && now >= a.spitAt) {
        a.spitAt = 0;
        a.attackAt = now + 2700;
        if (dist < 22) fireAlienShot(a, now);
      }
      continue;
    }
    if (dist < a.range && !a.windupUntil && now >= a.attackAt) {
      a.windupUntil = now + (a.kind==='runner'?350:550);
      if (dist < 9) sound('warning');
    }
    if (a.windupUntil && now >= a.windupUntil) {
      a.windupUntil = 0;
      a.attackAt = now + (a.kind==='brute'?1750:1200);
      if (dist < a.range+.25 && now > state.invulnerableUntil) {
        state.health = Math.max(0,state.health-a.damage);
        state.invulnerableUntil = now + 450;
        ui.damage.style.opacity = .85;
        setTimeout(() => ui.damage.style.opacity = 0, 180);
        sound('damage');
        updateHud();
        if (state.health <= 0) endGame(false);
      }
    } else if (a.windupUntil && dist > a.range+1) {
      a.windupUntil = 0;
      a.attackAt = now + 500;
    }
  }
}
function fireAlienShot(alien, now) {
  if (alienShots.length >= 14) return;
  const origin = alien.group.position;
  const direction = new THREE.Vector3(camera.position.x-origin.x, 0, camera.position.z-origin.z).normalize();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(.2, 12, 8),
    new THREE.MeshBasicMaterial({color: 0x77ffdf}));
  mesh.position.set(origin.x, 1.55, origin.z);
  earth.add(mesh);
  alienShots.push({mesh, direction, born:now});
  sound('spit');
}
function updateAlienShots(dt, now) {
  for (let i=alienShots.length-1; i>=0; i--) {
    const shot=alienShots[i];
    shot.mesh.position.addScaledVector(shot.direction, dt*11);
    const p=shot.mesh.position;
    const hit=Math.hypot(p.x-camera.position.x,p.z-camera.position.z)<.75;
    if (hit && now>state.invulnerableUntil) {
      state.health=Math.max(0,state.health-9);
      state.invulnerableUntil=now+450;
      ui.damage.style.opacity=.85;
      setTimeout(() => ui.damage.style.opacity=0,180);
      sound('damage'); updateHud();
      if (state.health<=0) endGame(false);
    }
    if (hit || now-shot.born>2200 || !canStand(p.x,p.z,.15)) {
      earth.remove(shot.mesh);
      shot.mesh.geometry.dispose(); shot.mesh.material.dispose();
      alienShots.splice(i,1);
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
  if (!label) for (const pickup of weaponPickups) {
    if (!pickup.collected && Math.hypot(camera.position.x-pickup.x,camera.position.z-pickup.z)<3.4) {
      label=`<b>E</b> TAKE ${weaponSpecs[pickup.id].name}`; break;
    }
  }
  if (!label && Math.hypot(camera.position.x, camera.position.z + 78) < 6)
    label = state.collected === 3 ? '<b>E</b> BOARD SHIP AND LAUNCH' : 'SHIP NEEDS ' + (3 - state.collected) + ' POWER CORES';
  ui.prompt.innerHTML = label;
  ui.prompt.classList.toggle('hidden', !label);
}
const walkForward = new THREE.Vector3();
const walkRight = new THREE.Vector3();
function updateMovement(dt) {
  const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
  const strafe = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
  if (!forward && !strafe) {
    weapon.position.y += (weaponPoses[activeWeapon].y-weapon.position.y)*Math.min(1,dt*10);
    return;
  }
  const length = Math.hypot(forward, strafe);
  const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? 9 : 6;
  // Movement reads the same heading as mouse look, without waiting for a camera matrix update.
  walkForward.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
  walkRight.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
  const dx = (walkForward.x * forward + walkRight.x * strafe) / length * speed * dt;
  const dz = (walkForward.z * forward + walkRight.z * strafe) / length * speed * dt;
  const x = camera.position.x + dx, z = camera.position.z + dz;
  if (canStand(x, camera.position.z)) camera.position.x = x;
  if (canStand(camera.position.x, z)) camera.position.z = z;
  weapon.position.y = weaponPoses[activeWeapon].y + Math.sin(state.elapsed * (speed * 1.3)) * .012;
}
function updateAtmosphere(dt, now) {
  if (!earth.visible) return;
  const positions = dustGeometry.attributes.position;
  for (let i = 0; i < dustCount; i++) {
    const j = i * 3;
    dustPositions[j] += dt * (1.2 + (i % 7) * .19);
    dustPositions[j + 1] += dt * (.05 + (i % 5) * .018);
    if (dustPositions[j] > 13) dustPositions[j] = -13;
    if (dustPositions[j + 1] > 5.5) dustPositions[j + 1] = -5.5;
  }
  positions.needsUpdate = true;
  for (let i = 0; i < streakCount; i++) {
    const j = i * 6, drift = dt * (1.5 + i % 4 * .45);
    streakPositions[j] += drift; streakPositions[j + 3] += drift;
    streakPositions[j + 1] += dt * .05; streakPositions[j + 4] += dt * .05;
    if (streakPositions[j] > 13) {
      const length = streakPositions[j + 3] - streakPositions[j];
      streakPositions[j] = -13; streakPositions[j + 3] = -13 + length;
    }
    if (streakPositions[j + 1] > 5.5) {
      streakPositions[j + 1] = -5.5; streakPositions[j + 4] = -5.475;
    }
  }
  streakGeometry.attributes.position.needsUpdate = true;
  for (let i = 0; i < fogBanks.length; i++) {
    const cloud = fogBanks[i];
    cloud.position.x += dt * (.35 + i % 4 * .09);
    cloud.material.rotation = Math.sin(now * .0003 + i) * .03;
    if (cloud.position.x > 64) cloud.position.x = -64;
  }
}
let previous = performance.now();
let hudAt = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - previous) / 1000, .05); previous = now;
  updateAtmosphere(dt, now);
  if (state.mode === 'playing') {
    state.elapsed += dt;
    updateMovement(dt);
    updateAliens(dt, now);
    updateAlienShots(dt, now);
    if (firing && weaponSpecs[activeWeapon].auto) shoot();
    for (const pickup of weaponPickups) if (!pickup.collected) {
      pickup.display.rotation.y += dt*.7;
      pickup.ring.rotation.z += dt*.5;
    }
    if (state.collected === 3) {
      state.escapeLeft = Math.max(0,state.escapeLeft-dt);
      beacon.intensity = 7 + Math.sin(now*.012)*4;
      if (now-state.lastSiren > 3500) { sound('siren'); state.lastSiren=now; }
      if (state.escapeLeft === 0) endGame(false,
        'The launch window closed. The ship departed before you reached the pad.');
    }
    for (const c of cores) if (!c.collected) {
      c.crystal.rotation.y += dt * 1.4;
      c.ring.rotation.z += dt * .5;
      c.crystal.position.y = 1.25 + Math.sin(now * .002) * .12;
    }
    if (state.reloadAt && now >= state.reloadAt) {
      const id=state.reloadingWeapon;
      const ammo=inventory[id], spec=weaponSpecs[id];
      const amount=Math.min(spec.mag-ammo.mag,ammo.reserve);
      ammo.mag+=amount; ammo.reserve-=amount;
      state.reloadAt=0; state.reloadingWeapon=null; updateHud();
    }
    state.oxygen = Math.max(0, state.oxygen - dt * .14);
    if (state.oxygen === 0) {
      state.health = Math.max(0, state.health - dt * 10);
      if (state.health === 0) endGame(false);
    }
    if (now - hudAt > 125) { updateHud(); updatePrompt(); hudAt = now; }
  } else if (state.mode === 'launching') {
    ship.position.y += dt*11;
    shipFlame.scale.y = .8 + Math.random()*.5;
    camera.position.y += dt*.35;
    camera.rotation.x = Math.max(-.45,camera.rotation.x-dt*.12);
    scene.fog.density = Math.max(.005,scene.fog.density-dt*.003);
    if (now >= state.marsAt) arriveMars();
  }
  else if (state.mode === 'arriving') {
    camera.position.z -= dt * 2.2;
    if (now >= state.marsAt) endGame(true);
  }
  if (state.noticeUntil && now >= state.noticeUntil) { ui.notice.classList.add('hidden'); state.noticeUntil = 0; }
  if (now > state.fireUntil) muzzle.intensity = 0;
  minigunSpin += ((activeWeapon==='minigun' && firing ? 18 : 0)-minigunSpin)*Math.min(1,dt*5);
  if (minigunRotor) minigunRotor.rotation.z += minigunSpin*dt;
  if (state.hitUntil && now > state.hitUntil) {
    $('crosshair').classList.remove('hit'); state.hitUntil=0;
  }
  for (let i=tracers.length-1;i>=0;i--) if (now>tracers[i].until) {
    const line=tracers[i].mesh; scene.remove(line);
    line.geometry.dispose(); line.material.dispose(); tracers.splice(i,1);
  }
  for (const tracer of tracers) {
    const t=Math.min(1,(now-tracer.born)/tracer.travel);
    const tip=tracer.start.clone().lerp(tracer.end,t);
    tracer.mesh.geometry.attributes.position.setXYZ(1,tip.x,tip.y,tip.z);
    tracer.mesh.geometry.attributes.position.needsUpdate=true;
    tracer.mesh.material.opacity=tracer.opacity*Math.min(1,(tracer.until-now)/95);
  }
  for (let i=impacts.length-1;i>=0;i--) if (now>impacts[i].until) {
    const spark=impacts[i].mesh; scene.remove(spark);
    spark.geometry.dispose(); spark.material.dispose(); impacts.splice(i,1);
  }
  weapon.position.z += (weaponPoses[activeWeapon].z - weapon.position.z) * Math.min(1, dt * 14);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

ui.start.addEventListener('click', resume);
renderer.domElement.addEventListener('click', () => {
  if (state.mode === 'playing' && document.pointerLockElement !== renderer.domElement) requestMouseLock();
});
document.addEventListener('pointerlockchange', () => {
  lastPointer = null;
  if (document.pointerLockElement !== renderer.domElement) {
    keys.clear(); firing=false;
    if (state.mode === 'playing') pause();
  }
});
let lastPointer = null;
window.addEventListener('pointermove', (event) => {
  if (state.mode !== 'playing') return;
  const locked = document.pointerLockElement === renderer.domElement;
  const dx = locked ? event.movementX : lastPointer ? event.clientX-lastPointer.x : 0;
  const dy = locked ? event.movementY : lastPointer ? event.clientY-lastPointer.y : 0;
  lastPointer = {x:event.clientX,y:event.clientY};
  state.yaw -= dx * .0023;
  state.pitch = THREE.MathUtils.clamp(state.pitch - dy * .0023, -1.35, 1.35);
  camera.rotation.set(state.pitch, state.yaw, 0);
});
window.addEventListener('pointerleave', () => { lastPointer = null; });
document.addEventListener('keydown', (event) => {
  if (/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Digit[1-5]|Shift(Left|Right))$/.test(event.code))
    event.preventDefault();
  keys.add(event.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyE') interact();
  if (/^Digit[1-5]$/.test(event.code)) selectWeapon(weaponOrder[Number(event.code.slice(-1))-1]);
  if (event.code === 'KeyM') {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : .18;
    notice(audio.muted ? 'AUDIO MUTED' : 'AUDIO ON',1.2);
  }
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('mousedown', (event) => {
  if (event.button===0 && event.target===renderer.domElement) { firing=true; shoot(); }
});
document.addEventListener('mouseup', (event) => { if (event.button===0) firing=false; });
window.addEventListener('blur', () => { keys.clear(); firing=false; if (state.mode==='playing') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { keys.clear(); firing=false; if (state.mode==='playing') pause(); }
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
