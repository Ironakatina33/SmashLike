import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const previews = new Map();
let arena = null;

function hexColor(hex) {
  return new THREE.Color(hex || '#ffffff');
}

function createRenderer(container, alpha = true) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || 320, container.clientHeight || 260);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.innerHTML = '';
  container.appendChild(renderer.domElement);
  return renderer;
}

function createLights(scene, intensity = 1) {
  const key = new THREE.DirectionalLight('#ffffff', 2.2 * intensity);
  key.position.set(3, 5, 4);
  const rim = new THREE.DirectionalLight('#7ee8ff', 1.6 * intensity);
  rim.position.set(-4, 2, -3);
  const fill = new THREE.HemisphereLight('#91d7ff', '#25113a', 1.5 * intensity);
  scene.add(key, rim, fill);
}

function createFallbackModel(fighter) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.52, 1.05, 8, 18),
    new THREE.MeshStandardMaterial({ color: hexColor(fighter.color), roughness: 0.38, metalness: 0.18 })
  );
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshStandardMaterial({ color: hexColor(fighter.accent), emissive: hexColor(fighter.accent), emissiveIntensity: 0.28, roughness: 0.22 })
  );
  const base = new THREE.Mesh(
    new THREE.TorusGeometry(0.78, 0.035, 8, 64),
    new THREE.MeshStandardMaterial({ color: hexColor(fighter.accent), emissive: hexColor(fighter.accent), emissiveIntensity: 0.7 })
  );
  body.position.y = 0.82;
  core.position.set(0.38, 1.2, 0.26);
  base.rotation.x = Math.PI / 2;
  group.add(body, core, base);
  group.userData.fallback = true;
  return group;
}

function fitModel(model, targetHeight = 2.4) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.y, 0.01);
  model.scale.multiplyScalar(scale);
  model.position.sub(center.multiplyScalar(scale));
  model.position.y = 0;
}

function loadModel(fighter, targetHeight, onReady) {
  if (!fighter.modelUrl) {
    const fallback = createFallbackModel(fighter);
    fitModel(fallback, targetHeight);
    onReady(fallback, false);
    return;
  }

  loader.load(
    fighter.modelUrl,
    (gltf) => {
      const model = gltf.scene;
      fitModel(model, targetHeight);
      onReady(model, true);
    },
    undefined,
    () => {
      const fallback = createFallbackModel(fighter);
      fitModel(fallback, targetHeight);
      onReady(fallback, false);
    }
  );
}

export function setupFighterPreview(container, fighter) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 1.3, 5.2);
  const renderer = createRenderer(container);
  const state = { scene, camera, renderer, model: null, loadedModel: false, fighter };

  createLights(scene, 1.05);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(1.08, 0.018, 8, 96),
    new THREE.MeshStandardMaterial({ color: hexColor(fighter.accent), emissive: hexColor(fighter.accent), emissiveIntensity: 0.45 })
  );
  halo.rotation.x = Math.PI / 2;
  scene.add(halo);

  loadModel(fighter, 2.2, (model, loadedModel) => {
    state.model = model;
    state.loadedModel = loadedModel;
    scene.add(model);
    container.dataset.modelStatus = loadedModel ? 'Modèle 3D chargé' : 'Fallback 3D prêt';
  });

  previews.set(container, state);
  renderPreview(container);
}

export function updateFighterPreview(container, fighter) {
  const state = previews.get(container);
  if (!state) {
    setupFighterPreview(container, fighter);
    return;
  }
  state.fighter = fighter;
  container.dataset.modelStatus = 'Chargement 3D...';
  if (state.model) state.scene.remove(state.model);
  state.model = null;
  loadModel(fighter, 2.2, (model, loadedModel) => {
    state.model = model;
    state.loadedModel = loadedModel;
    state.scene.add(model);
    container.dataset.modelStatus = loadedModel ? 'Modèle 3D chargé' : 'Fallback 3D prêt';
  });
}

export function renderPreview(container) {
  const state = previews.get(container);
  if (!state) return;
  const { renderer, camera, scene, model } = state;
  const width = container.clientWidth || 320;
  const height = container.clientHeight || 260;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
  if (model) {
    model.rotation.y += 0.012;
    model.position.y = Math.sin(performance.now() * 0.002) * 0.04;
  }
  renderer.render(scene, camera);
}

export function renderAllPreviews() {
  previews.forEach((_, container) => renderPreview(container));
}

export function setupArena3D(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#03050c', 10, 26);
  const camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 100);
  camera.position.set(0, 5.2, 12.5);
  camera.lookAt(0, 1, 0);
  const renderer = createRenderer(container);
  renderer.setClearColor('#03050c', 0);
  createLights(scene, 0.85);

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(8.4, 0.22, 1.8),
    new THREE.MeshStandardMaterial({ color: '#1d2d58', emissive: '#102657', emissiveIntensity: 0.25, roughness: 0.35 })
  );
  floor.position.y = -1.55;
  scene.add(floor);

  const platformMaterial = new THREE.MeshStandardMaterial({ color: '#242c61', emissive: '#4c2a82', emissiveIntensity: 0.2 });
  [[-2.2, 0.2], [2.2, 0.2], [0, 1.35]].forEach(([x, y]) => {
    const platform = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 1.05), platformMaterial);
    platform.position.set(x, y, 0);
    scene.add(platform);
  });

  const grid = new THREE.GridHelper(14, 18, '#62d9ff', '#23325f');
  grid.position.y = -1.68;
  scene.add(grid);

  arena = { container, scene, camera, renderer, fighters: new Map() };
}

export function setArenaFighters(players) {
  if (!arena) return;
  arena.fighters.forEach((model) => arena.scene.remove(model));
  arena.fighters.clear();
  players.forEach((player) => {
    loadModel(player.fighter, 1.25 + player.size / 70, (model) => {
      arena.fighters.set(player.index, model);
      arena.scene.add(model);
    });
  });
}

export function renderArena3D(players = []) {
  if (!arena) return;
  const { container, renderer, camera, scene, fighters: fighterModels } = arena;
  const width = container.clientWidth || 1280;
  const height = container.clientHeight || 720;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();

  players.forEach((player) => {
    const model = fighterModels.get(player.index);
    if (!model) return;
    model.visible = player.stocks > 0 && !(player.respawnTimer > 0 && Math.floor(player.respawnTimer / 8) % 2 === 0);
    model.position.x = (player.x - 640) / 92;
    model.position.y = (540 - player.y) / 92 - 1.45;
    model.position.z = player.index === 0 ? 0.25 : -0.25;
    model.rotation.y = player.facing > 0 ? Math.PI / 8 : -Math.PI - Math.PI / 8;
    model.rotation.z = player.currentMove ? Math.sin(player.attackFrame * 0.25) * 0.18 * player.facing : 0;
  });

  renderer.render(scene, camera);
}

export function disposeArena3D() {
  if (!arena) return;
  arena.fighters.forEach((model) => arena.scene.remove(model));
  arena.fighters.clear();
}
