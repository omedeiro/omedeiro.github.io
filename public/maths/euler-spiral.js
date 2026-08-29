/*
 * Euler spiral — builder and viewer for owenmedeiros.com/maths/euler-spiral
 *
 * One curve, reached three ways:
 *
 *   fresnel     The definition. Integrate a unit-speed path whose tangent
 *               angle is pi*s^2/2, so curvature is exactly pi*s. Both branches
 *               are drawn; they converge on (+-1/2, +-1/2).
 *   turtle      The construction the page used to show in MATLAB: walk unit
 *               steps, turning by i*theta on step i. Heading is quadratic in
 *               step count, which is the same thing as curvature linear in
 *               arc length — Euler's method on the definition above.
 *   transition  What the curve is for. A straight, a spiral ramping curvature
 *               from 0 to 1/R over length L, a circular arc, and back out;
 *               drawn against the tangent-arc alignment it replaces.
 *
 * Every builder returns samples carrying their own signed curvature, because
 * all three know it in closed form and finite differences over a polyline do
 * not. The strip under the plot draws exactly that array against arc length.
 *
 * No dependencies.
 */
(function () {
  "use strict";

  var canvas = document.getElementById("euler-app");
  if (!canvas || !canvas.getContext) return;
  var wrap = canvas.closest(".euler");
  var ctx = canvas.getContext("2d");

  var DEG = 180 / Math.PI;

  function mk() {
    return { x: [], y: [], k: [], s: [] };
  }

  function add(c, x, y, k, s) {
    c.x.push(x);
    c.y.push(y);
    c.k.push(k);
    c.s.push(s);
  }

  /* ------------------------------------------------------------------ *
   * The definition: Fresnel integrals.
   * ------------------------------------------------------------------ */

  /**
   * x(t) = int_0^t cos(pi u^2 / 2) du,  y(t) = int_0^t sin(pi u^2 / 2) du.
   *
   * The integrand has unit modulus, so t is arc length and the tangent angle
   * is pi t^2 / 2 — differentiate it and the curvature is pi t.
   */
  function buildFresnel(tmax) {
    var half = mk();
    var t = 0, x = 0, y = 0;
    add(half, 0, 0, 0, 0);
    // Step by tangent turn rather than by t. The phase grows quadratically, so
    // a dt fine enough for the coils at t = 8 costs 25x the samples per unit
    // length that the straight middle needs, and one coarse enough for the
    // middle cuts the coils into visible polygons.
    while (t < tmax) {
      var dt = Math.min(0.02, 0.02 / (Math.PI * t + 0.4));
      if (t + dt > tmax) dt = tmax - t;
      var phase = (Math.PI * (t + dt / 2) * (t + dt / 2)) / 2;
      x += Math.cos(phase) * dt;
      y += Math.sin(phase) * dt;
      t += dt;
      add(half, x, y, Math.PI * t, t);
    }

    // The curve is odd in t, so the second branch is the first one negated.
    var c = mk();
    var n = half.x.length;
    for (var i = n - 1; i >= 1; i--) {
      add(c, -half.x[i], -half.y[i], -half.k[i], tmax - half.s[i]);
    }
    for (var j = 0; j < n; j++) {
      add(c, half.x[j], half.y[j], half.k[j], tmax + half.s[j]);
    }

    var end = n - 1;
    return {
      curve: c,
      ghost: null,
      // The limit points are named in the legend rather than beside the dots:
      // at any sensible zoom the labels land in the middle of the coils.
      marks: [
        { x: 0.5, y: 0.5, label: "" },
        { x: -0.5, y: -0.5, label: "" },
      ],
      kinds: [
        { label: "Euler spiral", color: "curve" },
        { label: "limit points ±(½, ½)", color: "alt" },
      ],
      labelA: tmax.toFixed(1),
      readout:
        "s = ±" + tmax.toFixed(2) +
        " · κ = πs = " + (Math.PI * tmax).toFixed(2) +
        " · turned " + ((Math.PI * tmax * tmax) / 2 * DEG).toFixed(0) + "°" +
        " · ends at (" + half.x[end].toFixed(4) + ", " + half.y[end].toFixed(4) + ")",
    };
  }

  /* ------------------------------------------------------------------ *
   * The same curve by hand: turn a little more on every step.
   * ------------------------------------------------------------------ */

  /**
   * Unit steps, with the heading advanced by i*theta before step i. After i
   * steps the heading is theta*i(i+1)/2 and the distance covered is i, so the
   * turn per unit distance — the curvature — is theta*i. Linear in arc length,
   * which is the whole definition, arrived at without an integral.
   */
  function buildTurtle(thetaDeg, steps) {
    var k = thetaDeg / DEG;
    var c = mk();
    var head = 0, x = 0, y = 0;
    add(c, 0, 0, 0, 0);
    for (var i = 1; i <= steps; i++) {
      head += i * k;
      x += Math.cos(head);
      y += Math.sin(head);
      add(c, x, y, i * k, i);
    }
    return {
      curve: c,
      ghost: null,
      marks: [],
      kinds: [{ label: "walked path", color: "curve" }],
      labelA: thetaDeg.toFixed(2) + "°",
      labelB: String(steps),
      readout:
        steps + " steps of length 1 · θ = " + thetaDeg.toFixed(2) + "°" +
        " · turned " + (head * DEG).toFixed(0) + "°" +
        " · final curvature " + (steps * k).toFixed(2) + " per unit",
    };
  }

  /* ------------------------------------------------------------------ *
   * What it is for: the transition curve.
   * ------------------------------------------------------------------ */

  function segStraight(c, st, len) {
    add(c, st.x, st.y, 0, st.s);
    st.x += Math.cos(st.h) * len;
    st.y += Math.sin(st.h) * len;
    st.s += len;
    add(c, st.x, st.y, 0, st.s);
  }

  function segArc(c, st, R, sweep) {
    if (sweep <= 1e-9) return;
    // Centre lies a radius to the left of the heading, since every turn here
    // is a left turn.
    var cx = st.x - Math.sin(st.h) * R;
    var cy = st.y + Math.cos(st.h) * R;
    var a0 = Math.atan2(st.y - cy, st.x - cx);
    var n = Math.max(8, Math.ceil(sweep / 0.02));
    for (var i = 0; i <= n; i++) {
      var a = a0 + (sweep * i) / n;
      add(c, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1 / R, st.s + (sweep * R * i) / n);
    }
    st.x = cx + Math.cos(a0 + sweep) * R;
    st.y = cy + Math.sin(a0 + sweep) * R;
    st.h += sweep;
    st.s += sweep * R;
  }

  /**
   * The Euler spiral itself, in the form a surveyor uses it: curvature ramps
   * from 0 to 1/R (dir = 1) or back down to 0 (dir = -1) over length L. Both
   * halves turn through the same spiral angle L/2R.
   */
  function segSpiral(c, st, R, L, dir) {
    if (L <= 1e-9) return;
    var n = 240;
    var ds = L / n;
    var h0 = st.h, s0 = st.s, x = st.x, y = st.y;
    add(c, x, y, dir > 0 ? 0 : 1 / R, s0);
    for (var i = 0; i < n; i++) {
      var u = (i + 0.5) * ds;
      var turn = dir > 0 ? (u * u) / (2 * R * L) : (u * (2 * L - u)) / (2 * R * L);
      x += Math.cos(h0 + turn) * ds;
      y += Math.sin(h0 + turn) * ds;
      var ue = (i + 1) * ds;
      add(c, x, y, (dir > 0 ? ue : L - ue) / (R * L), s0 + ue);
    }
    st.x = x;
    st.y = y;
    st.h = h0 + L / (2 * R);
    st.s = s0 + L;
  }

  /**
   * Both alignments run between the same two straights, meeting at a deflection
   * of `defl` — which is how the choice is actually put: the straights are
   * fixed by the terrain, and what varies is what happens at the corner. The
   * comparison is then honest, and the shift shows up as the gap between the
   * two curves at the apex.
   *
   * `frac` is the transition length as a share of its maximum. The two spirals
   * eat L/2R of the deflection each, so L can grow until the circular arc has
   * nothing left — at frac = 1 the corner is two spirals meeting nose to nose,
   * and at frac = 0 it is the bare tangent-arc alignment the ghost draws.
   */
  function buildTransition(deflDeg, fracPct) {
    var R = 1;
    var D = deflDeg / DEG;
    var L = (fracPct / 100) * D * R;
    var thetaS = L / (2 * R);

    // Run the entry spiral on its own first, to read off what it costs: the
    // arc has to sit `shift` further from the tangent to leave room for it,
    // and the curve has to start `back` earlier along the tangent. Both come
    // from the spiral's own endpoint rather than from the usual series.
    var probe = { x: 0, y: 0, h: 0, s: 0 };
    segSpiral(mk(), probe, R, L, 1);
    var shift = probe.y - R * (1 - Math.cos(thetaS));
    var back = probe.x - R * Math.sin(thetaS);

    var halfTan = Math.tan(D / 2);
    var tangent = R * halfTan;                    // corner to tangent point, no transition
    var tangentS = (R + shift) * halfTan + back;  // and with one
    var run = Math.max(tangent, tangentS) + 1.25; // how far each straight runs from the corner

    var c = mk();
    var st = { x: -run, y: 0, h: 0, s: 0 };
    segStraight(c, st, run - tangentS);
    segSpiral(c, st, R, L, 1);
    segArc(c, st, R, D - 2 * thetaS);
    segSpiral(c, st, R, L, -1);
    segStraight(c, st, run - tangentS);

    var g = mk();
    var gs = { x: -run, y: 0, h: 0, s: 0 };
    segStraight(g, gs, run - tangent);
    segArc(g, gs, R, D);
    segStraight(g, gs, run - tangent);

    return {
      curve: c,
      ghost: g,
      marks: [],
      kinds: [
        { label: "with transition", color: "curve" },
        { label: "tangent arc only", color: "alt" },
      ],
      labelA: deflDeg.toFixed(0) + "°",
      labelB: L.toFixed(2) + " R",
      readout:
        "R = 1 · Δ = " + deflDeg.toFixed(0) + "° · L = " + L.toFixed(2) + " R" +
        " · A = √(RL) = " + Math.sqrt(R * L).toFixed(3) +
        " · spiral angle " + (thetaS * DEG).toFixed(1) + "°" +
        " · shift " + shift.toFixed(4) + " (L²/24R = " + ((L * L) / 24).toFixed(4) + ")" +
        " · starts " + back.toFixed(3) + " earlier",
    };
  }

  /* ------------------------------------------------------------------ *
   * Modes, and the controls that build them.
   * ------------------------------------------------------------------ */

  var MODES = {
    fresnel: {
      label: "Fresnel integrals",
      a: { min: 0.5, max: 8, value: 4, step: 0.1, label: "Arc length ±s" },
      b: null,
      build: function (a) { return buildFresnel(a); },
    },
    turtle: {
      label: "Turning by hand",
      a: { min: 0.05, max: 6, value: 1.01, step: 0.01, label: "Turn per step θ" },
      b: { min: 60, max: 2400, value: 720, step: 20, label: "Steps" },
      build: buildTurtle,
    },
    transition: {
      label: "Road transition",
      a: { min: 20, max: 170, value: 90, step: 5, label: "Deflection Δ" },
      b: { min: 0, max: 100, value: 55, step: 1, label: "Transition length" },
      build: buildTransition,
    },
  };

  var current = { name: "fresnel", curve: null, ghost: null, marks: [], kinds: [], bounds: null };
  var view = { x: 0, y: 0, scale: 1 };
  var colors = { curve: "#8a4b2d", alt: "#6b6b66", grid: "rgba(0,0,0,.08)", axis: "rgba(0,0,0,.25)", bg: "#fbfaf8" };

  function readColors() {
    var cs = getComputedStyle(wrap || document.documentElement);
    var pick = function (name, fallback) {
      var v = cs.getPropertyValue(name);
      return v && v.trim() ? v.trim() : fallback;
    };
    colors.curve = pick("--euler-curve", colors.curve);
    colors.alt = pick("--euler-alt", colors.alt);
    colors.grid = pick("--euler-grid", colors.grid);
    colors.axis = pick("--euler-axis", colors.axis);
    colors.bg = pick("--euler-bg", colors.bg);
  }

  function measure(curves) {
    var b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (var n = 0; n < curves.length; n++) {
      var c = curves[n];
      if (!c) continue;
      for (var i = 0; i < c.x.length; i++) {
        if (c.x[i] < b.minX) b.minX = c.x[i];
        if (c.x[i] > b.maxX) b.maxX = c.x[i];
        if (c.y[i] < b.minY) b.minY = c.y[i];
        if (c.y[i] > b.maxY) b.maxY = c.y[i];
      }
    }
    return b;
  }

  function build(name, a, b) {
    var t0 = (window.performance || Date).now();
    var out = MODES[name].build(a, b);
    current.name = name;
    current.curve = out.curve;
    current.ghost = out.ghost;
    current.marks = out.marks;
    current.kinds = out.kinds;
    current.readout = out.readout;
    current.labelA = out.labelA;
    current.labelB = out.labelB;
    current.bounds = measure([out.curve, out.ghost]);
    current.ms = Math.round((window.performance || Date).now() - t0);
    return current;
  }

  /* ------------------------------------------------------------------ *
   * Rendering.
   * ------------------------------------------------------------------ */

  var dpr = 1, cssW = 0, cssH = 0, plotH = 0, needsDraw = false;
  var STRIP_H = 68;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    // The curvature strip owns a fixed band at the foot of the canvas; the
    // curve gets what is left, and is fitted and clamped against that.
    plotH = Math.max(80, cssH - STRIP_H);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    clampView();
    draw();
  }

  function fitScale() {
    var b = current.bounds;
    if (!b || !isFinite(b.minX)) return 1;
    var w = Math.max(b.maxX - b.minX, 1e-6);
    var h = Math.max(b.maxY - b.minY, 1e-6);
    return Math.min(cssW / (w * 1.1), plotH / (h * 1.1));
  }

  function fit() {
    var b = current.bounds;
    if (!b || !isFinite(b.minX)) return;
    var s = fitScale();
    view.scale = s;
    view.x = cssW / 2 - ((b.minX + b.maxX) / 2) * s;
    view.y = plotH / 2 + ((b.minY + b.maxY) / 2) * s;
    schedule();
  }

  /**
   * Keep the curve on screen: whatever sits under the middle of the plot has
   * to be inside its bounding box. Without it, one determined scroll leaves a
   * blank canvas with no clue which way to come back.
   */
  function clampView() {
    var b = current.bounds;
    if (!b || !isFinite(b.minX)) return;
    var s = view.scale;
    var wx = Math.min(b.maxX, Math.max(b.minX, (cssW / 2 - view.x) / s));
    var wy = Math.min(b.maxY, Math.max(b.minY, (view.y - plotH / 2) / s));
    view.x = cssW / 2 - wx * s;
    view.y = plotH / 2 + wy * s;
  }

  function schedule() {
    if (needsDraw) return;
    needsDraw = true;
    requestAnimationFrame(function () { needsDraw = false; draw(); });
  }

  var sx = function (x) { return x * view.scale + view.x; };
  var sy = function (y) { return -y * view.scale + view.y; };

  /** A 1-2-5 grid, kept between 40 and 200 pixels a square at any zoom. */
  function drawGrid() {
    var step = Math.pow(10, Math.floor(Math.log(90 / view.scale) / Math.LN10));
    var mult = [1, 2, 5, 10];
    for (var m = 0; m < mult.length; m++) {
      if (step * mult[m] * view.scale >= 40) { step *= mult[m]; break; }
    }
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    var x0 = Math.ceil((-view.x / view.scale) / step) * step;
    for (var x = x0; sx(x) <= cssW; x += step) {
      ctx.moveTo(Math.round(sx(x)) + 0.5, 0);
      ctx.lineTo(Math.round(sx(x)) + 0.5, plotH);
    }
    var yTop = (view.y - 0) / view.scale;
    var y0 = Math.floor(yTop / step) * step;
    for (var y = y0; sy(y) <= plotH; y -= step) {
      ctx.moveTo(0, Math.round(sy(y)) + 0.5);
      ctx.lineTo(cssW, Math.round(sy(y)) + 0.5);
    }
    ctx.stroke();
  }

  function strokeRange(c, from, to, color, width, alpha) {
    if (to <= from) return;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(sx(c.x[from]), sy(c.y[from]));
    for (var i = from + 1; i <= to; i++) ctx.lineTo(sx(c.x[i]), sy(c.y[i]));
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Text with a halo of the background behind it, so labels stay readable
      where they land on top of the curve. */
  function label(text, x, y, color) {
    ctx.font = "11px -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.strokeStyle = colors.bg;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function draw() {
    if (!ctx || !current.curve) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cssW, plotH);
    ctx.clip();

    drawGrid();

    var c = current.curve;
    var last = c.x.length - 1;
    var head = trace.on ? trace.head : last;

    if (current.ghost) strokeRange(current.ghost, 0, current.ghost.x.length - 1, colors.alt, 1.4, 0.9);

    // While tracing, the rest of the curve stays visible but recedes, so the
    // head reads as a position on a known path rather than a growing scribble.
    if (head < last) {
      strokeRange(c, 0, last, colors.curve, 1.7, 0.22);
      strokeRange(c, 0, head, colors.curve, 1.7, 1);
    } else {
      strokeRange(c, 0, last, colors.curve, 1.7, 1);
    }

    for (var m = 0; m < current.marks.length; m++) {
      var mk2 = current.marks[m];
      ctx.fillStyle = colors.alt;
      ctx.beginPath();
      ctx.arc(sx(mk2.x), sy(mk2.y), 2.5, 0, Math.PI * 2);
      ctx.fill();
      if (mk2.label) label(mk2.label, sx(mk2.x) + 7, sy(mk2.y) + 4, colors.alt);
    }

    if (head < last) drawHead(c, head);
    ctx.restore();

    drawStrip(head);
  }

  /**
   * The point being traced, its tangent, and the circle that matches the
   * curve's curvature there. Watching that circle shrink at a steady rate is
   * the property the page is about, so it is worth the extra draw.
   */
  function drawHead(c, i) {
    var px = sx(c.x[i]), py = sy(c.y[i]);
    var k = c.k[i];
    var j = Math.max(0, i - 1);
    var tx = c.x[i] - c.x[j], ty = c.y[i] - c.y[j];
    var len = Math.hypot(tx, ty) || 1;
    tx /= len; ty /= len;

    if (Math.abs(k) > 1e-6) {
      var r = 1 / Math.abs(k);
      var sgn = k > 0 ? 1 : -1;
      var ox = c.x[i] - ty * r * sgn;
      var oy = c.y[i] + tx * r * sgn;
      // Skip the circle once it is bigger than the canvas: at low curvature it
      // is a straight line across the view and says nothing.
      if (r * view.scale < Math.max(cssW, plotH) * 1.5) {
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = colors.alt;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(sx(ox), sy(oy), r * view.scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    ctx.strokeStyle = colors.curve;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px - tx * 22, py + ty * 22);
    ctx.lineTo(px + tx * 22, py - ty * 22);
    ctx.stroke();

    ctx.fillStyle = colors.curve;
    ctx.beginPath();
    ctx.arc(px, py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Curvature against arc length, in a band of its own under the plot. */
  function drawStrip(head) {
    var c = current.curve;
    var top = plotH + 6;
    var bot = cssH - 14;
    var left = 8, right = cssW - 8;
    if (bot - top < 20) return;

    var kMin = 0, kMax = 1e-9;
    var series = current.ghost ? [c, current.ghost] : [c];
    var sMax = 1e-9;
    for (var n = 0; n < series.length; n++) {
      var q = series[n];
      for (var i = 0; i < q.k.length; i++) {
        if (q.k[i] < kMin) kMin = q.k[i];
        if (q.k[i] > kMax) kMax = q.k[i];
      }
      if (q.s[q.s.length - 1] > sMax) sMax = q.s[q.s.length - 1];
    }
    var pad = (kMax - kMin) * 0.12 || 1;
    var lo = kMin - pad, hi = kMax + pad;
    var px = function (s) { return left + ((right - left) * s) / sMax; };
    var py = function (k) { return bot - ((bot - top) * (k - lo)) / (hi - lo); };

    ctx.strokeStyle = colors.axis;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, Math.round(py(0)) + 0.5);
    ctx.lineTo(right, Math.round(py(0)) + 0.5);
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (var m = series.length - 1; m >= 0; m--) {
      var q2 = series[m];
      ctx.strokeStyle = m === 0 ? colors.curve : colors.alt;
      ctx.lineWidth = m === 0 ? 1.5 : 1.2;
      ctx.globalAlpha = m === 0 ? 1 : 0.9;
      ctx.beginPath();
      ctx.moveTo(px(q2.s[0]), py(q2.k[0]));
      for (var j = 1; j < q2.s.length; j++) ctx.lineTo(px(q2.s[j]), py(q2.k[j]));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    if (head < c.x.length - 1) {
      ctx.strokeStyle = colors.curve;
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.moveTo(px(c.s[head]), top);
      ctx.lineTo(px(c.s[head]), bot);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = colors.curve;
      ctx.beginPath();
      ctx.arc(px(c.s[head]), py(c.k[head]), 3, 0, Math.PI * 2);
      ctx.fill();
    }

    label("curvature κ", left, top + 10, colors.alt);
    var sLabel = "arc length s → " + sMax.toFixed(1);
    label(sLabel, right - ctx.measureText(sLabel).width, cssH - 3, colors.alt);
  }

  /* ------------------------------------------------------------------ *
   * Tracing.
   * ------------------------------------------------------------------ */

  var trace = { on: false, head: 0, raf: 0, t0: 0 };
  var TRACE_MS = 7000;

  function stopTrace() {
    trace.on = false;
    cancelAnimationFrame(trace.raf);
    if (els.play) {
      els.play.textContent = "Trace";
      els.play.setAttribute("aria-pressed", "false");
    }
    schedule();
  }

  function startTrace() {
    if (!current.curve) return;
    trace.on = true;
    trace.head = 0;
    trace.t0 = (window.performance || Date).now();
    if (els.play) {
      els.play.textContent = "Stop";
      els.play.setAttribute("aria-pressed", "true");
    }
    var step = function () {
      var f = ((window.performance || Date).now() - trace.t0) / TRACE_MS;
      if (f >= 1) { stopTrace(); return; }
      trace.head = Math.floor(f * (current.curve.x.length - 1));
      draw();
      trace.raf = requestAnimationFrame(step);
    };
    trace.raf = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------ *
   * Pan, zoom and pinch.
   * ------------------------------------------------------------------ */

  var pointers = Object.create(null);
  var pointerCount = 0;
  var lastCentroid = null;
  var glide = { vx: 0, vy: 0, raf: 0 };

  function zoomAt(factor, px, py) {
    var base = fitScale();
    // The coils tighten geometrically, so deep zoom is the point here; the
    // floor keeps the whole curve from shrinking to a dot.
    var next = Math.min(base * 400, Math.max(base * 0.6, view.scale * factor));
    factor = next / view.scale;
    view.x = px - (px - view.x) * factor;
    view.y = py - (py - view.y) * factor;
    view.scale = next;
    clampView();
    schedule();
  }

  function localPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  }

  function centroidOfPointers() {
    var x = 0, y = 0, n = 0, spread = 0, pts = [];
    for (var id in pointers) { pts.push(pointers[id]); x += pointers[id][0]; y += pointers[id][1]; n++; }
    x /= n; y /= n;
    if (pts.length > 1) spread = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
    return { x: x, y: y, n: n, spread: spread };
  }

  canvas.addEventListener("pointerdown", function (e) {
    canvas.setPointerCapture(e.pointerId);
    if (!pointers[e.pointerId]) pointerCount++;
    pointers[e.pointerId] = localPoint(e);
    lastCentroid = centroidOfPointers();
    glide.vx = glide.vy = 0;
    cancelAnimationFrame(glide.raf);
    canvas.classList.add("is-dragging");
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = localPoint(e);
    var now = centroidOfPointers();
    if (lastCentroid) {
      var dx = now.x - lastCentroid.x, dy = now.y - lastCentroid.y;
      view.x += dx;
      view.y += dy;
      glide.vx = dx;
      glide.vy = dy;
      if (now.n > 1 && lastCentroid.n === now.n && lastCentroid.spread > 0 && now.spread > 0) {
        zoomAt(now.spread / lastCentroid.spread, now.x, now.y);
      }
      clampView();
      schedule();
    }
    lastCentroid = now;
    e.preventDefault();
  });

  function release(e) {
    if (pointers[e.pointerId]) { delete pointers[e.pointerId]; pointerCount--; }
    lastCentroid = pointerCount > 0 ? centroidOfPointers() : null;
    if (pointerCount === 0) {
      canvas.classList.remove("is-dragging");
      // A short glide after the finger leaves; without it a flick stops dead.
      var step = function () {
        view.x += glide.vx;
        view.y += glide.vy;
        glide.vx *= 0.92;
        glide.vy *= 0.92;
        clampView();
        schedule();
        if (Math.abs(glide.vx) > 0.15 || Math.abs(glide.vy) > 0.15) glide.raf = requestAnimationFrame(step);
      };
      if (Math.abs(glide.vx) > 1 || Math.abs(glide.vy) > 1) glide.raf = requestAnimationFrame(step);
    }
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  canvas.addEventListener("wheel", function (e) {
    e.preventDefault();
    var p = localPoint(e);
    // Trackpad pinch arrives as ctrl+wheel; treat it as a finer zoom.
    var k = e.ctrlKey ? 0.012 : 0.0022;
    zoomAt(Math.exp(-e.deltaY * k), p[0], p[1]);
  }, { passive: false });

  canvas.addEventListener("dblclick", function (e) {
    var p = localPoint(e);
    zoomAt(1.8, p[0], p[1]);
  });

  canvas.addEventListener("keydown", function (e) {
    var step = e.shiftKey ? 120 : 40;
    if (e.key === "ArrowLeft") view.x += step;
    else if (e.key === "ArrowRight") view.x -= step;
    else if (e.key === "ArrowUp") view.y += step;
    else if (e.key === "ArrowDown") view.y -= step;
    else if (e.key === "+" || e.key === "=") zoomAt(1.25, cssW / 2, plotH / 2);
    else if (e.key === "-" || e.key === "_") zoomAt(0.8, cssW / 2, plotH / 2);
    else if (e.key === "0") { fit(); return; }
    else return;
    e.preventDefault();
    clampView();
    schedule();
  });

  /* ------------------------------------------------------------------ *
   * Controls.
   * ------------------------------------------------------------------ */

  var pick = function (sel) { return wrap ? wrap.querySelector(sel) : null; };
  var els = {
    kind: pick("[data-role=kind]"),
    a: pick("[data-role=param-a]"),
    aLabel: pick("[data-role=label-a]"),
    aValue: pick("[data-role=value-a]"),
    b: pick("[data-role=param-b]"),
    bLabel: pick("[data-role=label-b]"),
    bValue: pick("[data-role=value-b]"),
    readout: pick("[data-role=readout]"),
    legend: pick("[data-role=legend]"),
    reset: pick("[data-role=reset]"),
    play: pick("[data-role=play]"),
    expand: pick("[data-role=expand]"),
    zoomIn: pick("[data-role=zoom-in]"),
    zoomOut: pick("[data-role=zoom-out]"),
  };

  function syncSlider(input, label, spec) {
    if (!input) return;
    var row = input.closest(".euler-field");
    if (!spec) {
      if (row) row.hidden = true;
      return;
    }
    if (row) row.hidden = false;
    input.min = spec.min;
    input.max = spec.max;
    input.step = spec.step;
    input.value = spec.value;
    if (label) label.textContent = spec.label;
  }

  function syncControls(name) {
    var mode = MODES[name];
    syncSlider(els.a, els.aLabel, mode.a);
    syncSlider(els.b, els.bLabel, mode.b);
  }

  function report() {
    if (els.readout) els.readout.textContent = current.readout || "";
    if (els.aValue) els.aValue.textContent = current.labelA || "";
    if (els.bValue) els.bValue.textContent = current.labelB || "";
    if (els.legend) {
      els.legend.innerHTML = "";
      for (var i = 0; i < current.kinds.length; i++) {
        var kind = current.kinds[i];
        var item = document.createElement("span");
        item.className = "euler-key";
        var swatch = document.createElement("i");
        swatch.style.background = kind.color === "curve" ? colors.curve : colors.alt;
        item.appendChild(swatch);
        item.appendChild(document.createTextNode(kind.label));
        els.legend.appendChild(item);
      }
    }
  }

  function values(name) {
    var mode = MODES[name];
    return [
      els.a && mode.a ? Number(els.a.value) : mode.a ? mode.a.value : 0,
      els.b && mode.b ? Number(els.b.value) : mode.b ? mode.b.value : 0,
    ];
  }

  function rebuild(name, keepView) {
    var v = values(name);
    build(name, v[0], v[1]);
    canvas.setAttribute(
      "aria-label",
      MODES[name].label + ". " + current.readout + " Drag to pan, pinch or scroll to zoom."
    );
    report();
    if (trace.on) trace.head = Math.min(trace.head, current.curve.x.length - 1);
    if (!keepView) fit();
    else { clampView(); schedule(); }
  }

  if (els.kind) {
    els.kind.addEventListener("change", function () {
      var name = els.kind.value;
      stopTrace();
      syncControls(name);
      rebuild(name, false);
      // #turtle and friends make one mode linkable, without adding a history
      // entry per nudge of a slider.
      if (window.history && history.replaceState) history.replaceState(null, "", "#" + name);
    });
  }

  var onSlider = function () { rebuild(current.name, true); };
  if (els.a) {
    els.a.addEventListener("input", onSlider);
    els.a.addEventListener("change", onSlider);
  }
  if (els.b) {
    els.b.addEventListener("input", onSlider);
    els.b.addEventListener("change", onSlider);
  }
  if (els.reset) els.reset.addEventListener("click", fit);
  if (els.play) els.play.addEventListener("click", function () { trace.on ? stopTrace() : startTrace(); });
  if (els.zoomIn) els.zoomIn.addEventListener("click", function () { zoomAt(1.4, cssW / 2, plotH / 2); });
  if (els.zoomOut) els.zoomOut.addEventListener("click", function () { zoomAt(1 / 1.4, cssW / 2, plotH / 2); });
  if (els.expand) {
    els.expand.addEventListener("click", function () {
      // A CSS overlay rather than the Fullscreen API, which iOS Safari does not
      // offer for elements.
      var on = wrap.classList.toggle("is-expanded");
      document.body.classList.toggle("euler-locked", on);
      els.expand.setAttribute("aria-pressed", on ? "true" : "false");
      els.expand.textContent = on ? "Close" : "Expand";
      requestAnimationFrame(function () { resize(); fit(); });
    });
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && wrap && wrap.classList.contains("is-expanded")) els.expand.click();
  });

  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onScheme = function () { readColors(); report(); schedule(); };
  if (mq.addEventListener) mq.addEventListener("change", onScheme);
  else if (mq.addListener) mq.addListener(onScheme);

  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener("resize", resize);

  var start = (location.hash || "").replace("#", "");
  if (!MODES[start]) start = "fresnel";
  if (els.kind) els.kind.value = start;

  readColors();
  syncControls(start);
  resize();
  rebuild(start, false);
})();
