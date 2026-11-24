import {
  ExtrudeGeometry, Mesh, MeshBasicMaterial, OrthographicCamera, Raycaster,
  Scene, Shape, Vector2, WebGLRenderer,
} from 'three';
import { SVGRenderer } from 'three/addons/renderers/SVGRenderer.js';

function keycap(width: number, height: number, depth: number) {
  const x = width / 2, y = height / 2, cut = 7;
  const outline = new Shape();
  outline.moveTo(-x + cut, -y);
  outline.lineTo(x - cut, -y);
  outline.lineTo(x, -y + cut);
  outline.lineTo(x, y - cut);
  outline.lineTo(x - cut, y);
  outline.lineTo(-x + cut, y);
  outline.lineTo(-x, y - cut);
  outline.lineTo(-x, -y + cut);
  outline.closePath();
  return new ExtrudeGeometry(outline, {
    depth, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.4, bevelSegments: 1,
  });
}

function rendererForMenu() {
  const canvas = document.createElement('canvas');
  try {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'low-power' });
    if (context) {
      const renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0, 0);
      return renderer;
    }
  } catch { /* Software rendering uses the same meshes and pointer picking. */ }
  return new SVGRenderer();
}

const colors = {
  play: { face: 0xff8b7c, hover: 0xffa190, side: 0xa64e59, rim: 0x602f43 },
  coach: { face: 0xbfa1ed, hover: 0xd5bafc, side: 0x786090, rim: 0x493753 },
};

export function mountModeKeys(
  host: HTMLDivElement, play: HTMLButtonElement, coach: HTMLButtonElement,
) {
  const keys = host.parentElement!;
  const renderer = rendererForMenu();
  const scene = new Scene();
  const camera = new OrthographicCamera(0, 1, 1, 0, 1, 600);
  camera.position.z = 300;
  camera.updateMatrixWorld();
  const raycaster = new Raycaster();
  const cursor = new Vector2();

  const pads = [play, coach].map((button) => {
    const palette = button === coach ? colors.coach : colors.play;
    const face = new MeshBasicMaterial({ color: palette.face });
    const side = new MeshBasicMaterial({ color: palette.side });
    const rim = new MeshBasicMaterial({ color: palette.rim });
    const cap = new Mesh(undefined, [face, side]);
    const base = new Mesh(undefined, rim);
    cap.rotation.x = base.rotation.x = -0.39;
    scene.add(base, cap);
    return { button, cap, base, face, side, rim, palette };
  });
  const surfaces = pads.flatMap(({ base, cap }) => [base, cap]);
  let hovered: HTMLButtonElement | null = null;
  let held: HTMLButtonElement | null = null;
  let heldPointer: number | null = null;
  let released: HTMLButtonElement | null = null;
  let disposed = false;
  host.appendChild(renderer.domElement);

  function paint() {
    for (const { button, base, cap, face, palette } of pads) {
      const pressed = button === held && button === hovered;
      face.color.setHex(button === hovered ? palette.hover : palette.face);
      cap.position.y = base.position.y + (pressed ? 0 : 3);
      cap.position.z = pressed ? 4 : 7;
      button.toggleAttribute('data-pressed', pressed);
    }
    renderer.render(scene, camera);
  }

  function resize() {
    const frame = host.getBoundingClientRect();
    if (!frame.width || !frame.height) return;
    camera.right = frame.width;
    camera.top = frame.height;
    camera.updateProjectionMatrix();
    renderer.setSize(frame.width, frame.height);
    for (const { button, base, cap } of pads) {
      const rect = button.getBoundingClientRect();
      const x = rect.left - frame.left + rect.width / 2;
      const y = frame.height - (rect.top - frame.top + rect.height / 2);
      base.geometry.dispose();
      cap.geometry.dispose();
      base.geometry = keycap(rect.width - 5, (rect.height - 6) / Math.cos(base.rotation.x), 2);
      cap.geometry = keycap(rect.width - 11, (rect.height - 19) / Math.cos(cap.rotation.x), 8);
      base.position.set(x, y - 1, 0);
      cap.position.set(x, y + 2, 7);
    }
    paint();
    keys.dataset.rendered = 'true';
  }

  function pick(event: MouseEvent) {
    const bounds = host.getBoundingClientRect();
    cursor.set(
      (event.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (event.clientY - bounds.top) / bounds.height * 2,
    );
    raycaster.setFromCamera(cursor, camera);
    const hit = raycaster.intersectObjects(surfaces, false)[0]?.object;
    return pads.find(({ base, cap }) => hit === base || hit === cap)?.button ?? null;
  }

  function track(event: PointerEvent) {
    if (!event.isPrimary) return;
    const hit = pick(event);
    keys.style.cursor = hit ? 'pointer' : '';
    if (hovered !== hit) {
      hovered = hit;
      paint();
    }
  }
  function press(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    released = null;
    held = pick(event);
    if (!held) return;
    heldPointer = event.pointerId;
    hovered = held;
    held.setPointerCapture(event.pointerId);
    paint();
  }
  function release(event: PointerEvent) {
    if (event.pointerId !== heldPointer) return;
    const hit = pick(event);
    released = hit === held ? hit : null;
    heldPointer = null;
    held = null;
    hovered = event.pointerType === 'mouse' ? hit : null;
    paint();
  }

  // A pointer must start and finish on the same mesh. Native submission
  // also supports keyboard and assistive technology without pointer events.
  function checkClick(event: MouseEvent) {
    if (event.detail === 0) return;
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!released || released !== target || pick(event) !== released) event.preventDefault();
    released = null;
  }
  function reset() {
    hovered = null;
    held = null;
    heldPointer = null;
    keys.style.cursor = '';
    paint();
  }

  const events = new AbortController();
  const listener = { signal: events.signal };
  keys.addEventListener('click', checkClick, { ...listener, capture: true });
  keys.addEventListener('pointermove', track, listener);
  keys.addEventListener('pointerdown', press, listener);
  keys.addEventListener('pointerup', release, listener);
  keys.addEventListener('pointercancel', (event) => {
    if (event.pointerId === heldPointer) {
      released = null;
      reset();
    }
  }, listener);
  keys.addEventListener('pointerleave', () => { if (heldPointer === null) reset(); }, listener);
  keys.addEventListener('lostpointercapture', () => { if (heldPointer !== null) reset(); }, listener);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  observer.observe(play);
  observer.observe(coach);
  // Revert to the native controls immediately if the browser releases the GPU.
  renderer.domElement.addEventListener('webglcontextlost', dispose, listener);
  resize();

  function dispose() {
    if (disposed) return;
    disposed = true;
    events.abort();
    observer.disconnect();
    delete keys.dataset.rendered;
    keys.style.cursor = '';
    for (const { button, base, cap, face, side, rim } of pads) {
      button.removeAttribute('data-pressed');
      base.geometry.dispose();
      cap.geometry.dispose();
      face.dispose();
      side.dispose();
      rim.dispose();
    }
    if (renderer instanceof WebGLRenderer) {
      renderer.dispose();
      if (!renderer.getContext().isContextLost()) renderer.forceContextLoss();
    }
    renderer.domElement.remove();
  }
  return dispose;
}
