/**
 * Generator gambar placeholder untuk galeri puzzle.
 *
 * Kenapa SVG yang di-generate, bukan foto?
 * - repo tetap ringan & tidak butuh koneksi internet saat dev,
 * - tidak ada masalah lisensi foto,
 * - CORS aman (same-origin) sehingga canvas boleh membaca pixel-nya.
 *
 * Gambarnya sengaja penuh detail lokal (pohon, jendela, bintang, kelopak) —
 * puzzle dengan gradien mulus saja tidak mungkin diselesaikan.
 *
 * Jalankan: npm run gen:images
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'sample-images');

// ------------------------------------------------------------------ utilitas

function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const n = (value) => Math.round(value * 100) / 100;

function linearGradient(id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  const inner = stops
    .map(([offset, color, opacity = 1]) =>
      `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`)
    .join('');
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${inner}</linearGradient>`;
}

function radialGradient(id, stops, { cx = 0.5, cy = 0.5, r = 0.5 } = {}) {
  const inner = stops
    .map(([offset, color, opacity = 1]) =>
      `<stop offset="${offset}" stop-color="${color}" stop-opacity="${opacity}"/>`)
    .join('');
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${inner}</radialGradient>`;
}

const poly = (points, fill, extra = '') =>
  `<polygon points="${points.map(([x, y]) => `${n(x)},${n(y)}`).join(' ')}" fill="${fill}"${extra}/>`;

const circle = (cx, cy, r, fill, extra = '') =>
  `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${fill}"${extra}/>`;

const ellipse = (cx, cy, rx, ry, fill, extra = '') =>
  `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}"${extra}/>`;

const rect = (x, y, w, h, fill, extra = '') =>
  `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" fill="${fill}"${extra}/>`;

const path = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;

/** Garis bergerigi (silhouette bukit/gunung) dari kiri ke kanan lalu ditutup ke bawah. */
function ridge(width, height, baseY, amplitude, steps, rng, fill, extra = '') {
  const points = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = (width * i) / steps;
    const wave =
      Math.sin((i / steps) * Math.PI * 2.1) * amplitude * 0.55 +
      Math.sin((i / steps) * Math.PI * 5.7 + 1.2) * amplitude * 0.25 +
      (rng() - 0.5) * amplitude * 0.35;
    points.push([x, baseY + wave]);
  }
  points.push([width, height], [0, height]);
  return poly(points, fill, extra);
}

function pineTree(x, baseY, size, fill) {
  const layers = [];
  const trunkWidth = size * 0.09;
  layers.push(rect(x - trunkWidth / 2, baseY - size * 0.14, trunkWidth, size * 0.16, fill));
  for (let i = 0; i < 3; i += 1) {
    const top = baseY - size * (0.98 - i * 0.24);
    const spread = size * (0.2 + i * 0.11);
    const bottom = baseY - size * (0.5 - i * 0.24);
    layers.push(poly([[x, top], [x + spread, bottom], [x - spread, bottom]], fill));
  }
  return layers.join('');
}

function svgDocument(width, height, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs>${defs}</defs>${body}</svg>\n`;
}

// ------------------------------------------------------------------ scene

function mountainDawn(w, h) {
  const rng = createRng(1001);
  const defs =
    linearGradient('sky', [[0, '#1b2a52'], [0.45, '#8d5b7d'], [0.75, '#e7885c'], [1, '#f7c979']]) +
    radialGradient('sun', [[0, '#fff3c4'], [0.55, '#ffca6b', 0.9], [1, '#ffb347', 0]]);

  const body = [rect(0, 0, w, h, 'url(#sky)')];
  body.push(circle(w * 0.68, h * 0.42, h * 0.3, 'url(#sun)'));
  body.push(circle(w * 0.68, h * 0.42, h * 0.075, '#fff6d8'));

  // awan bergaris
  for (let i = 0; i < 16; i += 1) {
    const y = h * (0.16 + rng() * 0.34);
    const cw = w * (0.08 + rng() * 0.26);
    const x = rng() * (w - cw);
    body.push(
      ellipse(x + cw / 2, y, cw / 2, h * (0.006 + rng() * 0.014), '#ffe6c4', ` opacity="${n(0.14 + rng() * 0.3)}"`),
    );
  }

  // deretan gunung, makin depan makin gelap
  const ranges = [
    { baseY: h * 0.55, amp: h * 0.1, fill: '#6b5a86' },
    { baseY: h * 0.64, amp: h * 0.11, fill: '#4e4470' },
    { baseY: h * 0.74, amp: h * 0.09, fill: '#33305a' },
  ];
  for (const range of ranges) {
    body.push(ridge(w, h, range.baseY, range.amp, 22, rng, range.fill));
  }

  // puncak bersalju
  for (let i = 0; i < 5; i += 1) {
    const x = w * (0.08 + i * 0.2 + rng() * 0.05);
    const peakY = h * (0.5 + rng() * 0.06);
    const size = h * (0.07 + rng() * 0.05);
    body.push(poly([[x, peakY], [x + size, peakY + size * 1.5], [x - size, peakY + size * 1.5]], '#8a7ba8'));
    body.push(poly([[x, peakY], [x + size * 0.42, peakY + size * 0.62], [x - size * 0.42, peakY + size * 0.62]], '#efe7f5'));
  }

  // hutan di kaki gunung
  body.push(ridge(w, h, h * 0.83, h * 0.03, 18, rng, '#1e2340'));
  for (let i = 0; i < 90; i += 1) {
    const x = rng() * w;
    const baseY = h * (0.84 + rng() * 0.16);
    body.push(pineTree(x, baseY, h * (0.05 + rng() * 0.07), '#141830'));
  }

  return { defs, body: body.join('') };
}

function pineLake(w, h) {
  const rng = createRng(2002);
  const defs =
    linearGradient('sky2', [[0, '#0e2a33'], [0.55, '#2d6b6d'], [1, '#a8d3b4']]) +
    linearGradient('water', [[0, '#1c4a52'], [1, '#0a2128']]);

  const horizon = h * 0.52;
  const body = [rect(0, 0, w, h, 'url(#sky2)'), rect(0, horizon, w, h - horizon, 'url(#water)')];

  // matahari pucat + pantulannya
  body.push(circle(w * 0.3, h * 0.26, h * 0.06, '#f3f0cf', ' opacity="0.8"'));
  for (let i = 0; i < 22; i += 1) {
    const y = horizon + (i / 22) * (h - horizon) * 0.9;
    const spread = w * (0.02 + (i / 22) * 0.09);
    body.push(rect(w * 0.3 - spread / 2, y, spread, h * 0.006, '#e8ecc9', ` opacity="${n(0.34 - i * 0.013)}"`));
  }

  // bukit berkabut
  body.push(ridge(w, horizon + 2, horizon - h * 0.1, h * 0.05, 16, rng, '#2f6a63', ' opacity="0.75"'));
  body.push(ridge(w, horizon + 2, horizon - h * 0.04, h * 0.035, 20, rng, '#1d4a4a'));

  // hutan pinus di tepi
  for (let i = 0; i < 120; i += 1) {
    const x = rng() * w;
    const size = h * (0.08 + rng() * 0.14);
    body.push(pineTree(x, horizon + h * 0.005, size, rng() > 0.5 ? '#0f2e2c' : '#153833'));
  }

  // riak air
  for (let i = 0; i < 70; i += 1) {
    const y = horizon + rng() * (h - horizon);
    const width = w * (0.02 + rng() * 0.12);
    body.push(rect(rng() * (w - width), y, width, h * 0.004, '#78b39f', ` opacity="${n(0.08 + rng() * 0.22)}"`));
  }

  // batu di depan
  for (let i = 0; i < 7; i += 1) {
    const x = rng() * w;
    const y = h * (0.9 + rng() * 0.08);
    body.push(ellipse(x, y, w * (0.02 + rng() * 0.04), h * (0.012 + rng() * 0.02), '#0a1a1e'));
  }

  return { defs, body: body.join('') };
}

function desertDunes(w, h) {
  const rng = createRng(3003);
  const defs =
    linearGradient('dsky', [[0, '#3d2b57'], [0.4, '#c96f4f'], [0.8, '#f0a45f'], [1, '#f6cf94']]) +
    radialGradient('dsun', [[0, '#fff1cf'], [1, '#ffcf7a', 0]]);

  const body = [rect(0, 0, w, h, 'url(#dsky)')];
  body.push(circle(w * 0.5, h * 0.44, h * 0.22, 'url(#dsun)'));
  body.push(circle(w * 0.5, h * 0.44, h * 0.09, '#ffeec2'));

  const tones = ['#c98a52', '#b9764a', '#a2603f', '#8a4c36', '#6d3a2b'];
  tones.forEach((fill, index) => {
    const baseY = h * (0.5 + index * 0.11);
    const points = [];
    const steps = 26;
    for (let i = 0; i <= steps; i += 1) {
      const x = (w * i) / steps;
      const wave =
        Math.sin((i / steps) * Math.PI * (1.4 + index * 0.6) + index) * h * 0.05 +
        Math.sin((i / steps) * Math.PI * 4.3 + index * 2) * h * 0.018;
      points.push([x, baseY + wave]);
    }
    points.push([w, h], [0, h]);
    body.push(poly(points, fill));
  });

  // riak pasir
  for (let i = 0; i < 160; i += 1) {
    const y = h * (0.58 + rng() * 0.42);
    const width = w * (0.03 + rng() * 0.1);
    body.push(
      path(
        `M${n(rng() * (w - width))} ${n(y)} q ${n(width / 2)} ${n(-h * 0.012)} ${n(width)} 0`,
        'none',
        ` stroke="#f3c893" stroke-opacity="${n(0.06 + rng() * 0.16)}" stroke-width="${n(h * 0.004)}"`,
      ),
    );
  }

  // kafilah kecil sebagai titik fokus
  const camelY = h * 0.72;
  for (let i = 0; i < 3; i += 1) {
    const x = w * (0.16 + i * 0.06);
    body.push(ellipse(x, camelY, w * 0.012, h * 0.016, '#4a2a22'));
    body.push(rect(x - w * 0.002, camelY, w * 0.004, h * 0.022, '#4a2a22'));
  }

  return { defs, body: body.join('') };
}

function butterflyGarden(w, h) {
  const rng = createRng(4004);
  const defs =
    radialGradient('bg4', [[0, '#f7f0c9'], [1, '#8fbf6e']]) +
    linearGradient('wing', [[0, '#ff8a3d'], [0.5, '#e2452f'], [1, '#7a1d4a']]);

  const body = [rect(0, 0, w, h, 'url(#bg4)')];

  // dedaunan latar
  for (let i = 0; i < 70; i += 1) {
    const x = rng() * w;
    const y = rng() * h;
    const size = h * (0.04 + rng() * 0.1);
    body.push(
      ellipse(x, y, size, size * 0.38, rng() > 0.5 ? '#5f9e52' : '#4a8446',
        ` opacity="0.55" transform="rotate(${n(rng() * 360)} ${n(x)} ${n(y)})"`),
    );
  }

  // bunga-bunga
  for (let i = 0; i < 26; i += 1) {
    const cx = rng() * w;
    const cy = rng() * h;
    const petal = h * (0.018 + rng() * 0.026);
    const color = ['#f2e06a', '#ef7fa4', '#f9f4e4', '#c98ede'][Math.floor(rng() * 4)];
    for (let p = 0; p < 6; p += 1) {
      const angle = (p / 6) * Math.PI * 2;
      body.push(ellipse(cx + Math.cos(angle) * petal, cy + Math.sin(angle) * petal, petal * 0.72, petal * 0.52, color));
    }
    body.push(circle(cx, cy, petal * 0.5, '#f6b73c'));
  }

  // kupu-kupu di tengah (simetris)
  const cx = w * 0.5;
  const cy = h * 0.48;
  const s = Math.min(w, h);
  for (const dir of [-1, 1]) {
    const upper = `M${n(cx)} ${n(cy)} C ${n(cx + dir * s * 0.34)} ${n(cy - s * 0.4)} ${n(cx + dir * s * 0.44)} ${n(cy - s * 0.05)} ${n(cx + dir * s * 0.06)} ${n(cy + s * 0.02)} Z`;
    const lower = `M${n(cx)} ${n(cy + s * 0.02)} C ${n(cx + dir * s * 0.3)} ${n(cy + s * 0.12)} ${n(cx + dir * s * 0.2)} ${n(cy + s * 0.34)} ${n(cx + dir * s * 0.03)} ${n(cy + s * 0.12)} Z`;
    body.push(path(upper, 'url(#wing)', ' stroke="#3a0f28" stroke-width="3"'));
    body.push(path(lower, '#d2593a', ' stroke="#3a0f28" stroke-width="3"'));

    for (let i = 0; i < 7; i += 1) {
      body.push(
        circle(cx + dir * s * (0.1 + i * 0.035), cy - s * (0.16 - i * 0.02), s * (0.012 + rng() * 0.014), '#fbe9c0', ' opacity="0.9"'),
      );
    }
  }
  body.push(ellipse(cx, cy + s * 0.05, s * 0.018, s * 0.13, '#2a0d1c'));
  body.push(circle(cx, cy - s * 0.09, s * 0.026, '#2a0d1c'));
  for (const dir of [-1, 1]) {
    body.push(
      path(
        `M${n(cx)} ${n(cy - s * 0.1)} q ${n(dir * s * 0.09)} ${n(-s * 0.12)} ${n(dir * s * 0.14)} ${n(-s * 0.04)}`,
        'none',
        ' stroke="#2a0d1c" stroke-width="4" stroke-linecap="round"',
      ),
    );
  }

  return { defs, body: body.join('') };
}

function koiPond(w, h) {
  const rng = createRng(5005);
  const defs =
    radialGradient('pond', [[0, '#2e6f7d'], [1, '#0c2c38']]) +
    linearGradient('koi', [[0, '#ff9a4d'], [1, '#e2452f']]);

  const body = [rect(0, 0, w, h, 'url(#pond)')];

  // riak lingkaran
  for (let i = 0; i < 14; i += 1) {
    const cx = rng() * w;
    const cy = rng() * h;
    for (let r = 1; r <= 3; r += 1) {
      body.push(
        circle(cx, cy, h * 0.03 * r * (0.8 + rng() * 0.6), 'none',
          ` stroke="#9fd8d2" stroke-opacity="${n(0.16 - r * 0.03)}" stroke-width="${n(h * 0.004)}"`),
      );
    }
  }

  // daun lily
  for (let i = 0; i < 16; i += 1) {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = h * (0.04 + rng() * 0.05);
    body.push(
      path(
        `M${n(cx)} ${n(cy)} m ${n(-r)} 0 a ${n(r)} ${n(r)} 0 1 1 ${n(r * 2)} 0 a ${n(r)} ${n(r)} 0 1 1 ${n(-r * 2)} 0 Z`,
        rng() > 0.5 ? '#2f7d4f' : '#276b48',
        ' opacity="0.92"',
      ),
    );
    body.push(poly([[cx, cy], [cx + r * 0.16, cy + r], [cx - r * 0.16, cy + r]], '#0c2c38', ' opacity="0.5"'));
  }

  // ikan koi
  for (let i = 0; i < 9; i += 1) {
    const cx = w * (0.1 + rng() * 0.8);
    const cy = h * (0.1 + rng() * 0.8);
    const size = h * (0.07 + rng() * 0.07);
    const angle = rng() * 360;
    const group = [
      ellipse(0, 0, size, size * 0.42, i % 3 === 0 ? '#f7f2e6' : 'url(#koi)'),
      poly([[-size, 0], [-size * 1.7, -size * 0.36], [-size * 1.7, size * 0.36]], i % 3 === 0 ? '#e8dfc9' : '#e2452f'),
      ellipse(size * 0.3, -size * 0.18, size * 0.24, size * 0.14, '#3a1a12', ' opacity="0.6"'),
      circle(size * 0.7, -size * 0.1, size * 0.06, '#20100c'),
    ].join('');
    body.push(`<g transform="translate(${n(cx)} ${n(cy)}) rotate(${n(angle)})">${group}</g>`);
  }

  // kilau permukaan
  for (let i = 0; i < 50; i += 1) {
    const width = w * (0.01 + rng() * 0.05);
    body.push(rect(rng() * w, rng() * h, width, h * 0.005, '#cdece4', ` opacity="${n(0.05 + rng() * 0.15)}"`));
  }

  return { defs, body: body.join('') };
}

function cityNight(w, h) {
  const rng = createRng(6006);
  const defs =
    linearGradient('nsky', [[0, '#070b1c'], [0.5, '#182448'], [1, '#4a3c6b']]) +
    linearGradient('nwater', [[0, '#152040'], [1, '#070b1c']]);

  const horizon = h * 0.74;
  const body = [rect(0, 0, w, h, 'url(#nsky)')];

  for (let i = 0; i < 170; i += 1) {
    body.push(circle(rng() * w, rng() * horizon * 0.8, rng() * 1.8 + 0.5, '#e9f0ff', ` opacity="${n(0.25 + rng() * 0.6)}"`));
  }
  body.push(circle(w * 0.82, h * 0.16, h * 0.07, '#f4f1de'));
  body.push(circle(w * 0.855, h * 0.14, h * 0.055, '#182448', ' opacity="0.55"'));

  // gedung: dua lapis
  const layers = [
    { fill: '#141c38', min: 0.16, max: 0.34, count: 26, glow: '#4d5f9c' },
    { fill: '#0a1026', min: 0.24, max: 0.5, count: 20, glow: '#f2c25c' },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i += 1) {
      const bw = w * (0.03 + rng() * 0.05);
      const bh = h * (layer.min + rng() * (layer.max - layer.min));
      const x = (i / layer.count) * w + rng() * w * 0.02;
      const y = horizon - bh;
      body.push(rect(x, y, bw, bh, layer.fill));

      // antena / atap
      if (rng() > 0.7) body.push(rect(x + bw * 0.45, y - h * 0.04, w * 0.004, h * 0.04, layer.fill));

      // jendela
      const cols = Math.max(2, Math.floor(bw / (w * 0.011)));
      const rowsCount = Math.max(3, Math.floor(bh / (h * 0.035)));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rowsCount; r += 1) {
          if (rng() > 0.52) continue;
          body.push(
            rect(
              x + (c + 0.28) * (bw / cols),
              y + (r + 0.3) * (bh / rowsCount),
              (bw / cols) * 0.42,
              (bh / rowsCount) * 0.4,
              layer.glow,
              ` opacity="${n(0.45 + rng() * 0.55)}"`,
            ),
          );
        }
      }
    }
  }

  // air + pantulan
  body.push(rect(0, horizon, w, h - horizon, 'url(#nwater)'));
  for (let i = 0; i < 130; i += 1) {
    const width = w * (0.004 + rng() * 0.03);
    body.push(
      rect(rng() * w, horizon + rng() * (h - horizon), width, h * 0.005, rng() > 0.5 ? '#f2c25c' : '#6d81c9',
        ` opacity="${n(0.1 + rng() * 0.4)}"`),
    );
  }

  return { defs, body: body.join('') };
}

function nebulaDrift(w, h) {
  const rng = createRng(8008);
  const defs =
    linearGradient('space', [[0, '#050718'], [1, '#140a26']]) +
    radialGradient('neb1', [[0, '#8a4bd8', 0.85], [1, '#8a4bd8', 0]]) +
    radialGradient('neb2', [[0, '#3f7fe0', 0.8], [1, '#3f7fe0', 0]]) +
    radialGradient('neb3', [[0, '#e0568f', 0.75], [1, '#e0568f', 0]]) +
    radialGradient('planet', [[0, '#f7d9a8'], [0.6, '#c88a4e'], [1, '#6d3f28']], { cx: 0.35, cy: 0.32, r: 0.75 });

  const body = [rect(0, 0, w, h, 'url(#space)')];

  const clouds = ['url(#neb1)', 'url(#neb2)', 'url(#neb3)'];
  for (let i = 0; i < 22; i += 1) {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = h * (0.12 + rng() * 0.3);
    body.push(ellipse(cx, cy, r * (0.7 + rng() * 0.8), r * (0.5 + rng() * 0.6), clouds[i % 3], ' opacity="0.55"'));
  }

  for (let i = 0; i < 420; i += 1) {
    const r = rng() * 2.2 + 0.4;
    body.push(circle(rng() * w, rng() * h, r, '#ffffff', ` opacity="${n(0.2 + rng() * 0.75)}"`));
  }
  for (let i = 0; i < 12; i += 1) {
    const cx = rng() * w;
    const cy = rng() * h;
    const r = h * 0.02;
    body.push(circle(cx, cy, r * 0.3, '#ffffff'));
    body.push(rect(cx - r, cy - h * 0.0015, r * 2, h * 0.003, '#ffffff', ' opacity="0.55"'));
    body.push(rect(cx - h * 0.0015, cy - r, h * 0.003, r * 2, '#ffffff', ' opacity="0.55"'));
  }

  // planet bercincin
  const px = w * 0.72;
  const py = h * 0.35;
  const pr = h * 0.17;
  body.push(
    `<g transform="rotate(-18 ${n(px)} ${n(py)})">${ellipse(px, py, pr * 2.1, pr * 0.42, 'none', ` stroke="#d9b382" stroke-opacity="0.75" stroke-width="${n(pr * 0.16)}"`)}</g>`,
  );
  body.push(circle(px, py, pr, 'url(#planet)'));
  for (let i = 0; i < 6; i += 1) {
    body.push(
      ellipse(px, py - pr * 0.6 + i * pr * 0.26, pr * (0.95 - Math.abs(i - 3) * 0.16), pr * 0.07, '#a56a3c', ' opacity="0.45"'),
    );
  }
  body.push(circle(px - pr * 0.3, py - pr * 0.25, pr * 0.18, '#e8c48f', ' opacity="0.5"'));

  // bulan kecil
  body.push(circle(w * 0.42, h * 0.72, h * 0.045, '#c9c9d8'));
  for (let i = 0; i < 6; i += 1) {
    body.push(circle(w * 0.42 + (rng() - 0.5) * h * 0.06, h * 0.72 + (rng() - 0.5) * h * 0.06, h * (0.005 + rng() * 0.01), '#9a9ab0'));
  }

  return { defs, body: body.join('') };
}

/** Mozaik kaca: tiap sel diberi warna berdasarkan jarak ke pusat + noise. */
function mosaicBloom(w, h) {
  const rng = createRng(9009);
  const defs = radialGradient('mb', [[0, '#2b2350'], [1, '#0d0b1c']]);
  const body = [rect(0, 0, w, h, 'url(#mb)')];

  const palette = ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#4dabf7', '#9775fa', '#f783ac'];
  const cols = 26;
  const rows = Math.max(6, Math.round((cols * h) / w));
  const cellW = w / cols;
  const cellH = h / rows;
  const cx = w * 0.5;
  const cy = h * 0.5;
  const maxDist = Math.hypot(cx, cy);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * cellW;
      const y = r * cellH;
      const dist = Math.hypot(x + cellW / 2 - cx, y + cellH / 2 - cy) / maxDist;
      const index = Math.floor((dist * palette.length + rng() * 1.6) % palette.length);
      const color = palette[index];
      const opacity = n(0.35 + (1 - dist) * 0.55 + rng() * 0.12);
      const inset = Math.min(cellW, cellH) * 0.08;

      // tiap sel dibelah jadi dua segitiga dengan warna sedikit berbeda
      const flip = rng() > 0.5;
      const a = flip
        ? [[x + inset, y + inset], [x + cellW - inset, y + inset], [x + inset, y + cellH - inset]]
        : [[x + inset, y + inset], [x + cellW - inset, y + inset], [x + cellW - inset, y + cellH - inset]];
      const b = flip
        ? [[x + cellW - inset, y + inset], [x + cellW - inset, y + cellH - inset], [x + inset, y + cellH - inset]]
        : [[x + inset, y + inset], [x + cellW - inset, y + cellH - inset], [x + inset, y + cellH - inset]];

      body.push(poly(a, color, ` opacity="${opacity}"`));
      body.push(poly(b, palette[(index + 3) % palette.length], ` opacity="${n(opacity * 0.72)}"`));
    }
  }

  // bunga cahaya di tengah
  for (let ring = 5; ring >= 1; ring -= 1) {
    const petals = ring * 4;
    for (let p = 0; p < petals; p += 1) {
      const angle = (p / petals) * Math.PI * 2 + ring * 0.3;
      const radius = (Math.min(w, h) * 0.055) * ring;
      body.push(
        ellipse(
          cx + Math.cos(angle) * radius,
          cy + Math.sin(angle) * radius,
          Math.min(w, h) * 0.035,
          Math.min(w, h) * 0.014,
          palette[ring % palette.length],
          ` opacity="0.7" transform="rotate(${n((angle * 180) / Math.PI)} ${n(cx + Math.cos(angle) * radius)} ${n(cy + Math.sin(angle) * radius)})"`,
        ),
      );
    }
  }
  body.push(circle(cx, cy, Math.min(w, h) * 0.05, '#fff3bf', ' opacity="0.9"'));

  return { defs, body: body.join('') };
}

function waveBands(w, h) {
  const rng = createRng(1101);
  const defs = linearGradient('wb', [[0, '#0f2f4a'], [1, '#07131f']]);
  const body = [rect(0, 0, w, h, 'url(#wb)')];

  const palette = ['#f6b93b', '#e55039', '#b8409f', '#4a69bd', '#38ada9', '#78e08f'];
  for (let band = 0; band < 26; band += 1) {
    const color = palette[band % palette.length];
    const baseY = h * (0.1 + (band / 26) * 0.85);
    const amp = h * (0.02 + rng() * 0.05);
    const phase = rng() * Math.PI * 2;
    const steps = 40;
    let d = '';
    for (let i = 0; i <= steps; i += 1) {
      const x = (w * i) / steps;
      const y = baseY + Math.sin((i / steps) * Math.PI * 3 + phase) * amp + Math.sin((i / steps) * Math.PI * 7 + phase) * amp * 0.3;
      d += `${i === 0 ? 'M' : 'L'}${n(x)} ${n(y)} `;
    }
    body.push(path(d.trim(), 'none', ` stroke="${color}" stroke-opacity="${n(0.35 + rng() * 0.5)}" stroke-width="${n(h * (0.006 + rng() * 0.016))}" stroke-linecap="round"`));
  }

  for (let i = 0; i < 140; i += 1) {
    body.push(circle(rng() * w, rng() * h, rng() * h * 0.008 + 1, palette[Math.floor(rng() * palette.length)], ` opacity="${n(0.2 + rng() * 0.5)}"`));
  }

  return { defs, body: body.join('') };
}

// ------------------------------------------------------------------ manifest

const SCENES = [
  { id: 'gunung-fajar', title: 'Gunung Saat Fajar', category: 'Alam', width: 1600, height: 1200, draw: mountainDawn },
  { id: 'danau-hutan', title: 'Danau di Tepi Hutan', category: 'Alam', width: 1500, height: 1000, draw: pineLake },
  { id: 'bukit-pasir', title: 'Bukit Pasir Senja', category: 'Alam', width: 1600, height: 900, draw: desertDunes },
  { id: 'kupu-kupu', title: 'Kupu-kupu di Taman', category: 'Hewan', width: 1200, height: 1200, draw: butterflyGarden },
  { id: 'kolam-koi', title: 'Kolam Ikan Koi', category: 'Hewan', width: 1300, height: 1000, draw: koiPond },
  { id: 'kota-malam', title: 'Kota di Malam Hari', category: 'Kota', width: 1800, height: 1000, draw: cityNight },
  { id: 'nebula', title: 'Nebula & Planet Bercincin', category: 'Angkasa', width: 1600, height: 1000, draw: nebulaDrift },
  { id: 'mozaik', title: 'Mozaik Kaca', category: 'Abstrak', width: 1200, height: 1200, draw: mosaicBloom },
  { id: 'gelombang', title: 'Gelombang Warna', category: 'Abstrak', width: 1400, height: 1000, draw: waveBands },
];

mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];
for (const scene of SCENES) {
  const { defs, body } = scene.draw(scene.width, scene.height);
  const svg = svgDocument(scene.width, scene.height, defs, body);
  writeFileSync(join(OUT_DIR, `${scene.id}.svg`), svg, 'utf8');
  manifest.push({
    id: scene.id,
    title: scene.title,
    category: scene.category,
    url: `/sample-images/${scene.id}.svg`,
    width: scene.width,
    height: scene.height,
  });
  console.log(`  ✓ ${scene.id}.svg  (${(svg.length / 1024).toFixed(1)} KB)`);
}

writeFileSync(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
console.log(`\n${manifest.length} gambar dibuat di public/sample-images/`);
