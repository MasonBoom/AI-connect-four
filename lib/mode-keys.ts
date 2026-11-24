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
  play: { face: 0xff8b7c, side: 0xa64e59, rim: 0x602f43 },
  coach: { face: 0x403845, side: 0x332b39, rim: 0x211c27 },
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
    const palette = button.disabled ? colors.coach : colors.play;
    const face = new MeshBasicMaterial({ color: palette.face });
    const side = new MeshBasicMaterial({ color: palette.side });
    const rim = new MeshBasicMaterial({ color: palette.rim });
    const cap = new Mesh(undefined, [face, side]);
    const base = new Mesh(undefined, rim);
    cap.rotation.x = base.rotation.x = -0.39;
    scene.add(base, cap);
    return { button, cap, base, face, side, rim };
  });
  const [playPad] = pads;
  const surfaces = pads.flatMap(({ base, cap }) => [base, cap]);
  let hovering = false;
  let heldPointer: number | null = null;
  let releasedOnPlay = false;
  let disposed = false;
  host.appendChild(renderer.domElement);

  function paint() {
    const pressed = hovering && heldPointer !== null;
    playPad.face.color.setHex(hovering ? 0xffa190 : colors.play.face);
    playPad.cap.position.y = playPad.base.position.y + (pressed ? 0 : 3);
    playPad.cap.position.z = pressed ? 4 : 7;
    keys.toggleAttribute('data-pressed', pressed);
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
    return pads.find(({ base, cap }) => hit === base || hit === cap)?.button;
  }

  function track(event: PointerEvent) {
    if (!event.isPrimary) return;
    const hit = pick(event);
    keys.style.cursor = hit?.disabled ? 'not-allowed' : hit ? 'pointer' : '';
    if (hovering !== (hit === play)) {
      hovering = hit === play;
      paint();
    }
  }
  function press(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0) return;
    releasedOnPlay = false;
    if (pick(event) !== play) return;
    heldPointer = event.pointerId;
    hovering = true;
    play.setPointerCapture(event.pointerId);
    paint();
  }
  function release(event: PointerEvent) {
    if (event.pointerId !== heldPointer) return;
    releasedOnPlay = pick(event) === play;
    heldPointer = null;
    hovering = event.pointerType === 'mouse' && releasedOnPlay;
    paint();
  }

  // Pointer clicks must begin and end on the play mesh. Keyboard and assistive
  // activation use the native submit button without requiring a pointer.
  function checkClick(event: MouseEvent) {
    if (event.detail === 0) return;
    if (!releasedOnPlay || pick(event) !== play) event.preventDefault();
    releasedOnPlay = false;
  }
  function reset() {
    hovering = false;
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
      releasedOnPlay = false;
      reset();
    }
  }, listener);
  keys.addEventListener('pointerleave', () => { if (heldPointer === null) reset(); }, listener);
  keys.addEventListener('lostpointercapture', () => { if (heldPointer !== null) reset(); }, listener);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  observer.observe(play);
  // Revert to the native controls immediately if the browser releases the GPU.
  renderer.domElement.addEventListener('webglcontextlost', dispose, listener);
  resize();

  function dispose() {
    if (disposed) return;
    disposed = true;
    events.abort();
    observer.disconnect();
    delete keys.dataset.rendered;
    keys.removeAttribute('data-pressed');
    keys.style.cursor = '';
    for (const { base, cap, face, side, rim } of pads) {
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
