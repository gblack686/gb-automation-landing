// Adapted from Expert Atlas's golden-angle gallery layout. Rendering is demand-driven:
// no idle animation loop, automatic rotation, global state, or artifact-index request.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function createArtifactGlobe(host, items, onSelect, onUnavailable) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = false;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.55;
  const meshes = [];
  const textures = new Set();
  const loader = new THREE.TextureLoader();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let disposed = false;
  let visible = true;
  let distance = 25;
  let down;
  let dragDistance = 0;

  function render() { if (!disposed && visible && !document.hidden) renderer.render(scene, camera); }
  items.forEach((item, index) => {
    const y = 1 - ((index + 0.5) / items.length) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = index * goldenAngle;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.8), new THREE.MeshBasicMaterial({ color: 0x7c8796, side: THREE.DoubleSide }));
    mesh.position.set(Math.cos(theta) * radius * 7, y * 7, Math.sin(theta) * radius * 7);
    mesh.lookAt(mesh.position.clone().multiplyScalar(2));
    mesh.userData.index = index;
    meshes.push(mesh);
    scene.add(mesh);
    loader.load(`/images/gallery/${item.id}.jpg`, (texture) => {
      if (disposed) { texture.dispose(); return; }
      textures.add(texture);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      mesh.material.map = texture;
      mesh.material.color.set(0xffffff);
      mesh.material.needsUpdate = true;
      render();
    }, undefined, () => { /* The labeled HTML preview remains available. */ });
  });

  const outline = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.32, 2.92)), new THREE.LineBasicMaterial({ color: 0xffffff }));
  scene.add(outline);
  function select(index) {
    const mesh = meshes[index];
    if (!mesh || disposed) return;
    outline.position.copy(mesh.position.clone().multiplyScalar(1.008));
    outline.quaternion.copy(mesh.quaternion);
    camera.position.copy(mesh.position.clone().normalize().multiplyScalar(distance));
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    render();
  }
  function resize() {
    if (disposed) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    distance = 10 / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.min(1, camera.aspect);
    camera.position.setLength(distance);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    controls.update();
    render();
  }
  function pointerDown(event) { down = { x: event.clientX, y: event.clientY }; dragDistance = 0; }
  function pointerMove(event) { if (down) dragDistance = Math.max(dragDistance, Math.hypot(event.clientX - down.x, event.clientY - down.y)); }
  function pointerUp(event) {
    if (!down) return;
    const moved = Math.max(dragDistance, Math.hypot(event.clientX - down.x, event.clientY - down.y));
    down = null;
    if (moved > 8) return;
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(meshes, false)[0];
    if (hit) { select(hit.object.userData.index); onSelect(hit.object.userData.index); }
  }
  function cancelPointer() { down = null; }
  function contextLost(event) { event.preventDefault(); if (!disposed) onUnavailable(); }
  controls.addEventListener('change', render);
  renderer.domElement.addEventListener('pointerdown', pointerDown);
  renderer.domElement.addEventListener('pointermove', pointerMove);
  renderer.domElement.addEventListener('pointerup', pointerUp);
  renderer.domElement.addEventListener('pointercancel', cancelPointer);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  document.addEventListener('visibilitychange', render);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const visibility = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; render(); });
  visibility.observe(host);
  camera.position.set(0, 0, distance);
  resize();
  select(0);

  return {
    select,
    rotate(direction) { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * Math.PI / 7); controls.update(); render(); },
    reset() { camera.position.set(0, 0, distance); controls.target.set(0, 0, 0); controls.update(); render(); },
    dispose() {
      disposed = true;
      observer.disconnect();
      visibility.disconnect();
      controls.removeEventListener('change', render);
      controls.dispose();
      document.removeEventListener('visibilitychange', render);
      renderer.domElement.removeEventListener('pointerdown', pointerDown);
      renderer.domElement.removeEventListener('pointermove', pointerMove);
      renderer.domElement.removeEventListener('pointerup', pointerUp);
      renderer.domElement.removeEventListener('pointercancel', cancelPointer);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      [...meshes, outline].forEach((mesh) => { mesh.geometry.dispose(); mesh.material.dispose(); });
      textures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
