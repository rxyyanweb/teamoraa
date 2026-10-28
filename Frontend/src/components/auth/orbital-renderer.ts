import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export async function mountOrbit(host: HTMLDivElement): Promise<() => void> {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
  } catch {
    return () => {};
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const room = new RoomEnvironment();
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromScene(room);
  scene.environment = environment.texture;
  room.dispose();
  generator.dispose();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  camera.position.set(0, 0, 4.2);
  scene.add(new THREE.HemisphereLight(0xb9fff0, 0x153c43, 3));
  const key = new THREE.DirectionalLight(0x51e5c0, 5);
  key.position.set(3, 4, 4);
  scene.add(key);
  let model: THREE.Group | undefined;
  const cleanup = () => {
    model?.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
          for (const value of Object.values(mat))
            if (value instanceof THREE.Texture) value.dispose();
          mat.dispose();
        }
      }
    });
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
    host.classList.remove('webgl-ready');
  };
  try {
    const gltf = await new GLTFLoader().loadAsync('/assets/abstract-sphere.glb');
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3()).length();
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const group = new THREE.Group();
    group.add(model);
    group.scale.setScalar(2.7 / size);
    scene.add(group);
    host.appendChild(renderer.domElement);
    let frame = 0;
    const render = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!document.hidden && host.isConnected) renderer.render(scene, camera);
      });
    };
    const resize = () => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      render();
    };
    const move = (event: PointerEvent) => {
      const b = host.getBoundingClientRect();
      group.rotation.y = ((event.clientX - b.left) / b.width - 0.5) * 0.35;
      group.rotation.x = ((event.clientY - b.top) / b.height - 0.5) * 0.15;
      render();
    };
    const reset = () => {
      group.rotation.set(0, 0, 0);
      render();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    host.classList.add('webgl-ready');
    host.addEventListener('pointermove', move);
    host.addEventListener('pointerleave', reset);
    document.addEventListener('visibilitychange', render);
    const lost = (event: Event) => {
      event.preventDefault();
      host.classList.remove('webgl-ready');
    };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', reset);
      document.removeEventListener('visibilitychange', render);
      cleanup();
    };
  } catch {
    cleanup();
    return () => {};
  }
}
