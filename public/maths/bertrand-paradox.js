/*
 * Bertrand's paradox — sampler for owenmedeiros.com/maths/bertrand-paradox
 *
 * Four ways to draw a chord "at random" in the unit circle, and the four
 * different answers they give to one question: is the chord longer than the
 * side of the inscribed equilateral triangle?
 *
 *   endpoints   Two uniform points on the circumference.            P = 1/3
 *   radius      Uniform point along a uniformly chosen radius,
 *               taken as the chord's midpoint.                      P = 1/2
 *   midpoint    Uniform point in the disc, taken as the midpoint.   P = 1/4
 *   twopoints   The line through two uniform points in the disc.
 *                                                 P = 1/3 + 3*sqrt(3)/(4pi)
 *
 * Every rotation-invariant method reduces to one number: p, the distance from
 * the centre to the chord. Length is 2*sqrt(1 - p^2), so the chord beats the
 * triangle side exactly when p < 1/2, and a method is nothing more than a
 * density on p in [0, 1]. All four densities are known in closed form, so the
 * strip under the circle can draw the sampled histogram against the exact
 * curve, and the shaded area to the left of p = 1/2 *is* the answer.
 *
 * Sampling is seeded, so raising the count extends the sample rather than
 * redrawing an unrelated one — the picture grows instead of flickering.
 *
 * No dependencies.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("bertrand-app");
  if (!canvas || !canvas.getContext) return;
  var wrap = canvas.closest(".bertrand");
  var ctx = canvas.getContext("2d");

  var TAU = Math.PI * 2;
  var SANS = "-apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif";

  /* ------------------------------------------------------------------ *
   * Randomness, reproducibly.
   * ------------------------------------------------------------------ */

  /**
   * mulberry32. Thirty-two bits of state, uniform enough for counting points
   * against a threshold, and — the reason it is here rather than Math.random —
   * resumable: a pool keeps its generator, so asking for more samples continues
   * the same stream instead of starting a new one.
   */
  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------------ *
   * The four methods.
   * ------------------------------------------------------------------ */

  /**
   * A chord written the canonical way: the foot of the perpendicular from the
   * centre sits at distance p in direction phi, and the chord runs across it,
   * half of it either side.
   */
  function fromFoot(o, p, phi) {
    var h = Math.sqrt(Math.max(0, 1 - p * p));
    var c = Math.cos(phi), s = Math.sin(phi);
    o.mx = p * c;
    o.my = p * s;
    o.ax = o.mx - h * s;
    o.ay = o.my + h * c;
    o.bx = o.mx + h * s;
    o.by = o.my - h * c;
    o.p = p;
  }

  /** The same, from two points already known to be on the circle. */
  function fromEnds(o, ax, ay, bx, by) {
    o.ax = ax; o.ay = ay; o.bx = bx; o.by = by;
    o.mx = (ax + bx) / 2;
    o.my = (ay + by) / 2;
    o.p = Math.hypot(o.mx, o.my);
  }

  function inDisc(rand, out) {
    // sqrt, not the radius itself: area grows as r^2, so a uniform radius
    // would pile the points up at the centre.
    var r = Math.sqrt(rand());
    var t = TAU * rand();
    out[0] = r * Math.cos(t);
    out[1] = r * Math.sin(t);
  }

  var pt1 = [0, 0], pt2 = [0, 0];

  var METHODS = [
    {
      key: "endpoints",
      label: "Two points on the circle",
      short: "endpoints",
      exact: 1 / 3,
      exactLabel: "1/3",
      // p = |cos(half the angle between the endpoints)|, and half that angle is
      // uniform on [0, pi), so the density is the arcsine law.
      density: function (p) { return 2 / (Math.PI * Math.sqrt(Math.max(1e-9, 1 - p * p))); },
      sample: function (rand, o) {
        var a = TAU * rand(), b = TAU * rand();
        fromEnds(o, Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b));
      },
    },
    {
      key: "radius",
      label: "A point along a random radius",
      short: "radius",
      exact: 1 / 2,
      exactLabel: "1/2",
      density: function () { return 1; },
      sample: function (rand, o) { fromFoot(o, rand(), TAU * rand()); },
    },
    {
      key: "midpoint",
      label: "A point anywhere in the disc",
      short: "midpoint",
      exact: 1 / 4,
      exactLabel: "1/4",
      density: function (p) { return 2 * p; },
      sample: function (rand, o) { fromFoot(o, Math.sqrt(rand()), TAU * rand()); },
    },
    {
      key: "twopoints",
      label: "The line through two points in the disc",
      short: "two points",
      exact: 1 / 3 + (3 * Math.sqrt(3)) / (4 * Math.PI),
      exactLabel: "⅓ + 3√3/4π",
      // Pairs of interior points on a given chord number as the cube of its
      // length, so the invariant measure is weighted by (1 - p^2)^(3/2).
      density: function (p) { return (16 / (3 * Math.PI)) * Math.pow(Math.max(0, 1 - p * p), 1.5); },
      sample: function (rand, o) {
        var dx, dy, len;
        do {
          inDisc(rand, pt1);
          inDisc(rand, pt2);
          dx = pt2[0] - pt1[0];
          dy = pt2[1] - pt1[1];
          len = Math.hypot(dx, dy);
        } while (len < 1e-9);
        dx /= len;
        dy /= len;
        // Foot of the perpendicular from the centre onto the line.
        var t = -(pt1[0] * dx + pt1[1] * dy);
        var fx = pt1[0] + t * dx, fy = pt1[1] + t * dy;
        var p = Math.hypot(fx, fy);
        var h = Math.sqrt(Math.max(0, 1 - p * p));
        o.mx = fx; o.my = fy; o.p = p;
        o.ax = fx - h * dx; o.ay = fy - h * dy;
        o.bx = fx + h * dx; o.by = fy + h * dy;
      },
    },
  ];

  var BY_KEY = {};
  for (var mi = 0; mi < METHODS.length; mi++) BY_KEY[METHODS[mi].key] = METHODS[mi];

  /* ------------------------------------------------------------------ *
   * Pools. One per method, grown on demand and never reshuffled.
   * ------------------------------------------------------------------ */

  var seed = 20250830;
  var pools = {};
  var scratch = { ax: 0, ay: 0, bx: 0, by: 0, mx: 0, my: 0, p: 0 };

  function pool(method) {
    var q = pools[method.key];
    if (!q) {
      // Each method gets its own stream, so switching between them does not
      // disturb what the others have already drawn.
      q = pools[method.key] = {
        ax: [], ay: [], bx: [], by: [], mx: [], my: [], p: [], cum: [],
        rand: mulberry32(seed + method.key.length * 7919 + method.key.charCodeAt(0) * 104729),
      };
    }
    return q;
  }

  /** Extend a pool to at least n samples. cum[i] carries the running count of
      long chords, so the estimate at any prefix is one lookup. */
  function ensure(method, n) {
    var q = pool(method);
    for (var i = q.p.length; i < n; i++) {
      method.sample(q.rand, scratch);
      q.ax.push(scratch.ax); q.ay.push(scratch.ay);
      q.bx.push(scratch.bx); q.by.push(scratch.by);
      q.mx.push(scratch.mx); q.my.push(scratch.my);
      q.p.push(scratch.p);
      q.cum.push((i > 0 ? q.cum[i - 1] : 0) + (scratch.p < 0.5 ? 1 : 0));
    }
    return q;
  }

  function longCount(method, n) {
    if (n <= 0) return 0;
    // The readout is written before the frame is drawn, so the pool cannot be
    // assumed to have reached n yet.
    return ensure(method, n).cum[n - 1];
  }

  function reseed() {
    seed = (Math.random() * 0x7fffffff) | 0;
    pools = {};
  }

  /* ------------------------------------------------------------------ *
   * State and colours.
   * ------------------------------------------------------------------ */

  var state = { method: "endpoints", view: "chords", count: 400, shown: 400 };
  var colors = {
    long: "#8a4b2d",
    short: "#6b6b66",
    rim: "rgba(28,28,26,.45)",
    grid: "rgba(28,28,26,.12)",
    bg: "#fbfaf8",
  };

  function readColors() {
    var cs = getComputedStyle(wrap || document.documentElement);
    var pick = function (name, fallback) {
      var v = cs.getPropertyValue(name);
      return v && v.trim() ? v.trim() : fallback;
    };
    colors.long = pick("--bert-long", colors.long);
    colors.short = pick("--bert-short", colors.short);
    colors.rim = pick("--bert-rim", colors.rim);
    colors.grid = pick("--bert-grid", colors.grid);
    colors.bg = pick("--bert-bg", colors.bg);
  }

  /* ------------------------------------------------------------------ *
   * Layout.
   * ------------------------------------------------------------------ */

  var dpr = 1, cssW = 0, cssH = 0, plotH = 0, needsDraw = false;
  var STRIP_H = 86;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    plotH = Math.max(90, cssH - STRIP_H);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    draw();
  }

  /** One big circle, or four small ones in a 2x2 grid with room for a caption
      under each. */
  function panels() {
    if (state.method !== "all") {
      var m = BY_KEY[state.method];
      return [{ m: m, cx: cssW / 2, cy: plotH / 2, r: (Math.min(cssW, plotH) / 2) * 0.9, caption: false }];
    }
    var out = [];
    var cw = cssW / 2, ch = plotH / 2;
    var r = (Math.min(cw, ch) / 2) * 0.82;
    for (var i = 0; i < 4; i++) {
      var col = i % 2, row = (i - col) / 2;
      out.push({
        m: METHODS[i],
        cx: cw * (col + 0.5),
        cy: ch * row + ch / 2 - 12,
        r: r,
        caption: true,
      });
    }
    return out;
  }

  function schedule() {
    if (needsDraw) return;
    needsDraw = true;
    requestAnimationFrame(function () { needsDraw = false; draw(); });
  }

  /* ------------------------------------------------------------------ *
   * Drawing.
   * ------------------------------------------------------------------ */

  /** Text with a halo of the background behind it, so labels stay readable
      where they land on top of the drawing. */
  function label(text, x, y, color, size) {
    ctx.font = (size || 11) + "px " + SANS;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = colors.bg;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function centred(text, x, y, color, size) {
    ctx.font = (size || 11) + "px " + SANS;
    label(text, x - ctx.measureText(text).width / 2, y, color, size);
  }

  /**
   * Ink has to be spent carefully here: a thousand opaque chords is a solid
   * disc. Fade with the count so the density of the bundle reads as shading
   * rather than saturating, and keep a floor so a single chord is still visible.
   */
  function chordAlpha(n, r) {
    // As 1/sqrt(n) rather than 1/n: the latter is the right law for keeping the
    // total ink fixed, and it fades four thousand chords to nothing. The radius
    // only ever thins it — the same chords in a quarter-size circle cross the
    // same pixel four times as often, so the compare panels need less ink than
    // the single one to read as the same picture, while an expanded canvas at
    // full strength would bury the triangle under the bundle.
    return Math.max(0.05, Math.min(0.85, (7 / Math.sqrt(n)) * Math.min(1, r / 200)));
  }

  function drawFrame(pan) {
    ctx.strokeStyle = colors.rim;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(pan.cx, pan.cy, pan.r, 0, TAU);
    ctx.stroke();

    // The inscribed equilateral triangle: the side it draws is the length every
    // chord is being compared against, so it has to stay readable through a
    // thousand chords drawn on top of it. The dash grows with the circle, or it
    // reads as a solid line once the canvas is expanded.
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([Math.max(4, pan.r / 28), Math.max(3, pan.r / 42)]);
    ctx.beginPath();
    for (var i = 0; i < 3; i++) {
      var a = Math.PI / 2 + (i * TAU) / 3;
      var x = pan.cx + Math.cos(a) * pan.r, y = pan.cy - Math.sin(a) * pan.r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    // The midpoint of a chord of exactly that length sits on the circle of half
    // the radius: inside it the chord is longer, outside shorter. Only worth
    // drawing where the midpoints themselves are on show.
    if (state.view !== "chords") {
      ctx.strokeStyle = colors.long;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(pan.cx, pan.cy, pan.r / 2, 0, TAU);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  function drawSamples(pan, n) {
    var q = ensure(pan.m, n);
    var r = pan.r, cx = pan.cx, cy = pan.cy;
    var pass, i;

    if (state.view !== "midpoints") {
      ctx.globalAlpha = chordAlpha(n, r);
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      // Two passes, two paths: the short chords underneath, so the long ones —
      // the ones being counted — stay legible where the bundle is dense.
      for (pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass === 0 ? colors.short : colors.long;
        ctx.beginPath();
        for (i = 0; i < n; i++) {
          if ((q.p[i] < 0.5) !== (pass === 1)) continue;
          ctx.moveTo(cx + q.ax[i] * r, cy - q.ay[i] * r);
          ctx.lineTo(cx + q.bx[i] * r, cy - q.by[i] * r);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    if (state.view !== "chords") {
      var dot = Math.max(0.9, Math.min(2.2, (90 / Math.sqrt(n)) * Math.min(1, r / 200)));
      ctx.globalAlpha = Math.max(0.35, Math.min(1, 300 / n));
      for (pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass === 0 ? colors.short : colors.long;
        ctx.beginPath();
        for (i = 0; i < n; i++) {
          if ((q.p[i] < 0.5) !== (pass === 1)) continue;
          var x = cx + q.mx[i] * r, y = cy - q.my[i] * r;
          ctx.moveTo(x + dot, y);
          ctx.arc(x, y, dot, 0, TAU);
        }
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    var n = Math.max(1, Math.round(state.shown));
    var list = panels();
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cssW, plotH);
    ctx.clip();
    for (var i = 0; i < list.length; i++) {
      var pan = list[i];
      if (pan.r < 8) continue;
      drawSamples(pan, n);
      drawFrame(pan);
      if (pan.caption) {
        var hit = longCount(pan.m, n);
        centred(pan.m.short, pan.cx, pan.cy + pan.r + 15, colors.short, 11);
        centred(
          (hit / n).toFixed(3) + " → " + pan.m.exact.toFixed(4),
          pan.cx, pan.cy + pan.r + 28, colors.long, 10.5
        );
      }
    }
    ctx.restore();

    drawStrip(n);
  }

  /* ------------------------------------------------------------------ *
   * The strip: what a method really is, once the geometry is stripped out.
   * ------------------------------------------------------------------ */

  var BINS = 40;
  var DENSITY_MAX = 3;   // the arcsine density runs to infinity at p = 1
  var hist = new Float64Array(BINS);

  function drawStrip(n) {
    var top = plotH + 10, bot = cssH - 15;
    var left = 8, right = cssW - 8;
    if (bot - top < 24 || right - left < 40) return;

    var px = function (p) { return left + (right - left) * p; };
    var py = function (d) { return bot - (bot - top) * Math.min(d, DENSITY_MAX) / DENSITY_MAX; };
    var half = px(0.5);

    // Everything left of p = 1/2 is a chord longer than the triangle side, so
    // the area of the density over that half is the answer to the question.
    ctx.fillStyle = colors.long;
    ctx.globalAlpha = 0.07;
    ctx.fillRect(left, top, half - left, bot - top);
    ctx.globalAlpha = 1;

    var single = state.method !== "all";

    if (single) {
      var m = BY_KEY[state.method];
      var q = ensure(m, n);
      var i;
      for (i = 0; i < BINS; i++) hist[i] = 0;
      for (i = 0; i < n; i++) {
        var b = Math.min(BINS - 1, Math.floor(q.p[i] * BINS));
        hist[b] += 1;
      }
      var w = (right - left) / BINS;
      for (i = 0; i < BINS; i++) {
        // Counts to density, so the bars and the exact curve share one scale.
        var d = (hist[i] / n) * BINS;
        var h = bot - py(d);
        if (h <= 0) continue;
        ctx.fillStyle = (i + 0.5) / BINS < 0.5 ? colors.long : colors.short;
        ctx.globalAlpha = 0.45;
        ctx.fillRect(left + i * w + 0.5, bot - h, w - 1, h);
      }
      ctx.globalAlpha = 1;
    }

    var curves = single ? [BY_KEY[state.method]] : METHODS;
    var names = [];
    for (var c = 0; c < curves.length; c++) {
      var mm = curves[c];
      ctx.strokeStyle = colors.long;
      ctx.lineWidth = single ? 1.6 : 1.2;
      ctx.globalAlpha = single ? 1 : 0.85;
      ctx.beginPath();
      for (var s = 0; s <= 160; s++) {
        var p = s / 160;
        var y = py(mm.density(p));
        if (s === 0) ctx.moveTo(px(p), y); else ctx.lineTo(px(p), y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Name each curve at the right edge, where the four are furthest apart —
      // they finish at 0, 1, 2 and (clipped) infinity. Anywhere else two of them
      // cross and the names land on top of each other.
      if (!single) names.push({ text: mm.short, y: py(mm.density(0.995)) });
    }

    if (names.length) {
      // Two of them still finish within a few pixels in a strip this short, so
      // the labels are pushed apart and the stack slid back inside the band.
      names.sort(function (a, b) { return a.y - b.y; });
      var k;
      for (k = 0; k < names.length; k++) {
        names[k].y = Math.max(top + 9, k > 0 ? Math.max(names[k].y, names[k - 1].y + 11) : names[k].y);
      }
      var over = names[names.length - 1].y - (bot - 3);
      for (k = 0; over > 0 && k < names.length; k++) names[k].y -= over;
      for (k = 0; k < names.length; k++) {
        ctx.font = "10px " + SANS;
        label(names[k].text, right - 2 - ctx.measureText(names[k].text).width, names[k].y, colors.short, 10);
      }
    }

    ctx.strokeStyle = colors.rim;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(half) + 0.5, top);
    ctx.lineTo(Math.round(half) + 0.5, bot);
    ctx.moveTo(left, Math.round(bot) + 0.5);
    ctx.lineTo(right, Math.round(bot) + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    label("density of p", left + 2, top + 10, colors.short, 10);
    label("0", left + 2, cssH - 3, colors.short, 10);
    centred("½", half, cssH - 3, colors.short, 10);
    ctx.font = "10px " + SANS;
    label("1", right - ctx.measureText("1").width, cssH - 3, colors.short, 10);
  }

  /* ------------------------------------------------------------------ *
   * Controls.
   * ------------------------------------------------------------------ */

  var pick = function (sel) { return wrap ? wrap.querySelector(sel) : null; };
  var els = {
    method: pick("[data-role=method]"),
    view: pick("[data-role=view]"),
    count: pick("[data-role=count]"),
    countValue: pick("[data-role=count-value]"),
    run: pick("[data-role=run]"),
    resample: pick("[data-role=resample]"),
    expand: pick("[data-role=expand]"),
    readout: pick("[data-role=readout]"),
    legend: pick("[data-role=legend]"),
  };

  function summary(n) {
    if (state.method === "all") {
      var parts = [];
      for (var i = 0; i < METHODS.length; i++) {
        parts.push(METHODS[i].short + " " + (longCount(METHODS[i], n) / n).toFixed(3));
      }
      return n.toLocaleString() + " chords each · " + parts.join(" · ");
    }
    var m = BY_KEY[state.method];
    var hit = longCount(m, n);
    // Two standard errors of the sample proportion — the width the estimate is
    // entitled to wander by, which is most of what a small count shows.
    var se = 2 * Math.sqrt((m.exact * (1 - m.exact)) / n);
    return (
      n.toLocaleString() + " chords · " + hit.toLocaleString() + " longer · " +
      (hit / n).toFixed(4) + " sampled · " +
      m.exactLabel + " = " + m.exact.toFixed(4) + " exact · ±" + se.toFixed(4) + " (2σ)"
    );
  }

  function legend() {
    if (!els.legend) return;
    els.legend.innerHTML = "";
    var keys = [
      { text: "longer than the side (p < ½)", color: colors.long },
      { text: "shorter", color: colors.short },
    ];
    for (var i = 0; i < keys.length; i++) {
      var item = document.createElement("span");
      item.className = "bertrand-key";
      var swatch = document.createElement("i");
      swatch.style.background = keys[i].color;
      item.appendChild(swatch);
      item.appendChild(document.createTextNode(keys[i].text));
      els.legend.appendChild(item);
    }
  }

  function report() {
    var n = Math.max(1, Math.round(state.shown));
    if (els.readout) els.readout.textContent = summary(n);
    if (els.countValue) els.countValue.textContent = state.count.toLocaleString();
    var name = state.method === "all" ? "All four methods" : BY_KEY[state.method].label;
    canvas.setAttribute("aria-label", "Bertrand's paradox. " + name + ". " + summary(n));
  }

  function refresh() {
    report();
    schedule();
  }

  /* Streaming the sample in, which is the only way to see an estimate settle. */
  var run = { on: false, raf: 0, t0: 0 };
  var RUN_MS = 6000;

  function stopRun() {
    run.on = false;
    cancelAnimationFrame(run.raf);
    state.shown = state.count;
    if (els.run) {
      els.run.textContent = "Run";
      els.run.setAttribute("aria-pressed", "false");
    }
    refresh();
  }

  function startRun() {
    run.on = true;
    run.t0 = (window.performance || Date).now();
    if (els.run) {
      els.run.textContent = "Stop";
      els.run.setAttribute("aria-pressed", "true");
    }
    var step = function () {
      var f = ((window.performance || Date).now() - run.t0) / RUN_MS;
      if (f >= 1) { stopRun(); return; }
      state.shown = Math.max(1, Math.round(f * state.count));
      report();
      draw();
      run.raf = requestAnimationFrame(step);
    };
    run.raf = requestAnimationFrame(step);
  }

  if (els.method) {
    els.method.addEventListener("change", function () {
      state.method = els.method.value;
      // #midpoint and friends make one method linkable, without adding a history
      // entry per nudge of the slider.
      if (window.history && history.replaceState) history.replaceState(null, "", "#" + state.method);
      refresh();
    });
  }
  if (els.view) {
    els.view.addEventListener("change", function () {
      state.view = els.view.value;
      refresh();
    });
  }
  if (els.count) {
    var onCount = function () {
      state.count = Number(els.count.value);
      if (!run.on) state.shown = state.count;
      else state.shown = Math.min(state.shown, state.count);
      refresh();
    };
    els.count.addEventListener("input", onCount);
    els.count.addEventListener("change", onCount);
  }
  if (els.resample) {
    els.resample.addEventListener("click", function () {
      reseed();
      refresh();
    });
  }
  if (els.run) {
    els.run.addEventListener("click", function () { run.on ? stopRun() : startRun(); });
  }
  if (els.expand) {
    els.expand.addEventListener("click", function () {
      // A CSS overlay rather than the Fullscreen API, which iOS Safari does not
      // offer for elements.
      var on = wrap.classList.toggle("is-expanded");
      document.body.classList.toggle("bertrand-locked", on);
      els.expand.setAttribute("aria-pressed", on ? "true" : "false");
      els.expand.textContent = on ? "Close" : "Expand";
      requestAnimationFrame(resize);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && wrap && wrap.classList.contains("is-expanded")) els.expand.click();
  });

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onScheme = function () { readColors(); legend(); schedule(); };
  if (mq.addEventListener) mq.addEventListener("change", onScheme);
  else if (mq.addListener) mq.addListener(onScheme);

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  var start = (location.hash || "").replace("#", "");
  if (!BY_KEY[start] && start !== "all") start = "endpoints";
  state.method = start;
  if (els.method) els.method.value = start;
  if (els.view) state.view = els.view.value;
  if (els.count) {
    state.count = Number(els.count.value);
    state.shown = state.count;
  }

  readColors();
  legend();
  report();
  resize();
})();
