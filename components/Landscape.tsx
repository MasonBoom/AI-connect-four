'use client';

import { useEffect, useRef } from 'react';

// Low-resolution scenery and integer steps give the horizon a pixel-art silhouette.
export default function Landscape() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const w = 640,
      h = 360,
      horizon = 235;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    for (const [offset, color] of [
      [0, '#251a3d'],
      [0.33, '#50315a'],
      [0.55, '#92516f'],
      [0.66, '#cd7b8c'],
      [0.67, '#513354'],
      [0.82, '#38243d'],
      [1, '#251c30'],
    ] as const)
      gradient.addColorStop(offset, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    const glow = ctx.createRadialGradient(515, 130, 0, 515, 130, 140);
    glow.addColorStop(0, '#ffb59155');
    glow.addColorStop(0.48, '#e7979025');
    glow.addColorStop(1, '#e7979000');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, horizon);
    let seed = 9087;
    const next = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 120; i++) {
      const x = Math.floor(next() * w),
        y = Math.floor(next() * 186);
      const size = next() > 0.85 ? 2 : 1;
      ctx.fillStyle = ['#cda7c6', '#ae88a9', '#8f7398', '#d7b2c9'][i % 4];
      ctx.globalAlpha = 0.4 + next() * 0.55;
      ctx.fillRect(x, y, size, size);
    }
    ctx.globalAlpha = 1;
    for (const [x, y, size] of [
      [62, 52, 3],
      [126, 106, 2],
      [395, 33, 2],
      [574, 66, 3],
      [33, 130, 2],
      [602, 132, 2],
    ]) {
      ctx.fillStyle = '#caa8c4';
      ctx.fillRect(x - size, y, 2 * size + 1, 1);
      ctx.fillRect(x, y - size, 1, 2 * size + 1);
      ctx.fillStyle = '#f8d8d4';
      ctx.fillRect(x, y, 1, 1);
    }
    const sunX = 523,
      sunY = 115,
      radius = 51;
    const sun = ctx.createLinearGradient(0, sunY - radius, 0, sunY + radius);
    sun.addColorStop(0, '#ffce94');
    sun.addColorStop(0.45, '#ffac8a');
    sun.addColorStop(1, '#e57c9b');
    ctx.fillStyle = sun;
    for (let y = -radius; y <= radius; y++) {
      if (
        y > -9 &&
        ((y < 12 && y % 9 === 0) || (y >= 12 && y < 30 && y % 9 < 2) || (y >= 30 && y % 9 < 4))
      )
        continue;
      const half = Math.round(Math.sqrt(radius * radius - y * y));
      ctx.fillRect(sunX - half, sunY + y, half * 2, 1);
    }

    type Ridge = [number, number][];
    const range = (ridge: Ridge, fill: string, lit: string, shade: string) => {
      const profile: number[] = [];
      for (let i = 0; i < ridge.length - 1; i++) {
        const [x, y] = ridge[i],
          [nx, ny] = ridge[i + 1];
        for (let px = x; px < nx; px += 2) {
          const base = y + ((ny - y) * (px - x)) / (nx - x);
          const py = Math.floor((base + (next() - 0.5) * 2.3) / 2) * 2;
          profile[px] = py;
          ctx.fillStyle = ny > y ? lit : fill;
          ctx.fillRect(px, py, 2, horizon + 1 - py);
        }
      }
      for (let i = 1; i < ridge.length - 1; i++) {
        const [x, y] = ridge[i],
          [nx, ny] = ridge[i + 1];
        if (y >= ny || y >= ridge[i - 1][1]) continue;
        let edge = x;
        for (let py = y + 3; py < ny + 13; py += 2) {
          edge += next() > 0.47 ? 1.2 : -0.48;
          const width = Math.max(2, (py - y) * 0.34);
          ctx.fillStyle = shade;
          ctx.fillRect(Math.round(edge), py, Math.round(width), 2);
          if (py % 6 < 2)
            ctx.fillRect(Math.round(x + (nx - x) * 0.52), Math.max(py, profile[x] ?? y) + 2, 3, 1);
        }
      }
    };
    range(
      [
        [0, 172],
        [23, 165],
        [37, 170],
        [74, 147],
        [92, 152],
        [119, 133],
        [137, 147],
        [164, 169],
        [202, 163],
        [235, 181],
        [279, 153],
        [307, 174],
        [344, 157],
        [389, 180],
        [415, 164],
        [460, 175],
        [486, 144],
        [517, 153],
        [548, 132],
        [575, 148],
        [599, 143],
        [625, 156],
        [640, 149],
      ],
      '#956281',
      '#855875',
      '#795371',
    );
    range(
      [
        [0, 189],
        [31, 166],
        [53, 173],
        [81, 144],
        [101, 162],
        [121, 171],
        [148, 153],
        [169, 169],
        [190, 179],
        [218, 170],
        [250, 191],
        [289, 174],
        [321, 193],
        [356, 170],
        [384, 181],
        [415, 167],
        [446, 186],
        [475, 178],
        [507, 186],
        [543, 158],
        [558, 165],
        [590, 139],
        [617, 157],
        [640, 150],
      ],
      '#684666',
      '#77506f',
      '#573c5b',
    );
    range(
      [
        [0, 175],
        [17, 185],
        [36, 181],
        [63, 195],
        [98, 174],
        [133, 198],
        [145, 196],
        [165, 208],
        [202, 193],
        [241, 208],
        [285, 198],
        [326, 207],
        [366, 194],
        [402, 211],
        [438, 193],
        [467, 204],
        [498, 186],
        [516, 193],
        [535, 181],
        [560, 191],
        [580, 174],
        [595, 181],
        [619, 161],
        [640, 170],
      ],
      '#4d3452',
      '#5a3c5a',
      '#422e49',
    );
    range(
      [
        [0, 213],
        [25, 205],
        [49, 213],
        [83, 200],
        [112, 216],
        [140, 208],
        [196, 224],
        [239, 214],
        [285, 226],
        [325, 222],
        [375, 227],
        [421, 218],
        [472, 225],
        [508, 215],
        [541, 221],
        [582, 198],
        [606, 206],
        [640, 189],
      ],
      '#38293f',
      '#3d2c44',
      '#302336',
    );
    // A perspective grid grounds both the rack and the spare discs.
    ctx.strokeStyle = '#99628a';
    ctx.lineWidth = 0.7;
    ctx.globalAlpha = 0.52;
    for (let x = -1140; x <= 1810; x += 61) {
      ctx.beginPath();
      ctx.moveTo(320 + (x - 320) * 0.047, horizon + 1);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (const y of [236, 238, 242, 247, 254, 264, 277, 294, 316, 345]) {
      ctx.globalAlpha = y < 253 ? 0.34 : 0.57;
      ctx.fillRect(0, y, w, 1);
      ctx.strokeStyle = '#a76794';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    const vignette = ctx.createLinearGradient(0, 0, w, 0);
    vignette.addColorStop(0, '#170f2928');
    vignette.addColorStop(0.27, '#170f2900');
    vignette.addColorStop(0.8, '#170f2900');
    vignette.addColorStop(1, '#170f291e');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }, []);
  return <canvas ref={ref} width={640} height={360} className="landscape" aria-hidden="true" />;
}
