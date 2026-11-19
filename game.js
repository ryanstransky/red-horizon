import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

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
const clinicAlarm=new THREE.PointLight(0xff4934,0,15);
clinicAlarm.position.set(-29,2.8,30); earth.add(clinicAlarm);
// The broken central street leads into two walk-through routes around the block.
function routeWall(w,h,d,x,z,material=concrete) {
  const wall=block(earth,w,h,d,x,h/2,z,material);
  obstacles.push({x,z,w,d,mesh:wall});
  return wall;
}
routeWall(9.2,1.6,1.25,0,-12,rust);
for(const x of [-3.6,3.6]) {
  block(earth,2.1,.42,1.8,x,.25,-10.8,concrete);
  rod(earth,[x-.65,1.7,-12],[x+.4,2.45,-11.5],.055,darkMetal);
}
sign('ROAD CLOSED',0,-7,0);

// West: a roofless service passage connects the clinic side to the southern road.
block(earth,11.5,.04,15,-18,.025,-24,darkMetal,false);
for(const x of [-24,-12]) routeWall(.45,3.2,15,x,-24);
for(const z of [-30,-24,-18]) block(earth,12,.2,.35,-18,3.25,z,rust,false);
for(const z of [-27,-21]) {
  block(earth,.7,1.35,1.3,-22.9,.675,z,darkMetal);
  sphere(earth,.16,-22.9,1.45,z,orangeGlow);
}
const passageLight=new THREE.PointLight(0xff9362,3.2,12);
passageLight.position.set(-18,2.9,-24); earth.add(passageLight);
sign('SERVICE PASSAGE',-18,-14,0);

// East: a roofless repair garage has openings on both sides of the relay approach.
block(earth,12,.04,12,14,.025,-30,darkMetal,false);
for(const z of [-36,-24]) routeWall(12,3.1,.45,14,z);
for(const x of [8,20]) for(const z of [-34.5,-25.5]) routeWall(.45,3.1,3,x,z);
for(const z of [-35,-25]) block(earth,12,.22,.38,14,3.25,z,rust,false);
for(const x of [10,18]) {
  block(earth,1.1,1.2,.55,x,.6,-34.6,darkMetal);
  block(earth,.85,.18,.72,x,1.28,-34.6,rust);
}
const garageLight=new THREE.PointLight(0x73d9c5,3.5,13);
garageLight.position.set(14,2.8,-30); earth.add(garageLight);
sign('RELAY GARAGE',14,-21,0);
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
const defenseRing=new THREE.Mesh(new THREE.TorusGeometry(9,.095,8,64),
  new THREE.MeshBasicMaterial({color:0xff9b65,transparent:true,opacity:.65,depthWrite:false}));
defenseRing.rotation.x=Math.PI/2; defenseRing.position.set(0,.16,-78);
defenseRing.visible=false; earth.add(defenseRing);
const shipFlame = new THREE.Mesh(new THREE.ConeGeometry(1.3,5,16),
  new THREE.MeshBasicMaterial({color:0xff8948,transparent:true,opacity:.8}));
shipFlame.rotation.z = Math.PI; shipFlame.position.y = -2; shipFlame.visible = false;
ship.add(shipFlame);
// Keep the player and aliens outside the launch vehicle's solid hull.
obstacles.push({x:0,z:-78,w:7,d:7,mesh:ship});

// Keep the relay core outside the sealed building at x=25..35, z=-24..4.
const coreSites = [[-29, 30], [20, -28], [-25, -58]];
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
    reload:1450,range:75,auto:true,color:0x89ffda,travel:45,tip:-1.28},
  shotgun: {name:'SHOTGUN',mag:6,reserve:42,rate:720,damage:.75,pellets:8,spread:.055,
    reload:1800,range:28,auto:false,color:0xffa472,travel:38,tip:-1.2},
  sniper: {name:'SNIPER RIFLE',mag:5,reserve:35,rate:900,damage:6,pellets:1,spread:0,
    reload:2050,range:130,auto:false,color:0x8bddff,travel:22,tip:-1.49},
  minigun: {name:'MINIGUN',mag:120,reserve:360,rate:78,damage:.62,pellets:1,spread:.018,
    reload:3000,range:65,auto:true,color:0xffc36d,travel:32,tip:-1.2},
};
const weaponOrder = ['pistol','assault','shotgun','sniper','minigun'];
const weaponPoses = {
  pistol:{x:.42,y:-.49,z:-1.02}, assault:{x:.38,y:-.43,z:-1.13},
  shotgun:{x:.38,y:-.44,z:-1.12}, sniper:{x:.39,y:-.46,z:-1.18},
  minigun:{x:.4,y:-.45,z:-1.14},
};
const inventory = Object.fromEntries(weaponOrder.map(id => [id,{owned:id==='pistol',mag:weaponSpecs[id].mag,
  reserve:weaponSpecs[id].reserve}]));
const upgrades={optic:false,mags:false,power:false};
const magCapacity=id=>Math.ceil(weaponSpecs[id].mag*(upgrades.mags?1.5:1));
let activeWeapon = 'pistol';
let firing = false;
let aiming = false;
let aimHeld = false;
const weapon = new THREE.Group();
weapon.rotation.set(-.035,.32,-.045);
weapon.scale.setScalar(.9);
camera.add(weapon); scene.add(camera);
const suitLight = new THREE.PointLight(0xa9c4bb, 1.75, 11);
suitLight.position.set(0, -.12, -.35); camera.add(suitLight);
weapon.position.set(...Object.values(weaponPoses.pistol));
const suit = mat(0xa6b3ae, .24, .73), glove = mat(0x293a3d, .14, .92);
const grip = mat(0x18252a, .25, .7);
const weaponModels = new Map();
let minigunRotor = null, minigunSpin = 0;
const gunFinish = new THREE.MeshStandardMaterial({color:0x53636a,metalness:.46,roughness:.38});
const gunSteel = new THREE.MeshStandardMaterial({color:0x89989a,metalness:.6,roughness:.27});
const gunDark = new THREE.MeshStandardMaterial({color:0x1d292d,metalness:.32,roughness:.62});
const gunGrip = new THREE.MeshStandardMaterial({color:0x303b39,metalness:.08,roughness:.92});
const gunCopper = new THREE.MeshStandardMaterial({color:0xa47b57,metalness:.53,roughness:.43});
const gunLens = new THREE.MeshStandardMaterial({color:0x245c65,metalness:.34,roughness:.16,
  emissive:0x145971,emissiveIntensity:.34});
function equipmentTexture(base, seed) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, 256, 256);
  let value = seed;
  const random = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 11000; i++) {
    const shade = random() > .5 ? 255 : 0;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${.015 + random() * .06})`;
    ctx.fillRect(random() * 256, random() * 256, .5 + random() * 2, .5 + random() * 2);
  }
  for (let i = 0; i < 90; i++) {
    const x = random() * 256, y = random() * 256;
    ctx.strokeStyle = random() > .5 ? 'rgba(210,218,210,.13)' : 'rgba(8,15,17,.16)';
    ctx.lineWidth = .25 + random() * .5;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3 + random() * 24, y + random() * 2); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return texture;
}
gunFinish.map = equipmentTexture('#b7c2bf', 47);
gunSteel.map = equipmentTexture('#d5d9d2', 51);
gunDark.map = equipmentTexture('#a4b0ad', 67);
gunGrip.map = equipmentTexture('#b5b9ad', 77);
gunCopper.map = equipmentTexture('#d2bda1', 83);
for (const material of [gunFinish, gunSteel, gunDark, gunGrip, gunCopper]) material.needsUpdate = true;
function gunRivet(parent, x, y, z, radius=.009) {
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(radius, 6, 4), gunSteel);
  rivet.position.set(x,y,z); parent.add(rivet);
}
function gunLabel(parent, label, x, y, z, width=.18) {
  const canvas=document.createElement('canvas'); canvas.width=256; canvas.height=64;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#b7c4c1'; ctx.font='bold 33px monospace';
  ctx.textAlign='center'; ctx.fillText(label,128,43);
  const texture=new THREE.CanvasTexture(canvas);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),
    new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false}));
  mesh.position.set(x,y,z); parent.add(mesh);
  return mesh;
}
function gunSideMarkings(parent, label, halfWidth, y, z) {
  for (const side of [-1,1]) {
    const plate=gunPart(parent,.008,.068,.19,side*(halfWidth+.004),y,z,gunDark,.002);
    const marking=gunLabel(parent,label,side*(halfWidth+.01),y+.004,z,.14);
    marking.rotation.y=side*Math.PI/2;
    for (const offset of [-.075,.075]) gunRivet(parent,side*(halfWidth+.013),y-.021,z+offset,.006);
  }
}
function gunPart(parent,w,h,d,x,y,z,material=gunFinish,r=.025) {
  const mesh=new THREE.Mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.25,h*.25,d*.25)),material);
  mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}
function gunTube(parent,r,length,x,y,z,material=gunSteel,segments=12) {
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,length,segments),material);
  mesh.rotation.x=Math.PI/2; mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}
function gunRing(parent,r,x,y,z,material=gunSteel,tube=.014) {
  const mesh=new THREE.Mesh(new THREE.TorusGeometry(r,tube,6,14),material);
  mesh.position.set(x,y,z); parent.add(mesh); return mesh;
}
function gunSights(parent, frontZ, rearZ, height) {
  gunPart(parent,.07,.065,.035,0,height,frontZ,gunDark,.01);
  for(const x of [-.065,.065]) gunPart(parent,.035,.06,.055,x,height,rearZ,gunDark,.008);
  gunPart(parent,.035,.025,.025,0,height+.025,frontZ,gunSteel,.006);
}
function gunVentRows(parent,zPositions,x,y) {
  for(const z of zPositions) {
    gunPart(parent,.013,.026,.075,x,y,z,gunDark,.004);
    gunPart(parent,.013,.026,.075,-x,y,z,gunDark,.004);
  }
}
function buildGunHands() {
  const cuff=mat(0x697978,.27,.73), seam=mat(0x6a817f,.22,.78);
  const forearm=cylinder(weapon,.115,.135,.33,.33,-.4,.1,suit);
  forearm.rotation.x=.77;
  gunPart(weapon,.24,.16,.16,.31,-.28,.02,cuff,.035);
  gunPart(weapon,.16,.115,.19,.245,-.19,-.075,glove,.034).rotation.z=-.2;
  for(let i=0;i<3;i++) {
    const finger=gunPart(weapon,.042,.045,.13,.17+i*.048,-.145,-.16,glove,.015);
    finger.rotation.x=.35;
    gunPart(weapon,.034,.01,.07,.17+i*.048,-.12,-.17,seam,.004);
  }
  const support=cylinder(weapon,.065,.08,.19,-.15,-.28,-.47,cuff);
  support.rotation.x=-.45;
  gunPart(weapon,.18,.12,.19,-.125,-.2,-.53,glove,.035);
  for(let i=0;i<3;i++) gunPart(weapon,.037,.04,.14,-.17+i*.055,-.135,-.61,glove,.012);
}
buildGunHands();
const wakeHands=new THREE.Group();camera.add(wakeHands);wakeHands.visible=false;
for(const side of [-1,1]) {
  const sleeve=gunPart(wakeHands,.2,.21,.44,side*.43,-.44,-.38,suit,.045);
  sleeve.rotation.x=-.4; sleeve.rotation.z=side*.16;
  gunPart(wakeHands,.22,.16,.18,side*.44,-.29,-.65,glove,.035);
  for(let i=0;i<4;i++) {
    const finger=gunPart(wakeHands,.043,.07,.17,side*.44+(i-1.5)*.05,-.26,-.81,glove,.014);
    finger.rotation.x=-.22;
  }
  gunPart(wakeHands,.23,.035,.12,side*.43,-.36,-.55,gunDark,.012);
}
function buildGunModel(id) {
  const g = new THREE.Group();
  const accent=new THREE.MeshStandardMaterial({color:weaponSpecs[id].color,metalness:.32,roughness:.35,
    emissive:weaponSpecs[id].color,emissiveIntensity:.22});
  if (id==='pistol') {
    gunPart(g,.27,.145,.48,0,.015,-.35,gunFinish,.035);
    gunPart(g,.245,.065,.46,0,.1,-.36,gunSteel,.02);
    gunPart(g,.19,.037,.19,0,.103,-.34,gunDark,.008);
    gunPart(g,.15,.035,.11,0,.105,-.34,gunCopper,.005);
    const handle=gunPart(g,.185,.32,.155,.015,-.205,-.16,gunGrip,.028);
    handle.rotation.x=-.22;
    for(let i=0;i<5;i++) gunPart(g,.012,.012,.13,.112,-.29+i*.052,-.16,gunDark,.004);
    gunPart(g,.105,.09,.1,0,-.12,-.37,gunDark,.02);
    gunTube(g,.055,.23,0,.01,-.565,gunDark);
    gunRing(g,.052,0,.01,-.68,gunSteel,.012);
    gunPart(g,.16,.065,.04,0,-.02,-.175,accent,.012);
    gunSights(g,-.555,-.16,.17);
    gunPart(g,.16,.015,.07,0,-.14,-.25,gunSteel,.004);
  } else if (id==='assault') {
    gunPart(g,.32,.21,.48,0,0,-.36,gunFinish,.038);
    gunPart(g,.26,.13,.51,0,.015,-.73,gunDark,.025);
    gunTube(g,.055,.65,0,.015,-.89,gunSteel);
    gunTube(g,.08,.12,0,.015,-1.21,gunDark);
    gunRing(g,.067,0,.015,-1.28,gunSteel);
    gunPart(g,.32,.11,.29,0,-.015,-.04,gunGrip,.025);
    gunPart(g,.095,.28,.14,.015,-.235,-.22,gunGrip,.018).rotation.x=-.2;
    gunPart(g,.15,.29,.16,0,-.27,-.51,gunSteel,.018).rotation.x=.18;
    gunPart(g,.2,.035,.51,0,.14,-.52,gunSteel,.009);
    gunPart(g,.105,.08,.13,0,.215,-.43,gunDark,.015);
    gunPart(g,.048,.055,.025,0,.224,-.497,gunLens,.01);
    gunVentRows(g,[-.57,-.68,-.79,-.9],.13,.035);
    for(const z of [-.27,-.33,-.39]) gunPart(g,.016,.027,.037,.165,-.015,z,gunCopper,.004);
    gunPart(g,.21,.018,.36,0,-.095,-.73,accent,.006);
  } else if (id==='shotgun') {
    gunPart(g,.28,.18,.37,0,0,-.34,gunFinish,.035);
    gunPart(g,.24,.14,.31,0,-.025,-.66,gunCopper,.03);
    gunPart(g,.27,.13,.31,0,-.035,-.05,gunGrip,.03);
    gunPart(g,.12,.24,.14,.005,-.22,-.23,gunGrip,.025).rotation.x=-.18;
    gunTube(g,.065,.7,0,.055,-.85,gunSteel);
    gunTube(g,.046,.62,0,-.075,-.79,gunDark);
    gunRing(g,.065,0,.055,-1.2,gunDark,.012);
    gunPart(g,.22,.035,.48,0,.13,-.77,gunDark,.01);
    for(let z=-.57;z>-.83;z-=.065) gunPart(g,.245,.014,.012,0,-.115,z,gunDark,.003);
    for(let z=-.32;z>-.51;z-=.06) gunPart(g,.014,.045,.023,.145,.02,z,accent,.004);
    gunSights(g,-1.17,-.35,.17);
  } else if (id==='sniper') {
    gunPart(g,.29,.18,.45,0,-.015,-.38,gunFinish,.035);
    gunPart(g,.2,.12,.31,0,-.03,-.055,gunGrip,.03);
    gunPart(g,.105,.25,.13,.015,-.23,-.22,gunGrip,.02).rotation.x=-.2;
    gunPart(g,.16,.22,.14,0,-.24,-.49,gunSteel,.025).rotation.x=.12;
    gunTube(g,.044,.94,0,.005,-.97,gunSteel);
    gunTube(g,.075,.14,0,.005,-1.42,gunDark);
    for(const z of [-1.39,-1.44]) gunRing(g,.072,0,.005,z,gunSteel,.01);
    gunPart(g,.18,.05,.42,0,.11,-.42,gunDark,.012);
    gunTube(g,.105,.49,0,.255,-.47,gunDark,16);
    gunRing(g,.105,0,.255,-.715,gunSteel,.012);
    gunRing(g,.087,0,.255,-.225,gunSteel,.012);
    gunTube(g,.082,.012,0,.255,-.724,gunLens,16);
    for(const z of [-.32,-.58]) gunPart(g,.06,.08,.035,0,.16,z,gunSteel,.012);
    rod(g,[-.07,-.08,-1.03],[-.23,-.33,-1.15],.018,gunDark);
    rod(g,[.07,-.08,-1.03],[.23,-.33,-1.15],.018,gunDark);
    gunPart(g,.17,.025,.25,0,-.11,-.88,accent,.006);
    const bolt=sphere(g,.035,.18,.045,-.33,gunSteel,10);
    rod(g,[.1,.04,-.33],[.18,.045,-.33],.017,gunSteel);
  } else if (id==='minigun') {
    gunPart(g,.46,.36,.4,0,-.02,-.34,gunFinish,.06);
    gunPart(g,.36,.25,.25,0,-.03,-.06,gunGrip,.05);
    gunPart(g,.15,.28,.16,.29,-.08,-.33,gunDark,.025);
    gunTube(g,.16,.3,.27,-.08,-.33,gunSteel,16);
    gunPart(g,.15,.07,.25,0,.19,-.26,gunDark,.015);
    gunPart(g,.22,.05,.15,0,.25,-.21,gunSteel,.012);
    gunPart(g,.16,.24,.14,.02,-.28,-.2,gunGrip,.025);
    const rotor = new THREE.Group(); g.add(rotor); minigunRotor=rotor;
    for (let i=0;i<6;i++) {
      const a=i*Math.PI/3, x=Math.cos(a)*.145, y=Math.sin(a)*.145-.035;
      gunTube(rotor,.032,.68,x,y,-.86,gunSteel,10);
      gunRing(rotor,.034,x,y,-1.2,gunDark,.007);
    }
    for (const z of [-.6,-1.06]) {
      gunTube(rotor,.195,.055,0,-.035,z,gunDark,16);
      gunRing(rotor,.2,0,-.035,z,gunCopper,.014);
    }
    for(let i=0;i<5;i++) gunPart(g,.025,.035,.065,-.23,-.16,-.2-i*.055,gunCopper,.005);
    gunPart(g,.4,.035,.18,0,.12,-.5,accent,.008);
  } else {
    gunPart(g,.28,.17,.44,0,0,-.34,gunFinish,.035);
  }
  const markings = {
    pistol: ['M-9',.135,.032,-.39], assault: ['AR-7',.16,.025,-.38],
    shotgun: ['SG-4',.14,.018,-.34], sniper: ['LR-2',.145,.01,-.38],
    minigun: ['MX-6',.23,-.015,-.34]
  };
  if (markings[id]) gunSideMarkings(g,...markings[id]);
  if (id==='pistol') {
    for (const side of [-1,1]) {
      for (let i=0;i<6;i++) gunPart(g,.006,.009,.027,side*.126,.085,-.54+i*.047,gunDark,.002);
      gunRivet(g,side*.10,-.1,-.155,.011);
    }
  } else if (id==='assault' || id==='shotgun' || id==='sniper') {
    const railZ=id==='sniper'?-.4:id==='shotgun'?-.76:-.57;
    const railY=id==='sniper'?.145:id==='shotgun'?.155:.17;
    for(let i=0;i<6;i++) gunPart(g,.25,.012,.022,0,railY,railZ+(i-2.5)*.065,gunSteel,.003);
    for(const side of [-1,1]) {
      gunPart(g,.012,.11,.27,side*.16,-.16,-.05,gunGrip,.003);
      for(let i=0;i<4;i++) gunPart(g,.014,.006,.032,side*.169,-.21+i*.029,-.05,gunDark,.002);
    }
  } else if (id==='minigun') {
    for(const side of [-1,1]) {
      gunPart(g,.012,.27,.3,side*.235,-.018,-.35,gunDark,.003);
      for(let i=0;i<4;i++) gunPart(g,.016,.018,.035,side*.243,.075-i*.045,-.45,gunSteel,.003);
    }
  }
  gunPart(g,.08,.025,.15,0,.105,-.34,accent,.007);
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
const upgradeSites=[
  {id:'optic',name:'FOCUS OPTIC',x:-49,z:49,color:0x8bddff},
  {id:'mags',name:'EXTENDED MAGS',x:47,z:25,color:0xffd18b},
  {id:'power',name:'POWER CELL',x:-51,z:-57,color:0xff8e72},
];
const upgradeCaches=upgradeSites.map(site=>{
  const group=new THREE.Group(); group.position.set(site.x,0,site.z); earth.add(group);
  cylinder(group,.78,.9,.24,0,.15,0,darkMetal);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(.68,.05,8,28),
    new THREE.MeshBasicMaterial({color:site.color}));
  ring.rotation.x=Math.PI/2; ring.position.y=.34; group.add(ring);
  const display=new THREE.Group(); display.position.y=1.1; group.add(display);
  if(site.id==='optic') {
    gunTube(display,.21,.65,0,0,0,gunDark,18);
    gunRing(display,.22,0,0,-.32,gunSteel,.03);
    gunTube(display,.17,.035,0,0,-.35,gunLens,18);
  } else if(site.id==='mags') {
    for(const x of [-.17,.17]) gunPart(display,.24,.52,.2,x,0,0,gunSteel,.035);
    gunPart(display,.65,.11,.27,0,.31,0,gunDark,.02);
  } else {
    gunPart(display,.5,.48,.4,0,0,0,gunDark,.065);
    gunTube(display,.12,.5,0,0,0,
      new THREE.MeshBasicMaterial({color:site.color}),16);
    for(const y of [-.13,.13]) gunPart(display,.57,.045,.44,0,y,0,gunSteel,.01);
  }
  const glow=new THREE.PointLight(site.color,3.5,10); glow.position.y=1.2; group.add(glow);
  const canvas=document.createElement('canvas'); canvas.width=512; canvas.height=96;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='rgba(4,20,23,.88)'; ctx.fillRect(0,0,512,96);
  ctx.font='bold 40px sans-serif'; ctx.textAlign='center';
  ctx.fillStyle='#e6fff6'; ctx.fillText(site.name,256,62);
  const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas),
    transparent:true,depthWrite:false}));
  label.position.y=2.08; label.scale.set(1.9,.36,1); group.add(label);
  return {...site,group,ring,display,collected:false};
});

const aliens = [];
const alienShots = [];
const tracers = [];
const impacts = [];
const impactGeometry = new THREE.IcosahedronGeometry(1,0);
const keys = new Set();
const raycaster = new THREE.Raycaster();
const aim = new THREE.Vector2(0, 0);
const state = { mode: 'menu', health: 100, oxygen: 100,
  collected: 0, kills: 0, lastShot: 0, lastSpawn: 0, reloadAt: 0, noticeUntil: 0, fireUntil: 0,
  yaw: 0, pitch: 0, elapsed: 0, invulnerableUntil: 0, marsAt: 0, wakeStart: 0,
  escapeLeft: 0, lastSiren: 0, launchStart: 0, hitUntil: 0,
  clinicAmbushUntil: 0, clinicSecondWaveAt: 0,
  launchDefense: 'idle', launchCharge: 0, launchWave: 0 };
// Small synthesized effects keep the prototype self-contained and work after the first click.
const AUDIO_VOLUME = .4;
const audio = {context: null, master: null, muted: false, noise: null};
function setAudioStatus(message) {
  $('audio-status').textContent = message;
}
async function initAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) { setAudioStatus('Audio unavailable in this browser'); return false; }
  try {
    if (!audio.context) {
      audio.context = new AudioContextClass();
      audio.master = audio.context.createGain();
      audio.master.gain.value = audio.muted ? 0 : AUDIO_VOLUME;
      audio.master.connect(audio.context.destination);
      const buffer = audio.context.createBuffer(1, audio.context.sampleRate / 2, audio.context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i=0;i<data.length;i++) data[i] = Math.random() * 2 - 1;
      audio.noise = buffer;
      for (const freq of [110, 165]) {
        const osc = audio.context.createOscillator(), gain = audio.context.createGain();
        osc.type = 'sine'; osc.frequency.value = freq; gain.gain.value = .012;
        osc.connect(gain).connect(audio.master); osc.start();
      }
    }
    if (audio.context.state !== 'running') await audio.context.resume();
    const ready = audio.context.state === 'running';
    setAudioStatus(ready ? (audio.muted ? 'Audio muted — press M in game' : 'Audio ready') : 'Audio blocked by browser');
    return ready;
  } catch (error) {
    setAudioStatus('Audio could not start');
    console.warn('Audio could not start', error);
    return false;
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
  else if (kind === 'hit') { tone(520,290,.075,.17,'triangle'); noise(.045,.09); }
  else if (kind === 'critical') { tone(760,350,.12,.28,'triangle'); noise(.075,.11); }
  else if (kind === 'kill') { tone(440,170,.19,.3,'triangle'); noise(.1,.12); }
  else if (kind === 'damage') { tone(110,42,.35,.8); noise(.2,.25); }
  else if (kind === 'warning') tone(620,210,.28,.3,'square');
  else if (kind === 'spit') tone(390,105,.22,.25,'sawtooth');
  else if (kind === 'pickup') { tone(440,880,.3,.3,'sine'); tone(660,1100,.26,.17,'sine'); }
  else if (kind === 'reload') tone(95,180,.18,.25,'square');
  else if (kind === 'siren') { tone(260,620,.65,.32,'sine'); tone(620,260,.65,.25,'sine'); }
  else if (kind === 'launch') { tone(75,180,1.7,.65); noise(1.6,.35); }
  else if (kind === 'wake') { noise(.48,.12); tone(100,190,.55,.12,'sine'); }
  else if (kind === 'test') { tone(660,880,.22,.5,'sine'); setTimeout(() => tone(880,1100,.22,.5,'sine'),180); }
}
const alienSkin = new THREE.MeshStandardMaterial({
  map: gritTexture([69, 95, 82], 252, 1, 1), roughness: .78,
  emissive: 0x10231b, emissiveIntensity: .13
});
const alienShell = mat(0x344d49, .2, .65);
const alienEyes = mat(0x9ed6c4, .1, .42, 0x40c39e, .75);
const alienSkinByKind = {
  stalker: alienSkin,
  runner: alienSkin.clone(),
  brute: alienSkin.clone(),
  spitter: alienSkin.clone(),
};
alienSkinByKind.runner.color.setHex(0x91b4a4);
alienSkinByKind.brute.color.setHex(0xb39587);
alienSkinByKind.spitter.color.setHex(0x83b3ae);
const alienShellByKind = {
  stalker: alienShell,
  runner: mat(0x294942,.24,.62),
  brute: mat(0x664a43,.28,.65),
  spitter: mat(0x2b6460,.24,.57),
};
// Invisible, stable targets cover the entire silhouette while the visible model animates.
const hitboxMaterial = new THREE.MeshBasicMaterial({
  transparent: true, opacity: 0, colorWrite: false, depthWrite: false, side: THREE.DoubleSide
});
const hitboxGeometries = {
  head: new THREE.SphereGeometry(.5, 12, 8),
  torso: new THREE.CapsuleGeometry(.48, .62, 5, 10),
  limb: new THREE.CapsuleGeometry(.27, .9, 5, 10),
  leg: new THREE.CapsuleGeometry(.27, .45, 5, 10),
};
function makeAlienHitboxes(group) {
  const hitboxes = [];
  for (const [zone, geometry, position, scale, tilt] of [
    ['head', hitboxGeometries.head, [0, 1.9, .1], [1.12, .9, 1], 0],
    ['torso', hitboxGeometries.torso, [0, 1.06, .13], [1.12, 1, 1.15], 0],
    ['arm', hitboxGeometries.limb, [-.57, .98, .3], [1, 1, 1.55], -.2],
    ['arm', hitboxGeometries.limb, [.57, .98, .3], [1, 1, 1.55], .2],
    ['leg', hitboxGeometries.leg, [-.25, .38, 0], [1, 1, 1], 0],
    ['leg', hitboxGeometries.leg, [.25, .38, 0], [1, 1, 1], 0],
  ]) {
    const mesh = new THREE.Mesh(geometry, hitboxMaterial);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    mesh.rotation.z = tilt;
    mesh.userData.alien = group;
    mesh.userData.hitZone = zone;
    group.add(mesh);
    hitboxes.push(mesh);
  }
  return hitboxes;
}
const alienKinds = {
  stalker: {scale: 1, speed: 2.05, hp: 3, damage: 10, range: 1.7, tint: 0xdde9dc},
  runner: {scale: .76, speed: 3.35, hp: 2, damage: 7, range: 1.55, tint: 0xb9ffd9},
  brute: {scale: 1.4, speed: 1.3, hp: 7, damage: 18, range: 3.2, tint: 0xffb4a0},
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
}, undefined, error => console.warn('Detailed alien unavailable; using game model.', error));
function spawnAlien(x, z, kind = Math.random() < .18 ? 'brute' : Math.random() < .45 ? 'runner' : 'stalker') {
  const profile = alienKinds[kind];
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(profile.scale);
  const skin = alienSkinByKind[kind], shell = alienShellByKind[kind];
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .66, 7, 14), skin);
  body.position.y = 1.08; body.castShadow = true; group.add(body);
  const chest = sphere(group, .39, 0, 1.31, .17, shell);
  chest.scale.set(1.03, .9, .53);
  const head = sphere(group, .44, 0, 1.88, .08, skin);
  head.scale.set(1.18, .79, .94);
  const jaw = sphere(group, .19, 0, 1.57, .37, shell);
  jaw.scale.set(1.35, .52, .9);
  const arms = [];
  for (const side of [-1, 1]) {
    const eye = sphere(group, .074, side * .22, 1.91, .43, alienEyes);
    eye.scale.set(1.3, .55, .4);
    const arm = new THREE.Group();
    arm.position.set(side * .37, 1.43, 0);
    rod(arm, [0, 0, 0], [side * .26, -.46, .2], .115, skin);
    rod(arm, [side * .26, -.46, .2], [side * .24, -.95, .48], .075, skin);
    for (let claw = -1; claw <= 1; claw++) {
      rod(arm, [side * .24, -.95, .48], [side * .24 + claw * .065, -1.14, .68], .023, shell);
    }
    group.add(arm); arms.push(arm);
    rod(group, [side * .21, .64, 0], [side * .32, .18, -.07], .14, skin);
    rod(group, [side * .32, .18, -.07], [side * .36, .05, .28], .105, shell);
  }
  for (let i = 0; i < 3; i++) {
    const spine = new THREE.Mesh(new THREE.ConeGeometry(.11, .38 + i * .13, 7), shell);
    spine.position.set(0, 1.2 + i * .25, -.36); spine.rotation.x = -.65;
    group.add(spine);
  }
  for(let i=0;i<5;i++) {
    const rib=new THREE.Mesh(new THREE.TorusGeometry(.3-i*.025,.014,5,16,Math.PI*.85),shell);
    rib.position.set(0,1.33-i*.13,.22); rib.rotation.z=Math.PI*.075;
    group.add(rib);
  }
  if(kind==='brute') {
    for(const side of [-1,1]) {
      const plate=sphere(group,.24,side*.43,1.42,.05,shell); plate.scale.set(1.4,.58,1.4);
      for(let i=0;i<3;i++) {
        const spike=new THREE.Mesh(new THREE.ConeGeometry(.08,.28-i*.04,7),shell);
        spike.position.set(side*(.35+i*.12),1.52-i*.07,-.03); spike.rotation.z=side*.5;
        group.add(spike);
      }
    }
  } else if(kind==='runner') {
    for(const side of [-1,1]) {
      const fin=new THREE.Mesh(new THREE.ConeGeometry(.09,.33,7),shell);
      fin.position.set(side*.42,1.7,-.12); fin.rotation.z=side*.5; group.add(fin);
    }
  } else if(kind==='spitter') {
    const sacMaterial=mat(0x3b8275,.08,.37,0x2c9d83,.27);
    for(const side of [-1,1]) {
      const sac=sphere(group,.2,side*.33,1.32,-.17,sacMaterial);
      sac.scale.set(.9,1.35,.8);
      const gland=sphere(group,.065,side*.24,1.58,.28,alienEyes);
      gland.scale.set(.7,.8,.45);
    }
  }
  group.traverse((part) => { if (part.isMesh) part.userData.alien = group; });
  const fallbackParts = [...group.children];
  const hitboxes = makeAlienHitboxes(group);
  let telegraph=null;
  if (kind==='brute' || kind==='runner') {
    telegraph=new THREE.Mesh(new THREE.TorusGeometry(kind==='brute'?2.3:.88,.055,6,48),
      new THREE.MeshBasicMaterial({color:kind==='brute'?0xff7258:0xa1ffca,
        transparent:true,opacity:.4,depthWrite:false}));
    telegraph.rotation.x=Math.PI/2; telegraph.position.y=.05;
    telegraph.visible=false; group.add(telegraph);
  }
  earth.add(group);
  const alien = { group, arms, fallbackParts, hitboxes, telegraph, detail: null,
    kind, hp: profile.hp, speed: profile.speed, damage: profile.damage, range: profile.range,
    attackAt: 0, windupUntil: 0, spitAt: 0, hitUntil: 0, staggerUntil: 0,
    staggerSide: 1, dyingAt: 0, phase: Math.random() * 7,
    flankSide: Math.random()<.5?-1:1, dashReadyAt: 0, dashWindupUntil: 0,
    dashUntil: 0, dashHit: false, dashVector: new THREE.Vector2(),
    heading: Math.random()*Math.PI*2, velocity: new THREE.Vector2() };
  aliens.push(alien);
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
function spawnEncounterAlien(x,z,kind) {
  if(aliens.filter(a=>!a.dyingAt).length>=12) return;
  if(canStand(x,z,1)) spawnAlien(x,z,kind);
  else spawnAtEdge(kind);
}
function startClinicAmbush() {
  const now=performance.now();
  state.clinicAmbushUntil=now+9500;
  state.clinicSecondWaveAt=now+4600;
  for(const [x,z,kind] of [[-20,34,'runner'],[-35,29,'stalker'],[-27,42,'stalker']])
    spawnEncounterAlien(x,z,kind);
  sound('siren');
  notice('CLINIC ALARM // ALIENS AT THE EXITS',3.2);
}
const LAUNCH_CHARGE_SECONDS=18;
function startLaunchDefense() {
  state.launchDefense='charging';
  state.launchCharge=0; state.launchWave=1;
  defenseRing.visible=true;
  for(const [x,z,kind] of [[-15,-84,'runner'],[14,-88,'stalker']])
    spawnEncounterAlien(x,z,kind);
  sound('siren');
  notice('SHIP POWER-UP // DEFEND THE PAD FOR 18 SECONDS',3.6);
  updateHud();
}
function updateSetPieces(dt,now) {
  clinicAlarm.intensity=now<state.clinicAmbushUntil
    ? 3.5+Math.sin(now*.018)*2.5 : 0;
  if(state.clinicSecondWaveAt && now>=state.clinicSecondWaveAt) {
    state.clinicSecondWaveAt=0;
    spawnEncounterAlien(-18,28,'spitter');
    notice('CLINIC AMBUSH // RANGED ALIEN INBOUND',2.6);
  }
  if(state.launchDefense!=='charging') return;
  const onPad=Math.hypot(camera.position.x,camera.position.z+78)<9;
  if(onPad) state.launchCharge=Math.min(LAUNCH_CHARGE_SECONDS,state.launchCharge+dt);
  defenseRing.material.opacity=.48+Math.sin(now*.012)*.18;
  defenseRing.scale.setScalar(1+Math.sin(now*.008)*.015);
  if(state.launchWave===1 && state.launchCharge>=6) {
    state.launchWave=2;
    spawnEncounterAlien(0,-62,'brute');
    spawnEncounterAlien(-16,-66,'runner');
    notice('PAD BREACH // HOLD THE RING',2.4);
  }
  if(state.launchWave===2 && state.launchCharge>=12) {
    state.launchWave=3;
    spawnEncounterAlien(16,-66,'spitter');
    spawnEncounterAlien(-14,-88,'stalker');
    notice('FINAL WAVE // SHIP NEARLY READY',2.5);
  }
  if(state.launchCharge>=LAUNCH_CHARGE_SECONDS) {
    state.launchDefense='ready';
    defenseRing.material.color.setHex(0x8affca);
    beacon.color.setHex(0x8affca);
    sound('pickup');
    notice('SHIP POWERED // PRESS E AT THE PAD TO BOARD',4);
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
    `${weaponOrder.filter(id => inventory[id].owned).length}/5 GUNS · ${magCapacity(activeWeapon)} MAG`;
  $('upgrade-status').textContent=`FIELD UPGRADES ${Object.values(upgrades).filter(Boolean).length}/3`+
    (upgrades.optic?' · OPTIC':'')+(upgrades.mags?' · MAGS':'')+
    (upgrades.power?' · POWER':'');
  ui.progress.textContent = state.collected === 3
    ? state.launchDefense==='charging'
      ? `${Math.ceil(state.launchCharge)} / ${LAUNCH_CHARGE_SECONDS}s CHARGED · ${Math.ceil(state.escapeLeft)}s LEFT`
      : state.launchDefense==='ready'
        ? `SHIP READY · ${Math.ceil(state.escapeLeft)}s LEFT`
        : `${Math.ceil(state.escapeLeft)}s UNTIL LAUNCH`
    : state.collected + ' / 3 CORES';
  ui.progress.classList.toggle('urgent',state.collected===3);
  ui.objective.textContent = state.collected === 3
    ? state.launchDefense==='charging'
      ? Math.hypot(camera.position.x,camera.position.z+78)<9
        ? 'Defend the launch pad' : 'Return to the launch ring'
      : state.launchDefense==='ready' ? 'Board the powered ship' : 'Reach the escape ship'
    : 'Recover the power cores';
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
  for (const tracer of tracers) { scene.remove(tracer.mesh); tracer.mesh.geometry.dispose(); tracer.mesh.material.dispose(); }
  tracers.length = 0;
  for (const impact of impacts) { scene.remove(impact.mesh); impact.mesh.material.dispose(); }
  impacts.length = 0;
  $('crosshair').classList.remove('hit','critical','kill');
  $('hit-feedback').className = '';
  for (const c of cores) earth.remove(c.group);
  cores = coreSites.map(([x, z],i) => makeCore(x, z,
    ['CLINIC CORE','RELAY CORE','CRASH CORE'][i]));
  Object.assign(state, { mode: 'waking', health: 100, oxygen: 100,
    collected: 0, kills: 0, lastShot: 0, lastSpawn: performance.now(), reloadAt: 0,
    yaw: 0, pitch: 0, elapsed: 0, invulnerableUntil: 0, marsAt: 0, wakeStart: performance.now(),
    escapeLeft: 0, lastSiren: 0, launchStart: 0, hitUntil: 0,
    clinicAmbushUntil: 0, clinicSecondWaveAt: 0,
    launchDefense: 'idle', launchCharge: 0, launchWave: 0 });
  ship.position.y = 0;
  shipFlame.visible = false;
  defenseRing.visible=false; defenseRing.scale.setScalar(1);
  defenseRing.material.color.setHex(0xff9b65);
  beacon.color.setHex(0xff9b65);
  clinicAlarm.intensity=0;
  weapon.visible = false;
  wakeHands.visible = true;
  wakeHands.position.set(0,-.2,0);
  $('wake-sequence').style.setProperty('--lid','50');
  $('wake-line').textContent='Regaining consciousness';
  $('wake-sequence').classList.remove('hidden');
  $('arrival-caption').classList.add('hidden');
  beacon.intensity = 7;
  mars.visible = false; earth.visible = true;
  ui.overlay.classList.remove('won');
  ui.overlay.querySelector('.eyebrow').textContent='AN ORIGINAL FIRST-PERSON SURVIVAL GAME';
  ui.overlay.querySelector('h1').innerHTML='RED <span>HORIZON</span>';
  scene.background.setHex(0x111a1c); scene.fog.color.setHex(0x263135);
  scene.fog.density = .013;
  sun.color.setHex(0xb7a493); sun.intensity = 1.65;
  renderer.toneMappingExposure = 1.04;
  camera.position.set(0, .28, 81);
  camera.rotation.set(-.9,0,.48);
  lastPointer = null;
  keys.clear();
  firing = false;
  for (const id of weaponOrder) {
    inventory[id].owned = id === 'pistol';
    inventory[id].mag = weaponSpecs[id].mag;
    inventory[id].reserve = weaponSpecs[id].reserve;
  }
  for(const id of Object.keys(upgrades)) upgrades[id]=false;
  aiming=false; aimHeld=false; camera.fov=74; camera.updateProjectionMatrix();
  for (const pickup of weaponPickups) {
    pickup.collected = false; pickup.group.visible = true;
  }
  for(const cache of upgradeCaches) {
    cache.collected=false; cache.group.visible=true;
  }
  activeWeapon = 'pistol';
  selectWeapon('pistol',false);
  for (let i = 0; i < 3; i++) spawnAtEdge(i === 0 ? 'runner' : 'stalker');
  spawnAlien(-21,36,'runner');
  spawnAlien(35,-19,'brute');
  spawnAlien(-19,-55,'stalker');
  ui.hud.classList.add('hidden');
  ui.overlay.classList.add('hidden');
  updateHud();
}
const WAKE_SECONDS=5.2;
function finishWake() {
  if(state.mode!=='waking') return;
  state.mode='playing';
  state.lastSpawn=performance.now();
  state.yaw=0;state.pitch=0;
  camera.position.set(0,1.72,79);
  camera.rotation.set(0,0,0);
  wakeHands.visible=false;
  weapon.visible=true;
  $('wake-sequence').classList.add('hidden');
  ui.hud.classList.remove('hidden');
  keys.clear();lastPointer=null;
  notice('MISSION START // FIND THE POWER CORES',2.4);
  updateHud();
}
function updateWake(now) {
  const t=Math.min(1,(now-state.wakeStart)/(WAKE_SECONDS*1000));
  const smooth=(x)=>{const v=THREE.MathUtils.clamp(x,0,1);return v*v*(3-2*v);};
  const rise=smooth((t-.24)/.7);
  camera.position.set(0,.28+rise*1.44+Math.sin(now*.007)*.008,81-rise*2);
  camera.rotation.set(-.9+rise*.9,0,.48*(1-rise));
  wakeHands.position.y=-.2+smooth((t-.18)/.5)*.14-smooth((t-.73)/.22)*.3;
  wakeHands.rotation.x=-.18+rise*.22;
  wakeHands.visible=t>.13 && t<.94;
  let lid=50;
  if(t>.08) lid=50-42*smooth((t-.08)/.28);
  if(t>.46 && t<.67) lid=8+30*Math.sin((t-.46)/.21*Math.PI)**2;
  if(t>.86) lid=8-8*smooth((t-.86)/.12);
  $('wake-sequence').style.setProperty('--lid',lid.toFixed(1));
  $('wake-line').textContent=t<.32?'Regaining consciousness':
    t<.63?'Suit pressure stable':t<.86?'Get up. Find the ship.':'Move now.';
  if(t>=1) finishWake();
}
function pause() {
  if (state.mode !== 'playing') return;
  state.mode = 'paused';
  aiming=false; aimHeld=false;
  lastPointer = null;
  ui.copy.textContent = 'Mission paused. Return when you are ready.';
  ui.start.innerHTML = 'RESUME MISSION <span>→</span>';
  ui.overlay.classList.remove('hidden');
}
function resume() {
  const audioReady = initAudio();
  if (state.mode === 'menu' || state.mode === 'dead' || state.mode === 'won') reset();
  else { state.mode = 'playing'; ui.overlay.classList.add('hidden'); }
  requestMouseLock();
  audioReady.then(ready => { if (ready && state.mode === 'waking') sound('wake'); });
}
function requestMouseLock() {
  const result = renderer.domElement.requestPointerLock?.();
  if (result?.catch) result.catch(() => {});
}
function endGame(win, reason = '') {
  document.exitPointerLock?.();
  state.mode = win ? 'won' : 'dead';
  aiming=false; aimHeld=false;
  ui.hud.classList.add('hidden');
  $('wake-sequence').classList.add('hidden');
  wakeHands.visible=false;
  $('arrival-caption').classList.add('hidden');
  ui.overlay.classList.remove('hidden');
  ui.overlay.classList.toggle('won',win);
  if (win) {
    ui.overlay.querySelector('.eyebrow').textContent='MISSION COMPLETE // MARS ARRIVAL';
    ui.overlay.querySelector('h1').innerHTML='ARES <span>COLONY</span>';
    ui.copy.textContent = 'You landed at Ares Colony. The habitat doors are open, the lights are on, and humanity has another place to call home.';
    ui.start.innerHTML = 'PLAY AGAIN <span>→</span>';
  } else {
    ui.copy.textContent = reason || 'Your suit failed before you could escape Earth. The ship is still waiting at the launch site.';
    ui.start.innerHTML = 'TRY AGAIN <span>→</span>';
  }
}
function reload() {
  const ammo = inventory[activeWeapon], spec = weaponSpecs[activeWeapon];
  if (state.mode !== 'playing' || state.reloadAt || ammo.mag >= magCapacity(activeWeapon) ||
    ammo.reserve <= 0) return;
  state.reloadAt = performance.now() + spec.reload;
  state.reloadingWeapon = activeWeapon;
  sound('reload');
  notice('RELOADING', 1.1);
}
function spawnImpact(point, color, now, alienHit) {
  if (impacts.length > 90) return;
  const count=alienHit?5:3;
  for(let i=0;i<count;i++) {
    const mesh=new THREE.Mesh(impactGeometry,new THREE.MeshBasicMaterial({
      color,transparent:true,opacity:i===0?.95:.75,depthWrite:false}));
    mesh.position.copy(point);
    mesh.scale.setScalar(i===0?.11:.035+Math.random()*.035);
    scene.add(mesh);
    const speed=alienHit?1.5:1;
    impacts.push({mesh,born:now,until:now+(i===0?110:260+Math.random()*100),
      velocity:i===0?null:new THREE.Vector3((Math.random()-.5)*speed,
        Math.random()*speed,(Math.random()-.5)*speed)});
  }
}
function showHitFeedback(rank,now) {
  const marker=$('crosshair'), label=$('hit-feedback');
  marker.classList.remove('hit','critical','kill');
  label.className='';
  const kind=rank===3?'kill':rank===2?'critical':'hit';
  marker.classList.add(kind);
  label.classList.add('active',kind);
  label.textContent=rank===3?'ELIMINATED':rank===2?'CRITICAL HIT':'HIT';
  state.hitUntil=now+(rank===3?780:rank===2?650:510);
  sound(rank===3?'kill':rank===2?'critical':'hit');
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
  const objects = [...aliens.flatMap(a => a.dyingAt ? [] : a.hitboxes),
    ...obstacles.map(o => o.mesh)];
  let feedbackRank=0;
  for (let pellet=0; pellet<spec.pellets; pellet++) {
    const deviation = spec.spread*((upgrades.optic && (aiming || aimHeld)) ? .4 : 1);
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
    if (hit) spawnImpact(hit.point,hit.object.userData.alien?0xa1f5a0:spec.color,
      now,!!hit.object.userData.alien);
    if (hit?.object.userData.alien) {
      const alien=aliens.find(a=>a.group===hit.object.userData.alien);
      if (alien && !alien.dyingAt) {
        const headshot=hit.object.userData.hitZone==='head';
        alien.hp-=spec.damage*(upgrades.power?1.25:1)*(headshot?1.5:1);
        alien.hitUntil=now+170;
        alien.staggerUntil=now+240;
        alien.staggerSide=Math.random()<.5?-1:1;
        feedbackRank=Math.max(feedbackRank,headshot?2:1);
        if (alien.hp<=0) {
          alien.dyingAt=now; state.kills++;
          feedbackRank=3;
          if (state.kills%5===0) {
            ammo.reserve=Math.min(spec.reserve*2,ammo.reserve+spec.mag);
            notice('AMMO RECOVERED FROM FIELD CACHE');
          }
        }
      }
    }
  }
  if (feedbackRank) showHitFeedback(feedbackRank,now);
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
      if(c.label==='CLINIC CORE') startClinicAmbush();
      if (state.collected === 3) {
        state.escapeLeft = 120;
        state.lastSiren = 0;
        notice('ALL CORES SECURED // SHIP LAUNCHES IN 120 SECONDS', 4);
        for (let i=0;i<4;i++) spawnAtEdge(i===0?'brute':i===1?'runner':'stalker');
      } else if(c.label!=='CLINIC CORE') {
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
      inventory[pickup.id].mag=magCapacity(pickup.id);
      selectWeapon(pickup.id,false);
      sound('pickup');
      notice(`${weaponSpecs[pickup.id].name} EQUIPPED // USE 1–5 TO SWITCH`,3);
      updateHud(); return;
    }
  }
  for(const cache of upgradeCaches) {
    if (!cache.collected && Math.hypot(camera.position.x-cache.x,camera.position.z-cache.z)<3.4) {
      cache.collected=true; cache.group.visible=false; upgrades[cache.id]=true;
      if(cache.id==='mags') for(const id of weaponOrder)
        inventory[id].mag=Math.min(magCapacity(id),inventory[id].mag+
          Math.ceil(weaponSpecs[id].mag*.5));
      sound('pickup');
      notice(cache.id==='optic'?'FOCUS OPTIC INSTALLED // RIGHT MOUSE OR Q TO AIM':
        cache.id==='mags'?'EXTENDED MAGS INSTALLED // 50% MORE CAPACITY':
        'POWER CELL INSTALLED // 25% MORE DAMAGE',3.5);
      updateHud(); return;
    }
  }
  if (Math.hypot(camera.position.x, camera.position.z + 78) < 6) {
    if (state.collected === 3 && state.launchDefense==='idle') startLaunchDefense();
    else if (state.collected === 3 && state.launchDefense==='ready') launch();
    else if (state.collected === 3) notice('POWER-UP IN PROGRESS // STAY IN THE RING',1.8);
    else notice('SHIP REQUIRES ' + (3 - state.collected) + ' MORE POWER CORES');
  }
}
function launch() {
  state.mode = 'launching';
  document.exitPointerLock?.();
  ui.hud.classList.add('hidden');
  weapon.visible = false;
  defenseRing.visible=false;
  shipFlame.visible = true;
  sound('launch');
  notice('LAUNCH SEQUENCE INITIATED', 3.6);
  state.launchStart = performance.now();
  state.marsAt = state.launchStart + 3600;
}
let marsDust = null;
let marsDustPositions = null;
const MARS_ARRIVAL_SECONDS = 9;
function buildMars() {
  const soil = new THREE.MeshStandardMaterial({map:gritTexture([132,72,55],508,7,7),roughness:1});
  const rockMat = mat(0x744039,0,.95), ridgeMat=mat(0x8c4a39,0,1);
  const frameMat=mat(0x38454b,.63,.5), paleMat=mat(0xa9bbb8,.42,.65);
  const windowMat=mat(0x77b9af,.1,.43,0x4ae5be,.75);
  const amber=mat(0xffbd80,.12,.39,0xff873f,.9);
  const ground=block(mars,180,.4,180,0,-.38,0,soil,false);
  ground.receiveShadow=true;
  // Low ridges frame the colony while the approach and landing area stay clear.
  for(let i=0;i<17;i++) {
    const x=-88+i*11, z=-53-(i%3)*7;
    const ridge=new THREE.Mesh(new THREE.DodecahedronGeometry(6+(i*7)%8,1),ridgeMat);
    ridge.position.set(x,1,z); ridge.scale.set(1.3,.5,1.2); mars.add(ridge);
  }
  for(let i=0;i<9;i++) {
    const x=(i%2?-1:1)*(37+i*6), z=-30+i*9;
    const dune=new THREE.Mesh(new THREE.SphereGeometry(7+i%3*2,18,8),soil);
    dune.scale.set(1.9,.16,1.1); dune.position.set(x,.04,z); mars.add(dune);
  }
  const colony=[[-16,-20,6],[5,-26,9],[22,-17,5]];
  for(const [x,z,r] of colony) {
    cylinder(mars,r+.7,r+.7,.45,x,.15,z,frameMat,32);
    cylinder(mars,r-.3,r-.3,.08,x,.44,z,paleMat,32);
    for(let j=0;j<4;j++) {
      const a=j*Math.PI/2;
      const module=block(mars,r*.37,1.7,r*.42,x+Math.cos(a)*r*.38,1.35,z+Math.sin(a)*r*.38,paleMat);
      module.rotation.y=a;
      block(mars,r*.21,.45,.035,module.position.x,1.75,module.position.z+r*.23,windowMat,false);
    }
    const dome=new THREE.Mesh(new THREE.SphereGeometry(r,32,18,0,Math.PI*2,0,Math.PI/2),
      new THREE.MeshPhysicalMaterial({color:0xb6d0ca,metalness:.05,roughness:.16,transparent:true,
        opacity:.23,side:THREE.DoubleSide,depthWrite:false}));
    dome.position.set(x,.5,z); mars.add(dome);
    const baseRing=new THREE.Mesh(new THREE.TorusGeometry(r,.14,8,48),amber);
    baseRing.rotation.x=Math.PI/2; baseRing.position.set(x,.54,z); mars.add(baseRing);
    for(let j=0;j<8;j++) {
      const a=j*Math.PI/4;
      rod(mars,[x+Math.cos(a)*r,.5,z+Math.sin(a)*r],
        [x+Math.cos(a)*r*.72,r*.72,z+Math.sin(a)*r*.72],.047,frameMat);
    }
    const lamp=new THREE.PointLight(0x9eeedc,3,r*2.4);
    lamp.position.set(x,2.5,z); mars.add(lamp);
  }
  // Lit access corridors make the three habitats read as one settlement.
  for(const [ax,az,bx,bz] of [[-10,-20,-4,-24],[14,-23,18,-20]]) {
    const midX=(ax+bx)/2, midZ=(az+bz)/2, len=Math.hypot(bx-ax,bz-az);
    const passage=block(mars,2,2,len,midX,1.45,midZ,frameMat);
    passage.rotation.y=Math.atan2(bx-ax,bz-az);
    const strip=block(mars,.18,.05,len,midX,2.48,midZ,amber,false);
    strip.rotation.y=passage.rotation.y;
  }
  // Approach road and marked pad give the arriving ship a clear destination.
  block(mars,7,.09,26,-8,.02,2,frameMat,false);
  for(let z=-10;z<17;z+=3) block(mars,.13,.02,1.2,-8,.08,z,amber,false);
  cylinder(mars,7.8,7.8,.25,-8,.14,17,frameMat,40);
  const padRing=new THREE.Mesh(new THREE.TorusGeometry(6.6,.16,8,48),amber);
  padRing.rotation.x=Math.PI/2; padRing.position.set(-8,.29,17); mars.add(padRing);
  for(const [x,z] of [[-14,11],[-2,11],[-14,23],[-2,23]]) {
    cylinder(mars,.18,.3,2.4,x,1.35,z,frameMat,10);
    sphere(mars,.23,x,2.63,z,amber,12);
    const light=new THREE.PointLight(0xffa769,2.2,10);light.position.set(x,2.6,z);mars.add(light);
  }
  const lander=new THREE.Group();lander.position.set(-8,.32,17);mars.add(lander);
  cylinder(lander,1.65,2.25,2.7,0,2.85,0,paleMat,20);
  const cockpit=new THREE.Mesh(new THREE.SphereGeometry(1.55,24,14,0,Math.PI*2,0,Math.PI/2),
    mat(0x31535c,.3,.2,0x103b45,.2));
  cockpit.position.y=4.25;lander.add(cockpit);
  cylinder(lander,1.7,1.7,.22,0,4.24,0,frameMat,20);
  cylinder(lander,.7,1.2,1.4,0,1,0,frameMat,16);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2,x=Math.cos(a),z=Math.sin(a);
    rod(lander,[x*1.6,3.5,z*1.6],[x*3,.45,z*3],.11,frameMat);
    block(lander,.9,.16,.9,x*3,.3,z*3,paleMat);
    const fin=block(lander,.18,1.4,1.3,x*1.8,2.5,z*1.8,frameMat);
    fin.rotation.y=a;
  }
  for(let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    const port=sphere(lander,.18,Math.cos(a)*1.68,3.2,Math.sin(a)*1.68,windowMat,10);
    port.scale.set(.55,.75,.55);
  }
  const hullMark=block(lander,.65,.16,.025,0,2.8,2.02,amber,false);
  hullMark.material.emissiveIntensity=.5;
  for(const [x,z] of [[-29,-12],[32,-13]]) {
    const post=cylinder(mars,.12,.24,3.1,x,1.55,z,frameMat,10);
    for(const side of [-1,1]) {
      const panel=block(mars,3.8,.08,1.8,x+side*2.3,2.1,z,mat(0x234752,.25,.28));
      panel.rotation.z=side*.14;
      for(let j=0;j<3;j++) block(mars,.045,.025,1.82,x+side*2.3+(j-1)*1.1,2.17,z,paleMat,false);
    }
  }
  cylinder(mars,.2,.4,9,30,4.5,-34,frameMat,12);
  for(const h of [5.5,7.3]) {
    const dish=new THREE.Mesh(new THREE.TorusGeometry(.9,.08,8,24),paleMat);
    dish.position.set(30,h,-34);dish.rotation.x=.45;mars.add(dish);
  }
  sphere(mars,.3,30,9.2,-34,amber,12);
  for(let i=0;i<85;i++) {
    const x=((i*41)%166)-83,z=((i*67)%155)-77;
    if(Math.abs(x)<29 && z>-35 && z<32) continue;
    const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.25+i%5*.17,0),i%3?soil:rockMat);
    rock.position.set(x,.06,z);rock.scale.set(1.4,.5,.9);mars.add(rock);
  }
  const earthInSky = sphere(mars, 1.4, -47, 38, -72, mat(0x8fd3de, 0, 1, 0x387fa3, .45), 24);
  earthInSky.material.fog = false;
  const dustCount=220;
  marsDustPositions=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++) {
    marsDustPositions[i*3]=(i*73%110)-55;
    marsDustPositions[i*3+1]=.35+(i*19%30)*.16;
    marsDustPositions[i*3+2]=(i*47%100)-45;
  }
  const dustGeometry=new THREE.BufferGeometry();
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(marsDustPositions,3));
  marsDust=new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:0xffc095,size:.1,
    transparent:true,opacity:.47,depthWrite:false}));mars.add(marsDust);
}
buildMars();
function arriveMars() {
  earth.visible = false; mars.visible = true;
  weapon.visible=false;
  ui.hud.classList.add('hidden');
  ui.overlay.classList.add('hidden');
  scene.background.setHex(0x6e4544);
  scene.fog.color.setHex(0x985c4d); scene.fog.density = .007;
  sun.color.setHex(0xffd5a3); sun.intensity = 2.8;
  renderer.toneMappingExposure = 1.18;
  camera.position.set(7,13,57);
  camera.lookAt(0,3,-24);
  state.mode = 'arriving';
  state.arrivalStart=performance.now();
  state.marsAt = state.arrivalStart + MARS_ARRIVAL_SECONDS*1000;
  $('arrival-line').textContent='Approaching the landing zone';
  $('arrival-caption').classList.remove('hidden');
}
function updateAliens(dt, now) {
  if (state.launchDefense!=='charging' &&
    now - state.lastSpawn > (state.collected === 3 ? 5000 : 8000) && aliens.length < 12) {
    spawnAtEdge(); state.lastSpawn = now;
  }
  const detailed = new Set(aliens.filter(a => !a.dyingAt)
    .sort((a, b) => a.group.position.distanceToSquared(camera.position) -
      b.group.position.distanceToSquared(camera.position)).slice(0, 3));
  if (alienTemplate) for (const a of detailed) {
    if (a.group.position.distanceToSquared(camera.position) < 24 * 24) attachDetailedAlien(a);
  }
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
    if (a.kind==='runner') {
      if (a.dashWindupUntil && now>=a.dashWindupUntil) {
        a.dashWindupUntil=0; a.dashUntil=now+520; a.dashHit=false;
      }
      if (!a.dashWindupUntil && now>=a.dashReadyAt && dist>3.5 && dist<11) {
        a.dashWindupUntil=now+460;
        a.dashReadyAt=now+3900;
        a.dashVector.set(dx/dist,dz/dist);
        if (dist<9) sound('warning');
      }
    }
    const desired = new THREE.Vector2();
    if (a.dashUntil>now) desired.copy(a.dashVector).multiplyScalar(9);
    else if (dist < 48 && !a.windupUntil && !a.spitAt && !a.dashWindupUntil &&
      (a.kind==='spitter' || dist > a.range*.78)) {
      if (a.kind==='spitter') {
        const radial=dist<9?-1:dist>15?1:0;
        desired.set(dx/dist*radial-dz/dist*a.flankSide*.9,
          dz/dist*radial+dx/dist*a.flankSide*.9);
      } else if (a.kind==='runner' && dist<16) {
        desired.set(dx/dist*.65-dz/dist*a.flankSide*.75,
          dz/dist*.65+dx/dist*a.flankSide*.75);
      } else desired.set(dx/dist,dz/dist);
      for (const other of aliens) if (other!==a && !other.dyingAt) {
        const sx=p.x-other.group.position.x, sz=p.z-other.group.position.z;
        const gap=Math.hypot(sx,sz);
        if (gap>.01 && gap<2.3) desired.add(new THREE.Vector2(sx,sz)
          .multiplyScalar((2.3-gap)/(gap*2.3)));
      }
      desired.normalize().multiplyScalar(a.speed);
    }
    a.velocity.lerp(desired,Math.min(1,dt*(a.dashUntil>now?16:a.kind==='brute'?2:3.5)));
    const nx=p.x+a.velocity.x*dt, nz=p.z+a.velocity.y*dt;
    if (canStand(nx,nz,.45)) {p.x=nx;p.z=nz;}
    else if (canStand(nx,p.z,.45)) {p.x=nx;a.velocity.y=0;}
    else if (canStand(p.x,nz,.45)) {p.z=nz;a.velocity.x=0;}
    else a.velocity.set(0,0);
    if (a.dashUntil>now && !a.dashHit &&
      Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<1.25) {
      a.dashHit=true; a.dashUntil=0;
      if (now>state.invulnerableUntil) {
        state.health=Math.max(0,state.health-a.damage);
        state.invulnerableUntil=now+450;
        ui.damage.style.opacity=.85;
        setTimeout(() => ui.damage.style.opacity=0,180);
        sound('damage'); updateHud();
        if (state.health<=0) endGame(false);
      }
    }
    const targetHeading=Math.atan2(camera.position.x-p.x,camera.position.z-p.z);
    const headingDelta=Math.atan2(Math.sin(targetHeading-a.heading),Math.cos(targetHeading-a.heading));
    a.heading+=THREE.MathUtils.clamp(headingDelta,-dt*3.3,dt*3.3);
    a.group.rotation.y=a.heading;
    a.group.rotation.z=Math.max(0,(a.staggerUntil-now)/240)*a.staggerSide*.21;
    const stride = Math.sin(now * .011 * a.speed + a.phase);
    a.group.position.y = Math.abs(stride) * .022;
    a.group.scale.setScalar(alienKinds[a.kind].scale *
      (now<a.hitUntil?1.1:a.dashWindupUntil?1+.06*Math.sin(now*.03):1));
    if (a.telegraph) {
      const charging=a.kind==='brute'?a.windupUntil>now:a.dashWindupUntil>now;
      a.telegraph.visible=charging;
      if (charging) {
        a.telegraph.material.opacity=.45+.3*Math.sin(now*.025);
        a.telegraph.rotation.z+=dt*1.8;
      }
    }
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
        else if (a.spitAt || a.dashWindupUntil) material.emissive.setHex(0x42e9c9);
        else if (a.windupUntil) material.emissive.setHex(0xff4f18);
        material.emissiveIntensity = a.spitAt || a.windupUntil || a.dashWindupUntil
          ? .18 : now<a.hitUntil ? .3 : 1;
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
    if (dist < a.range && !a.windupUntil && !a.dashWindupUntil &&
      a.dashUntil<=now && now >= a.attackAt) {
      a.windupUntil = now + (a.kind==='brute'?1050:a.kind==='runner'?350:550);
      if (dist < 9) sound('warning');
    }
    if (a.windupUntil && now >= a.windupUntil) {
      a.windupUntil = 0;
      a.attackAt = now + (a.kind==='brute'?2500:1200);
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
  if (!label) for(const cache of upgradeCaches) {
    if(!cache.collected && Math.hypot(camera.position.x-cache.x,camera.position.z-cache.z)<3.4) {
      label=`<b>E</b> INSTALL ${cache.name}`; break;
    }
  }
  if (!label && Math.hypot(camera.position.x, camera.position.z + 78) < 6)
    label = state.collected !== 3 ? 'SHIP NEEDS ' + (3 - state.collected) + ' POWER CORES'
      : state.launchDefense==='idle' ? '<b>E</b> START SHIP POWER-UP'
      : state.launchDefense==='charging' ? `DEFEND PAD · ${Math.ceil(LAUNCH_CHARGE_SECONDS-state.launchCharge)}s TO CHARGE`
      : '<b>E</b> BOARD SHIP AND LAUNCH';
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
  if (state.mode === 'waking') updateWake(now);
  else if (state.mode === 'playing') {
    state.elapsed += dt;
    updateMovement(dt);
    updateAliens(dt, now);
    updateAlienShots(dt, now);
    updateSetPieces(dt,now);
    if (firing && weaponSpecs[activeWeapon].auto) shoot();
    for (const pickup of weaponPickups) if (!pickup.collected) {
      pickup.display.rotation.y += dt*.7;
      pickup.ring.rotation.z += dt*.5;
    }
    for(const cache of upgradeCaches) if(!cache.collected) {
      cache.display.rotation.y+=dt*.8;
      cache.ring.rotation.z+=dt*.5;
    }
    if (state.collected === 3) {
      state.escapeLeft = Math.max(0,state.escapeLeft-dt);
      const nearPad=Math.hypot(camera.position.x,camera.position.z+78)<12;
      beacon.intensity = nearPad ? .5+Math.sin(now*.012)*.2 : 7+Math.sin(now*.012)*4;
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
      const amount=Math.min(magCapacity(id)-ammo.mag,ammo.reserve);
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
    const t=Math.min(1,(now-state.arrivalStart)/(MARS_ARRIVAL_SECONDS*1000));
    const ease=t*t*(3-2*t);
    camera.position.set(7-ease*5,13-ease*8.5,57-ease*32);
    camera.lookAt(-2-ease*3,3-ease*.8,-24+ease*10);
    if(t>.62) $('arrival-line').textContent='Ares Colony is still alive';
    else if(t>.3) $('arrival-line').textContent='Landing lights ahead';
    if(marsDustPositions) {
      for(let i=0;i<marsDustPositions.length;i+=3) {
        marsDustPositions[i]+=dt*(.7+(i%9)*.08);
        if(marsDustPositions[i]>55) marsDustPositions[i]=-55;
      }
      marsDust.geometry.attributes.position.needsUpdate=true;
    }
    if (now >= state.marsAt) endGame(true);
  }
  if (state.noticeUntil && now >= state.noticeUntil) { ui.notice.classList.add('hidden'); state.noticeUntil = 0; }
  if (now > state.fireUntil) muzzle.intensity = 0;
  const targetFov=upgrades.optic&&(aiming||aimHeld)&&state.mode==='playing'
    ? activeWeapon==='sniper'?27:activeWeapon==='assault'?40:48 : 74;
  camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*13);
  camera.updateProjectionMatrix();
  const targetWeaponX=upgrades.optic&&(aiming||aimHeld)&&state.mode==='playing'
    ? .16 : weaponPoses[activeWeapon].x;
  weapon.position.x+=(targetWeaponX-weapon.position.x)*Math.min(1,dt*13);
  minigunSpin += ((activeWeapon==='minigun' && firing ? 18 : 0)-minigunSpin)*Math.min(1,dt*5);
  if (minigunRotor) minigunRotor.rotation.z += minigunSpin*dt;
  if (state.hitUntil && now > state.hitUntil) {
    $('crosshair').classList.remove('hit','critical','kill');
    $('hit-feedback').className=''; state.hitUntil=0;
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
  for (let i=impacts.length-1;i>=0;i--) {
    const impact=impacts[i];
    if (now>impact.until) {
      scene.remove(impact.mesh); impact.mesh.material.dispose(); impacts.splice(i,1);
    } else {
      if (impact.velocity) impact.mesh.position.addScaledVector(impact.velocity,dt);
      impact.mesh.material.opacity=Math.min(1,(impact.until-now)/140);
    }
  }
  weapon.position.z += (weaponPoses[activeWeapon].z - weapon.position.z) * Math.min(1, dt * 14);
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);

ui.start.addEventListener('click', resume);
$('audio-test').addEventListener('click', async () => {
  if (await initAudio()) {
    sound('test');
    setAudioStatus(audio.muted ? 'Audio muted — press M in game' : 'Test tone played — check device volume if silent');
  }
});
renderer.domElement.addEventListener('click', () => {
  if (state.mode === 'waking') finishWake();
  else if (state.mode === 'playing' && document.pointerLockElement !== renderer.domElement) requestMouseLock();
});
document.addEventListener('pointerlockchange', () => {
  lastPointer = null;
  if (document.pointerLockElement !== renderer.domElement) {
    keys.clear(); firing=false; aiming=false; aimHeld=false;
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
  if(state.mode==='waking' && (event.code==='Space'||event.code==='Enter')) {
    event.preventDefault();finishWake();return;
  }
  if (/^(Key[WASD]|Arrow(Up|Down|Left|Right)|Digit[1-5]|Shift(Left|Right))$/.test(event.code))
    event.preventDefault();
  keys.add(event.code);
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'KeyR') reload();
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyQ' && !event.repeat && upgrades.optic && state.mode==='playing')
    aiming=!aiming;
  if (/^Digit[1-5]$/.test(event.code)) selectWeapon(weaponOrder[Number(event.code.slice(-1))-1]);
  if (event.code === 'KeyM') {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : AUDIO_VOLUME;
    setAudioStatus(audio.muted ? 'Audio muted — press M in game' : 'Audio ready');
    notice(audio.muted ? 'AUDIO MUTED' : 'AUDIO ON',1.2);
  }
});
document.addEventListener('keyup', (event) => keys.delete(event.code));
document.addEventListener('mousedown', (event) => {
  if (event.button===0 && event.target===renderer.domElement) { firing=true; shoot(); }
  if (event.button===2 && event.target===renderer.domElement && upgrades.optic)
    aimHeld=true;
});
document.addEventListener('mouseup', (event) => {
  if (event.button===0) firing=false;
  if (event.button===2) aimHeld=false;
});
renderer.domElement.addEventListener('contextmenu',event=>event.preventDefault());
window.addEventListener('blur', () => { keys.clear(); firing=false; aiming=false; aimHeld=false; if (state.mode==='playing') pause(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { keys.clear(); firing=false; aiming=false; aimHeld=false; if (state.mode==='playing') pause(); }
});
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
// A direct preview lets players inspect the ending without replaying the whole mission.
if(new URLSearchParams(location.search).get('scene')==='mars') arriveMars();
