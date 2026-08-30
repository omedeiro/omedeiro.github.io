/*
 * Mandelbrot set — interactive viewer for owenmedeiros.com/maths/mandelbrot
 *
 * Two pictures of one iteration, z -> z^2 + c:
 *
 *   mandelbrot  The parameter plane. Every pixel is a c, and its colour says
 *               what the orbit of the critical point 0 does under that c.
 *   julia       The dynamical plane for a single fixed c. Every pixel is a
 *               starting z. The inset carries the Mandelbrot set with a marker
 *               on c, and dragging that marker redraws the Julia set live —
 *               which turns the Fatou-Julia dichotomy into a gesture: c inside
 *               the black gives a connected set, c outside gives dust.
 *
 * Escape time is smoothed to a fractional count, so the bands are level sets
 * of the escape potential rather than integer steps; see nu() below.
 *
 * The image is built by progressive refinement — a grid of 16x16 blocks first,
 * then 8, 4, 2, 1, each pass computing only the pixels the previous one
 * skipped. Those passes cost 1/256 + 3/256 + 12/256 + 48/256 + 192/256 of a
 * full image, which is exactly one image: the coarse preview is free. Slicing
 * the work across frames on a time budget keeps a drag responsive whatever the
 * iteration count, and while a gesture is live the last finished image is
 * blitted under the new transform instead of being recomputed.
 *
 * No dependencies.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("mandel-app");
  if (!canvas || !canvas.getContext) return;
  var wrap = canvas.closest(".mandel");
  var ctx = canvas.getContext("2d");
  var now = function () { return (window.performance || Date).now(); };

  /* ------------------------------------------------------------------ *
   * The iteration.
   * ------------------------------------------------------------------ */

  // An escape radius well past 2 costs one or two extra iterations and buys a
  // much better fractional count: the smoothing below assumes |z| doubles its
  // logarithm each step, which is only true once |z| is comfortably large.
  var R = 256;
  var R2 = R * R;
  var LOG_LOG_R = Math.log(Math.log(R));
  var LN2 = Math.LN2;

  /**
   * The fractional iteration count. n is the first step with |z_n| > R, and
   *
   *     nu = n - log2( ln|z_n| / ln R ),
   *
   * which is n exactly when the orbit lands on the circle of radius R and n-1
   * when it overshoots to R^2 — so it runs continuously across the bands.
   */
  function nu(n, x2, y2) {
    var v = n - (Math.log(0.5 * Math.log(x2 + y2)) - LOG_LOG_R) / LN2;
    return v > 0 ? v : 0;
  }

  /**
   * Mandelbrot: z0 = 0, c = the pixel. Returns the fractional escape count, or
   * -1 for a point that never escaped.
   */
  function escapeM(cx, cy, maxIter) {
    // Two closed-form interior tests. Interior points cost the whole iteration
    // budget, and the main cardioid and the period-2 disc together are most of
    // the black in any view of the whole set.
    var xq = cx - 0.25;
    var yy = cy * cy;
    var q = xq * xq + yy;
    if (q * (q + xq) <= 0.25 * yy) return -1;
    var xp = cx + 1;
    if (xp * xp + yy <= 0.0625) return -1;

    var x = 0, y = 0, x2 = 0, y2 = 0, i = 0;
    // Period checking, Brent style: hold a reference point, refresh it at
    // powers of two, and call the point interior as soon as the orbit returns
    // to it. Without this every filament of the interior — everything the two
    // algebraic tests miss — costs maxIter.
    var rx = 1e30, ry = 1e30, check = 4;
    while (x2 + y2 <= R2 && i < maxIter) {
      y = 2 * x * y + cy;
      x = x2 - y2 + cx;
      x2 = x * x;
      y2 = y * y;
      i++;
      if (x > rx - 1e-13 && x < rx + 1e-13 && y > ry - 1e-13 && y < ry + 1e-13) return -1;
      if (i === check) { rx = x; ry = y; check += check; }
    }
    if (x2 + y2 <= R2) return -1;
    return nu(i, x2, y2);
  }

  /** Julia: c fixed, z0 = the pixel. */
  function escapeJ(zx, zy, cx, cy, maxIter) {
    var x = zx, y = zy, x2 = x * x, y2 = y * y, i = 0;
    while (x2 + y2 <= R2 && i < maxIter) {
      y = 2 * x * y + cy;
      x = x2 - y2 + cx;
      x2 = x * x;
      y2 = y * y;
      i++;
    }
    if (x2 + y2 <= R2) return -1;
    return nu(i, x2, y2);
  }

  /* ------------------------------------------------------------------ *
   * Orbits.
   * ------------------------------------------------------------------ */

  /** The first few z_n, for drawing. Stops once the orbit is clearly gone. */
  function orbitPath(cx, cy, zx, zy, count) {
    var pts = [zx, zy];
    var x = zx, y = zy;
    for (var i = 0; i < count; i++) {
      var nx = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = nx;
      pts.push(x, y);
      if (x * x + y * y > 64) break;
    }
    return pts;
  }

  /**
   * What the orbit settles on. Returns the period of the attracting cycle, 0
   * if the orbit escapes, or -1 if it stays bounded without falling into a
   * cycle short enough to find — which is what happens on the boundary, and on
   * the parabolic parameters where the convergence is too slow to see.
   */
  function orbitPeriod(cx, cy, zx, zy) {
    // |z| > max(2, |c|) is enough to guarantee escape, so use it rather than
    // the rendering radius: settling has to run a long way and huge numbers
    // are wasted work.
    var out = 4;
    var cm = cx * cx + cy * cy;
    if (cm > out) out = cm;
    var x = zx, y = zy, i, nx;
    for (i = 0; i < 3000; i++) {
      nx = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = nx;
      if (x * x + y * y > out) return 0;
    }
    var ax = x, ay = y;
    for (var p = 1; p <= 64; p++) {
      nx = x * x - y * y + cx;
      y = 2 * x * y + cy;
      x = nx;
      if (Math.abs(x - ax) < 1e-7 && Math.abs(y - ay) < 1e-7) return p;
    }
    return -1;
  }

  /* ------------------------------------------------------------------ *
   * Palette. The stops live in Base.astro as custom properties and are read
   * back out here, so the drawing follows the light and dark palettes without
   * repeating them in JS.
   * ------------------------------------------------------------------ */

  var LUT_N = 2048;
  var lut = new Uint32Array(LUT_N);
  var stops = [[253, 246, 236], [217, 168, 106], [168, 83, 42], [91, 45, 28], [143, 127, 106]];
  var ink = [20, 16, 12];
  var inkPixel = 0;
  var colors = { mark: "#1c1c1a", accent: "#8a4b2d", line: "#6b6b66", bg: "#fbfaf8" };

  function hex(s, fallback) {
    var m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((s || "").trim());
    if (!m) return fallback;
    var h = m[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function pack(r, g, b) {
    // Little-endian RGBA, which is every platform this runs on.
    return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  function readColors() {
    var cs = getComputedStyle(wrap || document.documentElement);
    var pick = function (name, fallback) {
      var v = cs.getPropertyValue(name);
      return v && v.trim() ? v.trim() : fallback;
    };
    for (var i = 0; i < stops.length; i++) stops[i] = hex(pick("--mandel-s" + i, ""), stops[i]);
    ink = hex(pick("--mandel-ink", ""), ink);
    colors.mark = pick("--mandel-mark", colors.mark);
    colors.accent = pick("--mandel-accent", colors.accent);
    colors.line = pick("--mandel-line", colors.line);
    colors.bg = pick("--mandel-bg", colors.bg);
    buildLut();
  }

  function buildLut() {
    inkPixel = pack(ink[0], ink[1], ink[2]);
    var n = stops.length;
    for (var i = 0; i < LUT_N; i++) {
      var f = (i / LUT_N) * n;
      var k = Math.floor(f);
      var t = f - k;
      // Smoothstep between stops, so each stop is not a visible crease across
      // the band.
      var e = t * t * (3 - 2 * t);
      var a = stops[k % n], b = stops[(k + 1) % n];
      lut[i] = pack(
        Math.round(a[0] + (b[0] - a[0]) * e),
        Math.round(a[1] + (b[1] - a[1]) * e),
        Math.round(a[2] + (b[2] - a[2]) * e)
      );
    }
    insetReady = false;
  }

  /* ------------------------------------------------------------------ *
   * View.
   * ------------------------------------------------------------------ */

  var MODES = {
    mandelbrot: { label: "Mandelbrot set", cx: -0.6, cy: 0, spanX: 3.1, spanY: 2.5 },
    julia: { label: "Julia set", cx: 0, cy: 0, spanX: 3.4, spanY: 3.0 },
  };

  // Douady's rabbit: the centre of the period-3 bulb, and the nicest thing to
  // find on the page before touching anything.
  var jc = { x: -0.122561, y: 0.744862 };
  var kind = "mandelbrot";
  var view = { cx: -0.6, cy: 0, scale: 1, w: 1, h: 1 };
  var saved = {};

  // Where doubles run out. At x1e13 a pixel near c = -0.74 is about 5e-16
  // across against a gap of 1.6e-16 between representable numbers, so four
  // values span it and the picture is still clean; by x1e14 neighbouring
  // pixels start landing on the same number and the fine structure goes
  // grainy; by x1e15 whole rows collapse onto one value and it is stripes.
  // Stopping at 1e14 leaves the floor visible without letting the view go to
  // noise.
  var MAX_MAG = 1e14;

  function fitScale() {
    var m = MODES[kind];
    return Math.min(cssW / m.spanX, plotH / m.spanY);
  }

  function fit() {
    var m = MODES[kind];
    view.cx = m.cx;
    view.cy = m.cy;
    view.scale = fitScale();
    viewChanged(false);
  }

  /** Keep the set findable: the centre may not leave the region it lives in. */
  function clampView() {
    var base = fitScale();
    if (view.scale > base * MAX_MAG) view.scale = base * MAX_MAG;
    if (view.scale < base * 0.35) view.scale = base * 0.35;
    var lim = kind === "julia" ? 2.2 : 2.6;
    if (view.cx < -lim) view.cx = -lim;
    if (view.cx > lim) view.cx = lim;
    if (view.cy < -lim) view.cy = -lim;
    if (view.cy > lim) view.cy = lim;
  }

  var toX = function (a) { return cssW / 2 + (a - view.cx) * view.scale; };
  var toY = function (b) { return plotH / 2 - (b - view.cy) * view.scale; };
  var toA = function (px) { return view.cx + (px - cssW / 2) / view.scale; };
  var toB = function (py) { return view.cy - (py - plotH / 2) / view.scale; };

  /* ------------------------------------------------------------------ *
   * Render buffer and the progressive passes.
   * ------------------------------------------------------------------ */

  var dpr = 1, cssW = 0, cssH = 0, plotH = 0, rw = 0, rh = 0, rscale = 1;
  var buf = document.createElement("canvas");
  var bufCtx = buf.getContext("2d");
  var img = null, data32 = null;
  var shownView = null;   // the view buf's pixels currently correspond to
  var raf = 0, needsDraw = false, settle = 0;

  var render = {
    view: null, kind: "mandelbrot", jx: 0, jy: 0, iters: 500, period: 16,
    step: 16, px: 0, py: 0, done: true, t0: 0, ms: 0, a0: 0, b0: 0, d: 0,
  };

  // A full-resolution buffer on a 4K screen is 8 megapixels of iteration for
  // every frame of a drag; cap it and let the canvas scale the result up.
  var MAX_PIXELS = 1.6e6;

  function allocate() {
    var want = Math.min(dpr, Math.sqrt(MAX_PIXELS / Math.max(1, cssW * plotH)));
    rscale = Math.max(0.5, want);
    rw = Math.max(1, Math.round(cssW * rscale));
    rh = Math.max(1, Math.round(plotH * rscale));
    buf.width = rw;
    buf.height = rh;
    img = bufCtx.createImageData(rw, rh);
    data32 = new Uint32Array(img.data.buffer);
    shownView = null;
  }

  function startRender() {
    render.view = { cx: view.cx, cy: view.cy, scale: view.scale, w: cssW, h: plotH };
    render.kind = kind;
    render.jx = jc.x;
    render.jy = jc.y;
    render.iters = els.a ? Number(els.a.value) : 500;
    render.period = els.b ? Number(els.b.value) : 16;
    render.a0 = view.cx - (cssW / 2) / view.scale;
    render.b0 = view.cy + (plotH / 2) / view.scale;
    render.d = 1 / (view.scale * rscale);
    render.step = 16;
    render.px = 0;
    render.py = 0;
    render.done = false;
    render.t0 = now();
    render.ms = 0;
    if (!raf) raf = requestAnimationFrame(pump);
  }

  function fill(px, py, s, v, period) {
    var col;
    if (v < 0) col = inkPixel;
    else {
      var q = v / period;
      var f = q - Math.floor(q);
      var idx = (f * LUT_N) | 0;
      col = lut[idx < LUT_N ? idx : LUT_N - 1];
    }
    var x1 = px + s; if (x1 > rw) x1 = rw;
    var y1 = py + s; if (y1 > rh) y1 = rh;
    for (var yy = py; yy < y1; yy++) {
      var row = yy * rw;
      for (var xx = px; xx < x1; xx++) data32[row + xx] = col;
    }
  }

  function stepRender(budget) {
    var t0 = now();
    var s = render.step;
    var maxIter = render.iters;
    var julia = render.kind === "julia";
    var jx = render.jx, jy = render.jy;
    var a0 = render.a0, b0 = render.b0, d = render.d, period = render.period;
    var tick = 0;

    while (s >= 1) {
      var mask = s * 2 - 1;
      while (render.py < rh) {
        while (render.px < rw) {
          var px = render.px, py = render.py;
          render.px = px + s;
          // Everything on the coarser grid already carries the value this pass
          // would compute for it, from the same sample point.
          if (s < 16 && (px & mask) === 0 && (py & mask) === 0) continue;
          var a = a0 + px * d;
          var b = b0 - py * d;
          fill(px, py, s, julia ? escapeJ(a, b, jx, jy, maxIter) : escapeM(a, b, maxIter), period);
          if ((++tick & 31) === 0 && now() - t0 > budget) { render.step = s; return false; }
        }
        render.px = 0;
        render.py += s;
      }
      bufCtx.putImageData(img, 0, 0);
      shownView = render.view;
      render.px = 0;
      render.py = 0;
      if (s === 1) {
        render.step = 1;
        render.done = true;
        render.ms = Math.round(now() - render.t0);
        return true;
      }
      s = s >> 1;
      render.step = s;
      if (now() - t0 > budget) return false;
    }
    return true;
  }

  function pump() {
    raf = 0;
    needsDraw = false;
    if (!render.done) {
      var finished = stepRender(14);
      draw();
      report();
      if (!finished) { raf = requestAnimationFrame(pump); return; }
      return;
    }
    draw();
  }

  function schedule() {
    if (raf || needsDraw) return;
    needsDraw = true;
    requestAnimationFrame(function () { needsDraw = false; if (!raf) { draw(); report(); } });
  }

  /**
   * The view moved. Repaint from the buffer under the new transform straight
   * away, and only start iterating once the gesture stops — a drag should
   * never wait on the arithmetic.
   */
  function viewChanged(defer) {
    clampView();
    schedule();
    clearTimeout(settle);
    if (defer === false) { startRender(); return; }
    settle = setTimeout(startRender, 90);
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    plotH = cssH;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    allocate();
    insetReady = false;
    clampView();
    startRender();
  }

  /* ------------------------------------------------------------------ *
   * The inset: a thumbnail of the parameter plane, with c marked. Shown in
   * Julia mode, where it is both the legend and the control.
   * ------------------------------------------------------------------ */

  var inset = document.createElement("canvas");
  var insetCtx = inset.getContext("2d");
  var insetReady = false;
  var INSET_X0 = -2.3, INSET_Y1 = 1.55, INSET_SPAN = 3.1;

  function insetRect() {
    var size = Math.round(Math.min(124, cssW * 0.34, plotH * 0.36));
    return { x: 12, y: plotH - size - 12, s: size };
  }

  function buildInset() {
    var r = insetRect();
    var n = Math.max(24, Math.round(r.s * dpr));
    inset.width = n;
    inset.height = n;
    var im = insetCtx.createImageData(n, n);
    var d32 = new Uint32Array(im.data.buffer);
    var d = INSET_SPAN / n;
    var bg = hex(colors.bg, [251, 250, 248]);
    // Not the cyclic palette: at thumbnail size the bands are noise. A single
    // ramp from the panel background towards the marker colour reads as a map,
    // and going to the marker rather than to the ink is what keeps the
    // thumbnail legible in dark mode, where the ink and the background are both
    // nearly black.
    var to = hex(colors.mark, [28, 28, 26]);
    for (var py = 0; py < n; py++) {
      var b = INSET_Y1 - py * d;
      for (var px = 0; px < n; px++) {
        var v = escapeM(INSET_X0 + px * d, b, 160);
        var t = v < 0 ? 1 : Math.min(1, v / 26) * 0.5;
        d32[py * n + px] = pack(
          Math.round(bg[0] + (to[0] - bg[0]) * t),
          Math.round(bg[1] + (to[1] - bg[1]) * t),
          Math.round(bg[2] + (to[2] - bg[2]) * t)
        );
      }
    }
    insetCtx.putImageData(im, 0, 0);
    insetReady = true;
  }

  function drawInset() {
    var r = insetRect();
    if (r.s < 40) return;
    if (!insetReady) buildInset();
    ctx.drawImage(inset, r.x, r.y, r.s, r.s);
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.s - 1, r.s - 1);

    var mx = r.x + ((jc.x - INSET_X0) / INSET_SPAN) * r.s;
    var my = r.y + ((INSET_Y1 - jc.y) / INSET_SPAN) * r.s;
    mx = Math.max(r.x, Math.min(r.x + r.s, mx));
    my = Math.max(r.y, Math.min(r.y + r.s, my));
    // The crosshair sits on top of a thumbnail drawn in the marker colour, so
    // it takes the accent, over a halo of the background.
    ctx.beginPath();
    ctx.arc(mx, my, 4, 0, Math.PI * 2);
    ctx.moveTo(mx - 8, my);
    ctx.lineTo(mx - 5, my);
    ctx.moveTo(mx + 5, my);
    ctx.lineTo(mx + 8, my);
    ctx.moveTo(mx, my - 8);
    ctx.lineTo(mx, my - 5);
    ctx.moveTo(mx, my + 5);
    ctx.lineTo(mx, my + 8);
    ctx.strokeStyle = colors.bg;
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    text("drag for c", r.x, r.y - 5, colors.accent);
  }

  /* ------------------------------------------------------------------ *
   * Drawing.
   * ------------------------------------------------------------------ */

  function text(s, x, y, color) {
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = colors.bg;
    ctx.strokeText(s, x, y);
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }

  /** Blit the buffer, mapped from the view it was computed for to this one. */
  function blit() {
    if (!shownView) return;
    var bv = shownView;
    var k = view.scale / bv.scale;
    if (!(k > 1 / 512 && k < 512)) return;
    var a0 = bv.cx - (bv.w / 2) / bv.scale;
    var b0 = bv.cy + (bv.h / 2) / bv.scale;
    ctx.drawImage(buf, toX(a0), toY(b0), bv.w * k, bv.h * k);
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cssW, plotH);
    ctx.clip();
    blit();
    if (orbit.on && orbit.pts) drawOrbit();
    if (kind === "julia") drawInset();
    ctx.restore();
  }

  /**
   * The orbit z0, z1, z2, ... as a polyline. In Julia mode this is the plane
   * the picture is already drawn in. In Mandelbrot mode it is not — the orbit
   * lives in the dynamical plane and is laid over the parameter plane, which
   * is a liberty worth taking because the two share an origin and a scale, and
   * because watching the cycle appear over the bulb that produces it is the
   * whole point.
   */
  function drawOrbit() {
    var p = orbit.pts;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    for (var pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? colors.bg : colors.mark;
      ctx.lineWidth = pass === 0 ? 3.2 : 1.2;
      ctx.globalAlpha = pass === 0 ? 0.65 : 1;
      ctx.beginPath();
      ctx.moveTo(toX(p[0]), toY(p[1]));
      for (var i = 2; i < p.length; i += 2) ctx.lineTo(toX(p[i]), toY(p[i + 1]));
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (var j = 0; j < p.length; j += 2) {
      ctx.fillStyle = colors.mark;
      ctx.beginPath();
      ctx.arc(toX(p[j]), toY(p[j + 1]), j === 0 ? 3.4 : 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = colors.bg;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(toX(p[0]), toY(p[1]), 5.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ *
   * Orbit state.
   * ------------------------------------------------------------------ */

  var orbit = { on: false, pts: null, note: "" };

  function setOrbit(px, py) {
    var a = toA(px), b = toB(py);
    var cx, cy, zx, zy;
    if (kind === "julia") { cx = jc.x; cy = jc.y; zx = a; zy = b; }
    else { cx = a; cy = b; zx = 0; zy = 0; }
    orbit.pts = orbitPath(cx, cy, zx, zy, 120);
    var p = orbitPeriod(cx, cy, zx, zy);
    var where = kind === "julia" ? "z₀ = " + cnum(a, b) : "c = " + cnum(a, b);
    if (p === 0) {
      var esc = kind === "julia" ? escapeJ(a, b, cx, cy, 4000) : escapeM(a, b, 4000);
      orbit.note = where + " · escapes at n ≈ " + Math.round(esc);
    } else if (p > 0) {
      orbit.note = where + " · attracted to a cycle of period " + p;
    } else {
      orbit.note = where + " · bounded, no short cycle";
    }
  }

  /* ------------------------------------------------------------------ *
   * The readout.
   * ------------------------------------------------------------------ */

  function sig(v, digits) {
    var s = Math.abs(v).toFixed(digits);
    return (v < 0 ? "−" : "") + s;
  }

  function cnum(a, b) {
    var digits = Math.max(4, Math.min(17, 4 + Math.round(Math.log(mag()) / Math.LN10)));
    return sig(a, digits) + (b < 0 ? " − " : " + ") + Math.abs(b).toFixed(digits) + "i";
  }

  function mag() { return view.scale / fitScale(); }

  function expo(v) {
    if (v < 1000) return v.toFixed(v < 10 ? 1 : 0);
    return v.toExponential(1).replace("e+", "e");
  }

  function report() {
    var m = mag();
    var bits = [];
    if (kind === "julia") {
      bits.push("c = " + cnum(jc.x, jc.y));
      bits.push(escapeM(jc.x, jc.y, 5000) < 0 ? "c ∈ M, so K(c) is connected" : "c ∉ M, so K(c) is dust");
    } else {
      bits.push("centre " + cnum(view.cx, view.cy));
    }
    bits.push("×" + expo(m));
    bits.push(render.iters + " iterations");
    var span = 1 / (view.scale * rscale);
    var eps = Math.max(Math.abs(view.cx), Math.abs(view.cy), 1) * 2.220446049250313e-16;
    if (span < eps * 4) {
      bits.push("pixel " + span.toExponential(0) + " against " + eps.toExponential(0) +
                " between doubles — at the precision floor");
    }
    if (render.done && render.ms) bits.push(render.ms + " ms");
    else bits.push("drawing…");
    if (orbit.on && orbit.note) bits.push(orbit.note);

    var line = bits.join(" · ");
    if (els.readout) els.readout.textContent = line;
    if (els.aValue) els.aValue.textContent = String(render.iters);
    if (els.bValue) els.bValue.textContent = String(render.period);
    canvas.setAttribute("aria-label", MODES[kind].label + ". " + line + " Drag to pan, pinch or scroll to zoom.");
    writeHash();
  }

  /* ------------------------------------------------------------------ *
   * The URL fragment, so a view can be linked.
   * ------------------------------------------------------------------ */

  var hashAt = 0;

  function writeHash() {
    if (!window.history || !history.replaceState) return;
    var t = now();
    if (t - hashAt < 500) return;
    hashAt = t;
    var d = Math.max(4, Math.min(17, 4 + Math.round(Math.log(mag()) / Math.LN10)));
    var parts = [view.cx.toFixed(d), view.cy.toFixed(d), mag().toExponential(3)];
    if (kind === "julia") parts.push(jc.x.toFixed(8), jc.y.toFixed(8));
    history.replaceState(null, "", "#" + kind + "@" + parts.join(","));
  }

  function readHash() {
    var h = (location.hash || "").replace("#", "");
    var at = h.indexOf("@");
    var name = at < 0 ? h : h.slice(0, at);
    if (!MODES[name]) return null;
    var p = at < 0 ? [] : h.slice(at + 1).split(",").map(Number);
    return { kind: name, ok: p.length >= 3 && p.every(isFinite), p: p };
  }

  /* ------------------------------------------------------------------ *
   * Pan, zoom, pinch.
   * ------------------------------------------------------------------ */

  var pointers = Object.create(null);
  var pointerCount = 0;
  var lastCentroid = null;
  var picking = false;

  function localPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function zoomAt(factor, px, py) {
    var base = fitScale();
    var next = Math.min(base * MAX_MAG, Math.max(base * 0.35, view.scale * factor));
    if (next === view.scale) return;
    // Hold the point under the cursor still.
    var a = toA(px), b = toB(py);
    view.scale = next;
    view.cx = a - (px - cssW / 2) / view.scale;
    view.cy = b + (py - plotH / 2) / view.scale;
    viewChanged(true);
  }

  function centroidOfPointers() {
    var x = 0, y = 0, n = 0, spread = 0, pts = [];
    for (var id in pointers) { pts.push(pointers[id]); x += pointers[id][0]; y += pointers[id][1]; n++; }
    x /= n; y /= n;
    if (pts.length > 1) spread = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
    return { x: x, y: y, n: n, spread: spread };
  }

  function inInset(p) {
    if (kind !== "julia") return false;
    var r = insetRect();
    return r.s >= 40 && p[0] >= r.x && p[0] <= r.x + r.s && p[1] >= r.y && p[1] <= r.y + r.s;
  }

  function pickC(p) {
    var r = insetRect();
    jc.x = INSET_X0 + ((p[0] - r.x) / r.s) * INSET_SPAN;
    jc.y = INSET_Y1 - ((p[1] - r.y) / r.s) * INSET_SPAN;
    if (orbit.on && orbit.pts) orbit.pts = null;
    // No stale preview is worth showing here: the picture changes, not the
    // view, so restart straight away and let the coarse pass carry it.
    startRender();
  }

  canvas.addEventListener("pointerdown", function (e) {
    var p = localPoint(e);
    canvas.setPointerCapture(e.pointerId);
    if (inInset(p)) { picking = true; pickC(p); e.preventDefault(); return; }
    if (orbit.on && e.pointerType !== "mouse") { setOrbit(p[0], p[1]); schedule(); e.preventDefault(); return; }
    if (!pointers[e.pointerId]) pointerCount++;
    pointers[e.pointerId] = p;
    lastCentroid = centroidOfPointers();
    canvas.classList.add("is-dragging");
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", function (e) {
    var p = localPoint(e);
    if (picking) { pickC(p); e.preventDefault(); return; }
    // With orbit on, a mouse traces the orbit by hovering and still pans by
    // dragging; touch has no hover, so there a drag traces instead.
    if (orbit.on && (pointerCount === 0 || e.pointerType !== "mouse")) {
      if (p[0] >= 0 && p[0] <= cssW && p[1] >= 0 && p[1] <= plotH && !inInset(p)) {
        setOrbit(p[0], p[1]);
        schedule();
      }
      if (pointerCount) e.preventDefault();
      return;
    }
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = p;
    var next = centroidOfPointers();
    if (lastCentroid) {
      view.cx -= (next.x - lastCentroid.x) / view.scale;
      view.cy += (next.y - lastCentroid.y) / view.scale;
      if (next.n > 1 && lastCentroid.n === next.n && lastCentroid.spread > 0 && next.spread > 0) {
        zoomAt(next.spread / lastCentroid.spread, next.x, next.y);
      } else {
        viewChanged(true);
      }
    }
    lastCentroid = next;
    e.preventDefault();
  });

  function release(e) {
    if (picking) { picking = false; return; }
    if (pointers[e.pointerId]) { delete pointers[e.pointerId]; pointerCount--; }
    lastCentroid = pointerCount > 0 ? centroidOfPointers() : null;
    if (pointerCount === 0) canvas.classList.remove("is-dragging");
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", function () {
    if (orbit.on && pointerCount === 0) { orbit.pts = null; orbit.note = ""; schedule(); }
  });

  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    var p = localPoint(e);
    // A trackpad pinch arrives as ctrl+wheel; treat it as a finer zoom.
    var k = e.ctrlKey ? 0.012 : 0.0022;
    zoomAt(Math.exp(-e.deltaY * k), p[0], p[1]);
  }, { passive: false });

  canvas.addEventListener("dblclick", function (e) {
    var p = localPoint(e);
    if (inInset(p)) return;
    zoomAt(2.2, p[0], p[1]);
  });

  canvas.addEventListener("keydown", function (e) {
    var step = (e.shiftKey ? 120 : 40) / view.scale;
    if (e.key === "ArrowLeft") view.cx -= step;
    else if (e.key === "ArrowRight") view.cx += step;
    else if (e.key === "ArrowUp") view.cy += step;
    else if (e.key === "ArrowDown") view.cy -= step;
    else if (e.key === "+" || e.key === "=") { zoomAt(1.5, cssW / 2, plotH / 2); e.preventDefault(); return; }
    else if (e.key === "-" || e.key === "_") { zoomAt(1 / 1.5, cssW / 2, plotH / 2); e.preventDefault(); return; }
    else if (e.key === "0") { fit(); e.preventDefault(); return; }
    else return;
    e.preventDefault();
    viewChanged(true);
  });

  /* ------------------------------------------------------------------ *
   * Controls.
   * ------------------------------------------------------------------ */

  var pickEl = function (sel) { return wrap ? wrap.querySelector(sel) : null; };
  var els = {
    kind: pickEl("[data-role=kind]"),
    a: pickEl("[data-role=param-a]"),
    aValue: pickEl("[data-role=value-a]"),
    b: pickEl("[data-role=param-b]"),
    bValue: pickEl("[data-role=value-b]"),
    readout: pickEl("[data-role=readout]"),
    orbit: pickEl("[data-role=orbit]"),
    reset: pickEl("[data-role=reset]"),
    expand: pickEl("[data-role=expand]"),
    zoomIn: pickEl("[data-role=zoom-in]"),
    zoomOut: pickEl("[data-role=zoom-out]"),
  };

  function setKind(name, keep) {
    if (!MODES[name]) return;
    saved[kind] = { cx: view.cx, cy: view.cy, scale: view.scale };
    // Switching to Julia takes c from wherever the parameter plane is pointed,
    // which is the only link between the two planes worth wiring up: look at
    // something in the Mandelbrot set, then see the Julia set it indexes.
    if (name === "julia" && kind === "mandelbrot" && !keep) { jc.x = view.cx; jc.y = view.cy; }
    kind = name;
    if (els.kind) els.kind.value = name;
    orbit.pts = null;
    orbit.note = "";
    insetReady = false;
    var s = saved[name];
    if (s && keep) { view.cx = s.cx; view.cy = s.cy; view.scale = s.scale; clampView(); startRender(); }
    else fit();
  }

  if (els.kind) {
    els.kind.addEventListener("change", function () { setKind(els.kind.value, els.kind.value === "mandelbrot"); });
  }
  var onSlider = function () { startRender(); };
  if (els.a) { els.a.addEventListener("input", onSlider); els.a.addEventListener("change", onSlider); }
  if (els.b) { els.b.addEventListener("input", onSlider); els.b.addEventListener("change", onSlider); }
  if (els.reset) els.reset.addEventListener("click", fit);
  if (els.zoomIn) els.zoomIn.addEventListener("click", function () { zoomAt(1.6, cssW / 2, plotH / 2); });
  if (els.zoomOut) els.zoomOut.addEventListener("click", function () { zoomAt(1 / 1.6, cssW / 2, plotH / 2); });
  if (els.orbit) {
    els.orbit.addEventListener("click", function () {
      orbit.on = !orbit.on;
      if (!orbit.on) { orbit.pts = null; orbit.note = ""; }
      els.orbit.setAttribute("aria-pressed", orbit.on ? "true" : "false");
      els.orbit.textContent = orbit.on ? "Orbit ✓" : "Orbit";
      schedule();
    });
  }
  if (els.expand) {
    els.expand.addEventListener("click", function () {
      // A CSS overlay rather than the Fullscreen API, which iOS Safari does not
      // offer for elements.
      var on = wrap.classList.toggle("is-expanded");
      document.body.classList.toggle("mandel-locked", on);
      els.expand.setAttribute("aria-pressed", on ? "true" : "false");
      els.expand.textContent = on ? "Close" : "Expand";
      requestAnimationFrame(resize);
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && wrap && wrap.classList.contains("is-expanded")) els.expand.click();
  });

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onScheme = function () { readColors(); startRender(); };
  if (mq.addEventListener) mq.addEventListener("change", onScheme);
  else if (mq.addListener) mq.addListener(onScheme);

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  /* ------------------------------------------------------------------ *
   * Start.
   * ------------------------------------------------------------------ */

  /** Take the mode, centre and magnification a fragment carries. */
  function applyHash(h) {
    kind = h.kind;
    if (els.kind) els.kind.value = kind;
    orbit.pts = null;
    orbit.note = "";
    insetReady = false;
    if (!h.ok) { fit(); return; }
    view.cx = h.p[0];
    view.cy = h.p[1];
    view.scale = fitScale() * h.p[2];
    if (kind === "julia" && h.p.length >= 5) { jc.x = h.p[3]; jc.y = h.p[4]; }
    clampView();
    startRender();
  }

  readColors();
  var start = readHash();
  if (start) { kind = start.kind; if (els.kind) els.kind.value = kind; }
  resize();
  if (start) applyHash(start);
  else fit();

  // Pasting a link into a page that is already open changes the fragment
  // without reloading. writeHash uses replaceState, which does not fire this,
  // so there is no loop.
  window.addEventListener("hashchange", function () {
    var h = readHash();
    if (h) applyHash(h);
  });
})();
