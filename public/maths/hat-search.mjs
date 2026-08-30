#!/usr/bin/env node
/*
 * hat-search.mjs — find the einstein "hat" from scratch, by search.
 *
 *   node hat-search.mjs            enumerate, screen, and identify the hat
 *   node hat-search.mjs 40         also build a radius-40 patch and print it
 *
 * The hat (Smith, Myers, Kaplan and Goodman-Strauss, 2023) is eight kites of the
 * deltoidal trihexagonal tiling. This script never assumes its coordinates. It
 * enumerates every 8-kite polykite, keeps the ones whose outline is a simple
 * 13-gon, asks an exact-cover solver which of those can fill a disc, and then
 * picks out the one whose tilings are forced to mix both reflections in the
 * ratio 1 : phi^4. Standard library only; no dependencies.
 *
 * Written for owenmedeiros.com/maths/aperiodic-tiles.
 */

const R3 = Math.sqrt(3);
const PHI = (1 + Math.sqrt(5)) / 2;

/* ---------------------------------------------------------------- *
 * The kite grid.
 *
 * Every hexagon of side 2 splits into 6 kites (centre, edge midpoint,
 * hexagon vertex, edge midpoint) with sides sqrt3, 1, 1, sqrt3 and angles
 * 60, 90, 120, 90. A kite is addressed as (q, r, k): kite k of the hexagon
 * at axial coordinate (q, r). Corner coordinates are kept as integers:
 * (X, Y) stands for the real point (X/2, Y*sqrt3/2).
 * ---------------------------------------------------------------- */

const VERT = [[4, 0], [2, 2], [-2, 2], [-4, 0], [-2, -2], [2, -2]];
const MID = [[3, 1], [0, 2], [-3, 1], [-3, -1], [0, -2], [3, -1]];

const corners = (q, r, k) => {
  const cx = 6 * q, cy = 2 * q + 4 * r;
  const at = (d) => [cx + d[0], cy + d[1]];
  return [[cx, cy], at(MID[(k + 5) % 6]), at(VERT[k]), at(MID[k])];
};
const real = ([X, Y]) => [X / 2, (Y * R3) / 2];
const centroid = (q, r, k) => {
  const p = corners(q, r, k).map(real);
  return [(p[0][0] + p[1][0] + p[2][0] + p[3][0]) / 4, (p[0][1] + p[1][1] + p[2][1] + p[3][1]) / 4];
};
const pack = (q, r, k) => ((q + 256) << 18) | ((r + 256) << 9) | (k << 3);
const ptKey = (p) => `${p[0]},${p[1]}`;
const edgeKey = (a, b) => (ptKey(a) < ptKey(b) ? `${ptKey(a)}|${ptKey(b)}` : `${ptKey(b)}|${ptKey(a)}`);

/** Rotate by 60*turns degrees CCW, after an optional reflection in the x-axis. */
function transform([q, r, k], turns, flip) {
  if (flip) { r = -q - r; k = (6 - k) % 6; }
  for (let i = 0; i < turns; i++) { const nq = -r; r = q + r; q = nq; k = (k + 1) % 6; }
  return [q, r, k];
}

/* ---------------------------------------------------------------- *
 * Step 1: enumerate connected 8-kite polykites, up to translation.
 * ---------------------------------------------------------------- */

function neighbours(cell) {
  // Kites sharing an edge: found by matching corner pairs, so no adjacency
  // table has to be written out by hand.
  const own = corners(...cell);
  const out = [];
  for (let dq = -1; dq <= 1; dq++) for (let dr = -1; dr <= 1; dr++) for (let k = 0; k < 6; k++) {
    const other = [cell[0] + dq, cell[1] + dr, k];
    if (other[0] === cell[0] && other[1] === cell[1] && other[2] === cell[2]) continue;
    const theirs = corners(...other);
    let shared = 0;
    for (const a of own) for (const b of theirs) if (a[0] === b[0] && a[1] === b[1]) shared++;
    if (shared === 2) out.push(other);
  }
  return out;
}

function enumeratePolykites(size) {
  const norm = (cells) => {
    const minQ = Math.min(...cells.map((c) => c[0]));
    const minR = Math.min(...cells.map((c) => c[1]));
    return cells.map((c) => `${c[0] - minQ},${c[1] - minR},${c[2]}`).sort().join(' ');
  };
  let level = new Map();
  for (let k = 0; k < 6; k++) level.set(norm([[0, 0, k]]), [[0, 0, k]]);
  for (let n = 1; n < size; n++) {
    const next = new Map();
    for (const cells of level.values()) {
      const have = new Set(cells.map((c) => pack(...c)));
      for (const c of cells) for (const nb of neighbours(c)) {
        if (have.has(pack(...nb))) continue;
        const grown = cells.concat([nb]);
        const key = norm(grown);
        if (!next.has(key)) next.set(key, grown);
      }
    }
    level = next;
  }
  return [...level.values()];
}

/* ---------------------------------------------------------------- *
 * Step 2: keep the ones whose outline is a simple 13-gon.
 * ---------------------------------------------------------------- */

function outline(cells) {
  const count = new Map(), store = new Map();
  for (const c of cells) {
    const p = corners(...c);
    for (let e = 0; e < 4; e++) {
      const a = p[e], b = p[(e + 1) % 4], key = edgeKey(a, b);
      count.set(key, (count.get(key) || 0) + 1);
      store.set(key, [a, b]);
    }
  }
  const border = [...count.entries()].filter(([, n]) => n === 1).map(([k]) => store.get(k));
  const adj = new Map();
  for (const [a, b] of border) for (const [x, y] of [[a, b], [b, a]]) {
    const key = ptKey(x);
    if (!adj.has(key)) adj.set(key, []);
    adj.get(key).push(y);
  }
  if ([...adj.values()].some((v) => v.length !== 2)) return null;     // pinch point
  const start = border[0][0], loop = [start];
  let prev = ptKey(start), cur = adj.get(ptKey(start))[0];
  while (ptKey(cur) !== ptKey(start)) {
    loop.push(cur);
    const [a, b] = adj.get(ptKey(cur));
    const next = ptKey(a) === prev ? b : a;
    prev = ptKey(cur);
    cur = next;
  }
  if (loop.length !== border.length) return null;                    // a hole
  const merged = [];
  for (let i = 0; i < loop.length; i++) {
    const a = real(loop[(i + loop.length - 1) % loop.length]);
    const b = real(loop[i]);
    const c = real(loop[(i + 1) % loop.length]);
    if (Math.abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 1e-9) merged.push(real(loop[i]));
  }
  return merged;
}

/** Cyclic (edge length, turn) signature, canonical over rotation and reflection. */
function congruenceKey(poly) {
  const sig = poly.map((p, i) => {
    const b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const len = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const turn = Math.atan2(
      (b[0] - p[0]) * (c[1] - b[1]) - (b[1] - p[1]) * (c[0] - b[0]),
      (b[0] - p[0]) * (c[0] - b[0]) + (b[1] - p[1]) * (c[1] - b[1]),
    ) * 180 / Math.PI;
    return `${len.toFixed(3)}:${turn.toFixed(0)}`;
  });
  const rotations = (arr) => arr.map((_, i) => arr.slice(i).concat(arr.slice(0, i)).join(','));
  const mirrored = [...sig].reverse().map((s) => { const [l, t] = s.split(':'); return `${l}:${-Number(t)}`; });
  return [...rotations(sig), ...rotations(mirrored)].sort()[0];
}

/* ---------------------------------------------------------------- *
 * Step 3: can it fill a disc?
 *
 * Kites are filled centre-out in a fixed order, so each node only has to
 * consider the placements covering one kite. Tiles may spill past the disc
 * into a padding ring, which keeps the boundary from doing the work.
 * ---------------------------------------------------------------- */

function makeSolver(shape, radius, padding = 9) {
  const inner = [], outer = [];
  const span = Math.ceil((radius + padding) / 2) + 4;
  for (let q = -span; q <= span; q++) for (let r = -span; r <= span; r++) for (let k = 0; k < 6; k++) {
    const d = Math.hypot(...centroid(q, r, k));
    if (d <= radius) inner.push({ cell: [q, r, k], d });
    else if (d <= radius + padding) outer.push({ cell: [q, r, k], d });
  }
  inner.sort((a, b) => a.d - b.d);
  const cells = inner.concat(outer);
  const index = new Map(cells.map((c, i) => [pack(...c.cell), i]));

  const oris = [];
  for (let t = 0; t < 6; t++) for (const flip of [false, true]) oris.push({ cells: shape.map((c) => transform(c, t, flip)), t, flip });

  const options = inner.map(() => []);
  const seen = new Set();
  inner.forEach((slot, n) => {
    for (const ori of oris) for (const s of ori.cells) {
      if (s[2] !== slot.cell[2]) continue;
      const dq = slot.cell[0] - s[0], dr = slot.cell[1] - s[1];
      const ids = [];
      let ok = true;
      for (const c of ori.cells) {
        const j = index.get(pack(c[0] + dq, c[1] + dr, c[2]));
        if (j === undefined) { ok = false; break; }
        ids.push(j);
      }
      if (!ok) continue;
      ids.sort((a, b) => a - b);
      const key = ids.join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      const first = ids.find((j) => j < inner.length);
      if (first !== undefined) options[first].push({ ids, meta: [dq, dr, ori.t, ori.flip ? 1 : 0] });
    }
  });

  return function solve(budget, rng) {
    const used = new Uint8Array(cells.length);
    const placed = [];
    let nodes = 0;
    const step = (from) => {
      if (++nodes > budget) return false;
      let n = from;
      while (n < inner.length && used[n]) n++;
      if (n >= inner.length) return true;
      const opts = options[n].filter((p) => p.ids.every((j) => !used[j]));
      for (let i = opts.length - 1; i > 0; i--) {
        const j = (rng() * (i + 1)) | 0;
        [opts[i], opts[j]] = [opts[j], opts[i]];
      }
      for (const opt of opts) {
        for (const j of opt.ids) used[j] = 1;
        placed.push(opt);
        if (step(n + 1)) return true;
        placed.pop();
        for (const j of opt.ids) used[j] = 0;
      }
      return false;
    };
    return step(0) ? { placed: placed.slice(), nodes, filled: inner.length } : { failed: true, nodes };
  };
}

const seeded = (seed) => () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };

/* ---------------------------------------------------------------- *
 * Run it.
 * ---------------------------------------------------------------- */

const t0 = Date.now();
const all = enumeratePolykites(8);
console.log(`8-kite polykites, up to translation: ${all.length}`);

const shapes = new Map();
for (const cells of all) {
  const poly = outline(cells);
  if (!poly || poly.length !== 13) continue;
  const key = congruenceKey(poly);
  if (!shapes.has(key)) shapes.set(key, cells);
}
const thirteen = [...shapes.values()];
console.log(`with a simple 13-gon outline, up to congruence: ${thirteen.length}`);

let survivors = thirteen;
for (const radius of [5, 12, 30]) {
  survivors = survivors.filter((shape, i) => !makeSolver(shape, radius).call(null, 4e6, seeded(9001 + i)).failed);
  console.log(`can fill a disc of radius ${radius}: ${survivors.length}`);
}

const scored = survivors.map((shape) => {
  const res = makeSolver(shape, 20)(4e6, seeded(4242));
  const minority = Math.min(
    res.placed.filter((p) => p.meta[3]).length,
    res.placed.filter((p) => !p.meta[3]).length,
  ) / res.placed.length;
  return { shape, minority, tiles: res.placed.length };
});
const target = 1 / (1 + Math.pow(PHI, 4));
scored.sort((a, b) => Math.abs(a.minority - target) - Math.abs(b.minority - target));

console.log(`\nreflection mix in a radius-20 patch (the hat should sit at ${(target * 100).toFixed(1)}%):`);
for (const s of scored) console.log(`  ${(s.minority * 100).toFixed(1).padStart(5)}%  of ${s.tiles} tiles`);

const hat = scored[0];
const poly = outline(hat.shape);
const lengths = poly.map((p, i) => {
  const q = poly[(i + 1) % poly.length];
  return Math.hypot(q[0] - p[0], q[1] - p[1]);
});
console.log(`\nthe hat: ${JSON.stringify(hat.shape)}`);
console.log(`  13-gon edges: ${lengths.map((x) => x.toFixed(3)).join(' ')}`);
console.log(`  found in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const want = Number(process.argv[2]);
if (want > 0) {
  const solve = makeSolver(hat.shape, want);
  for (let attempt = 0; attempt < 12; attempt++) {
    const res = solve(3e8, seeded(1000003 * (attempt + 1) + want));
    console.log(`patch radius ${want}, attempt ${attempt}: ${res.failed ? `no cover in ${res.nodes} nodes` : `${res.placed.length} tiles`}`);
    if (res.failed) continue;
    const meta = res.placed.map((p) => p.meta);
    // Replay the printed data rather than trusting the solver's own bookkeeping:
    // rebuild each tile from [dq, dr, rotation, reflected] alone and check the
    // result really is a gap-free, overlap-free cover. Anything lost on the way
    // out — a dropped rotation, say — shows up here and nowhere else.
    const covered = new Set();
    for (const [dq, dr, turns, flip] of meta) for (const cell of hat.shape) {
      const t = transform(cell, turns, !!flip);
      const id = pack(t[0] + dq, t[1] + dr, t[2]);
      if (covered.has(id)) throw new Error('two tiles cover the same kite');
      covered.add(id);
    }
    const span = Math.ceil((want + 9) / 2) + 4;
    let core = 0;
    for (let q = -span; q <= span; q++) for (let r = -span; r <= span; r++) for (let k = 0; k < 6; k++) {
      if (Math.hypot(...centroid(q, r, k)) > want) continue;
      core++;
      if (!covered.has(pack(q, r, k))) throw new Error(`gap at ${q},${r},${k}`);
    }
    const flipped = meta.filter((m) => m[3]).length;
    console.log(`  replayed: ${covered.size} kites covered, all ${core} in the disc filled, no overlaps`);
    console.log(`  ${flipped} of ${meta.length} reflected`);
    console.log(JSON.stringify(meta));
    break;
  }
}
