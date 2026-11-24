import * as T from 'three';
import { COLS, ROWS, nextRow, type Match, type Player } from './game';

export type ColumnArea = { left: number; top: number; width: number; height: number };
export type Tabletop = {
  setMatch: (match: Match, animate: boolean) => void;
  setAim: (column: number | null) => void;
  dispose: () => void;
};
const px = (col: number) => (col - 3) * 1.02;
const py = (row: number) => 1.03 + (5 - row) * 0.92;
const discZ = 0.29;
const materials = {
  X: '#ff635c',
  O: '#ffc45a',
};
function rounded(x: number, y: number, w: number, h: number, r: number) {
  const s = new T.Shape();
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

export function createTabletop(
  host: HTMLDivElement,
  onLayout: (bounds: ColumnArea[]) => void,
  onLost: () => void,
): Tabletop {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    powerPreference: 'low-power',
  });
  if (!context) throw new Error('WebGL 2 is unavailable.');
  const renderer = new T.WebGLRenderer({ canvas, context, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.NoToneMapping;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-7, 7, 4, -4, 0.1, 65);
  camera.position.set(2.0, 6.59, 21);
  camera.lookAt(0, 3.15, 0);
  camera.updateMatrixWorld();
  const hemi = new T.HemisphereLight('#fff1fd', '#5b3d74', 1.57);
  scene.add(hemi);
  const key = new T.DirectionalLight('#fff1e6', 2.18);
  key.position.set(-5, 9, 8);
  scene.add(key);
  const rim = new T.DirectionalLight('#bd97ff', 1.25);
  rim.position.set(5, 5, -3);
  scene.add(rim);
  const standard = (color: string, roughness = 0.42, metalness = 0.11) =>
    new T.MeshStandardMaterial({ color, roughness, metalness });
  const rack = new T.Group();
  scene.add(rack);
  function extrusion(
    shape: T.Shape,
    depth: number,
    bevel: number,
    material: T.Material | T.Material[],
    parent: T.Object3D,
    z: number,
  ) {
    const geometry = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 3,
      curveSegments: 24,
      steps: 1,
    });
    const mesh = new T.Mesh(geometry, material);
    mesh.position.z = z;
    parent.add(mesh);
    return mesh;
  }
  // A second, dark plate closes the wells behind the actual perforated face.
  const back = standard('#2c203e', 0.85, 0.015);
  extrusion(rounded(-3.69, 0.47, 7.38, 5.72, 0.18), 0.15, 0.055, back, rack, -0.4);
  const main = rounded(-3.7, 0.49, 7.4, 5.71, 0.16);
  for (let col = 0; col < COLS; col++)
    for (let row = 0; row < ROWS; row++) {
      const hole = new T.Path();
      hole.absarc(px(col), py(row), 0.391, 0, 2 * Math.PI, true);
      main.holes.push(hole);
    }
  const face = new T.MeshStandardMaterial({
    color: '#ffffff',
    vertexColors: true,
    metalness: 0.11,
    roughness: 0.39,
  });
  const edge = new T.MeshStandardMaterial({
    color: '#af92ca',
    vertexColors: true,
    roughness: 0.42,
    metalness: 0.12,
  });
  const frame = extrusion(main, 0.42, 0.051, [face, edge], rack, -0.04);
  const position = frame.geometry.getAttribute('position');
  const colors = new Float32Array(position.count * 3);
  const lower = new T.Color('#7148ae'),
    upper = new T.Color('#9b78da'),
    shade = new T.Color();
  for (let i = 0; i < position.count; i++) {
    const blend = T.MathUtils.clamp(
      (position.getY(i) - 0.43) / 5.86 - (0.06 * position.getX(i)) / 3.7,
      0,
      1,
    );
    shade.copy(lower).lerp(upper, blend);
    shade.toArray(colors, i * 3);
  }
  frame.geometry.setAttribute('color', new T.BufferAttribute(colors, 3));

  const lip = standard('#8862bd'),
    side = standard('#7049a8'),
    sole = standard('#48305f');
  for (const x of [-3.66, 3.66]) {
    extrusion(rounded(x - 0.105, 0.2, 0.21, 5.91, 0.077), 0.52, 0.055, side, rack, -0.1);
    extrusion(rounded(x - 0.34, 0.1, 0.68, 0.22, 0.07), 1.48, 0.074, side, rack, -0.57);
    extrusion(rounded(x - 0.35, 0.066, 0.7, 0.09, 0.035), 1.49, 0.035, sole, rack, -0.58);
  }
  extrusion(rounded(-3.65, 0.415, 7.3, 0.16, 0.059), 0.49, 0.026, lip, rack, -0.065);

  // Slightly concave, shaded pockets keep all 42 apertures legible against the sky.
  const wellGeometry = new T.CircleGeometry(0.399, 48);
  const pocketColors = new Float32Array(wellGeometry.attributes.position.count * 3);
  const dark = new T.Color('#211729'),
    light = new T.Color('#493455');
  for (let i = 0; i < wellGeometry.attributes.position.count; i++) {
    const y = wellGeometry.attributes.position.getY(i);
    const x = wellGeometry.attributes.position.getX(i);
    const amount = T.MathUtils.clamp(0.4 - y * 0.94 + x * 0.23, 0, 1);
    shade
      .copy(dark)
      .lerp(light, amount)
      .toArray(pocketColors, i * 3);
  }
  wellGeometry.setAttribute('color', new T.BufferAttribute(pocketColors, 3));
  const wells = new T.InstancedMesh(
    wellGeometry,
    new T.MeshBasicMaterial({ vertexColors: true }),
    COLS * ROWS,
  );
  const matrix = new T.Matrix4();
  for (let col = 0; col < COLS; col++)
    for (let row = 0; row < ROWS; row++)
      wells.setMatrixAt(col * ROWS + row, matrix.makeTranslation(px(col), py(row), -0.19));
  rack.add(wells);

  // The lathed profile models a raised rim and a recessed face on each token.
  const profile = [
    [0, -0.066],
    [0.302, -0.066],
    [0.325, -0.078],
    [0.354, -0.078],
    [0.378, -0.056],
    [0.38, -0.034],
    [0.38, 0.041],
    [0.373, 0.063],
    [0.356, 0.078],
    [0.328, 0.078],
    [0.319, 0.063],
    [0.31, 0.056],
    [0.274, 0.056],
    [0.265, 0.046],
    [0.256, 0.048],
    [0.247, 0.057],
    [0, 0.057],
  ];
  const tokenGeometry = new T.LatheGeometry(
    profile.map(([r, y]) => new T.Vector2(r, y)),
    56,
  );
  tokenGeometry.rotateX(Math.PI / 2);
  const body = { X: standard(materials.X, 0.36, 0.13), O: standard(materials.O, 0.36, 0.13) };
  const trim = { X: standard('#ff9880', 0.37, 0.1), O: standard('#ffe18d', 0.37, 0.1) };
  const inset = { X: standard('#c74e54', 0.44, 0.1), O: standard('#e69a3c', 0.44, 0.1) };
  const outerRing = new T.TorusGeometry(0.332, 0.014, 8, 52);
  const innerRing = new T.TorusGeometry(0.258, 0.009, 6, 52);
  function chip(player: Player) {
    const group = new T.Group();
    group.add(new T.Mesh(tokenGeometry, body[player]));
    const high = new T.Mesh(outerRing, trim[player]);
    high.position.z = 0.077;
    group.add(high);
    const low = new T.Mesh(innerRing, inset[player]);
    low.position.z = 0.057;
    group.add(low);
    return group;
  }
  function spare(
    player: Player,
    x: number,
    y: number,
    z: number,
    rotation: [number, number, number],
    size: number,
  ) {
    const g = chip(player);
    g.position.set(x, y, z);
    g.rotation.set(...rotation);
    g.scale.setScalar(size);
    scene.add(g);
  }
  for (let i = 0; i < 4; i++)
    spare('X', -4.29 + (i % 2) * 0.034, 0.105 + i * 0.139, 0.71, [-Math.PI / 2, 0, 0.12 * i], 1.18);
  spare('X', -4.83, 0.44, 0.99, [-0.24, -0.29, -0.23], 1.25);
  for (let i = 0; i < 3; i++)
    spare('O', 4.35 - i * 0.026, 0.1 + i * 0.15, 0.66, [-Math.PI / 2, 0.01 * i, 0.1 * i], 1.26);
  spare('O', 4.97, 0.095, 1.02, [-1.46, -0.12, 0.26], 1.2);
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const ctx = shadowCanvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 63);
  grad.addColorStop(0, 'rgba(16,8,24,.87)');
  grad.addColorStop(0.56, 'rgba(21,11,32,.6)');
  grad.addColorStop(1, 'rgba(20,9,24,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new T.CanvasTexture(shadowCanvas);
  texture.colorSpace = T.SRGBColorSpace;
  const shadowMaterial = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const shadowGeo = new T.PlaneGeometry(1, 1);
  function shadow(x: number, z: number, w: number, d: number) {
    const m = new T.Mesh(shadowGeo, shadowMaterial);
    m.rotation.x = -Math.PI / 2;
    m.scale.set(w, d, 1);
    m.position.set(x, 0.003, z);
    m.renderOrder = -1;
    scene.add(m);
  }
  shadow(0, -0.04, 10.1, 4.7);
  shadow(-4.51, 0.75, 2.2, 2.4);
  shadow(4.58, 0.81, 2.4, 2.1);

  const pieces = new T.Group();
  scene.add(pieces);
  const cells = new Map<string, T.Group>();
  const aim = new T.Mesh(
    new T.RingGeometry(0.273, 0.315, 48),
    new T.MeshBasicMaterial({
      color: '#ffb4a8',
      side: T.DoubleSide,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    }),
  );
  aim.visible = false;
  scene.add(aim);
  const victoryGeometry = new T.TorusGeometry(0.257, 0.028, 8, 48);
  const victoryMaterial = new T.MeshBasicMaterial({ color: '#fff1d5' });
  const victory = new T.Group();
  scene.add(victory);
  let currentMatch: Match | undefined;
  let aimCol: number | null = null;
  let animation:
    | { group: T.Group; from: number; to: number; start: number; duration: number }
    | undefined;
  let raf = 0,
    stopped = false;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  function render(now = performance.now()) {
    raf = 0;
    if (stopped) return;
    if (animation) {
      const t = Math.min(1, (now - animation.start) / animation.duration);
      // Gravity, contact, then a short settling bounce.
      const amount =
        t < 0.84 ? (t / 0.84) ** 2 : 1 - 0.038 * Math.sin(((t - 0.84) / 0.16) * Math.PI);
      animation.group.position.y = T.MathUtils.lerp(animation.from, animation.to, amount);
      if (t >= 1) {
        animation.group.position.y = animation.to;
        animation = undefined;
      }
    }
    renderer.render(scene, camera);
    if (animation) raf = requestAnimationFrame(render);
  }
  const invalidate = () => {
    if (!raf && !stopped) raf = requestAnimationFrame(render);
  };
  function updateAim() {
    const row =
      currentMatch && aimCol !== null && !currentMatch.winner
        ? nextRow(currentMatch.board, aimCol)
        : -1;
    aim.visible = row >= 0;
    if (aim.visible) {
      aim.material.color.set(currentMatch?.turn === 'O' ? '#ffe3a1' : '#ffb4a8');
      aim.position.set(px(aimCol!), py(row), discZ + 0.1);
    }
    invalidate();
  }
  const setMatch = (match: Match, animate: boolean) => {
    if (animation) {
      animation.group.position.y = animation.to;
      animation = undefined;
    }
    for (const [id, group] of cells) {
      const [col, row] = id.split(',').map(Number);
      if (match.board[col][row] !== group.userData.player) {
        pieces.remove(group);
        cells.delete(id);
      }
    }
    const last = match.moves.at(-1);
    for (const move of match.moves) {
      const id = move.col + ',' + move.row;
      if (cells.has(id)) continue;
      const g = chip(move.player);
      g.userData.player = move.player;
      const to = py(move.row);
      g.position.set(px(move.col), to, discZ);
      cells.set(id, g);
      pieces.add(g);
      if (move === last && animate && !motion.matches) {
        const from = 6.58;
        g.position.y = from;
        animation = {
          group: g,
          from,
          to,
          start: performance.now(),
          duration: 220 + (from - to) * 29,
        };
      }
    }
    victory.clear();
    for (const cell of match.line) {
      const ring = new T.Mesh(victoryGeometry, victoryMaterial);
      ring.position.set(px(cell.col), py(cell.row), discZ + 0.101);
      victory.add(ring);
    }
    currentMatch = match;
    updateAim();
  };
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    const viewHeight = Math.max(7.78, (10.6 * h) / w);
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.right = (viewHeight * w) / h / 2;
    camera.left = -camera.right;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    const project = (x: number, y: number, z: number) => {
      const p = new T.Vector3(x, y, z).project(camera);
      return { x: (p.x + 1) * 50, y: (1 - p.y) * 50 };
    };
    onLayout(
      Array.from({ length: COLS }, (_, col) => {
        const upper = project(px(col) - 0.51, 6.77, 0.43),
          lower = project(px(col) + 0.51, 0.53, 0.43);
        return { left: upper.x, top: upper.y, width: lower.x - upper.x, height: lower.y - upper.y };
      }),
    );
    invalidate();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();
  const lost = (event: Event) => {
    event.preventDefault();
    onLost();
  };
  canvas.addEventListener('webglcontextlost', lost);
  return {
    setMatch,
    setAim(column) {
      aimCol = column;
      updateAim();
    },
    dispose() {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<T.BufferGeometry>([victoryGeometry]),
        mats = new Set<T.Material>([victoryMaterial]);
      scene.traverse((object) => {
        if (object instanceof T.Mesh) {
          geometries.add(object.geometry);
          for (const m of Array.isArray(object.material) ? object.material : [object.material])
            mats.add(m);
        }
      });
      for (const g of geometries) g.dispose();
      for (const m of mats) m.dispose();
      texture.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
