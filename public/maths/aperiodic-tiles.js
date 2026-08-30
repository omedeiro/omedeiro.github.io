/*
 * Aperiodic tilings — builder and viewer for owenmedeiros.com/maths/aperiodic-tiles
 *
 * Three tilings, built three different ways:
 *
 *   penrose  Penrose P3 rhombs, by substitution. Ten Robinson half-rhombs are
 *            deflated repeatedly; each half is a golden triangle (36-72-72) or
 *            a golden gnomon (36-36-108), and mirror pairs glue back into thin
 *            and fat rhombs.
 *   ammann   Ammann-Beenker, by cut and project. Points of Z^4 whose image in
 *            the internal plane lands inside a regular octagon are kept; the
 *            unit squares of Z^4 that survive become squares and 45' rhombs.
 *   hat      The hat (Smith, Myers, Kaplan and Goodman-Strauss, 2023), from a
 *            patch found offline by exact-cover search over the kite grid. See
 *            the notes in HAT_PATCH below for why this one is precomputed.
 *
 * No dependencies. Everything below is plain ES5-compatible ES2015.
 */
(function () {
  "use strict";

  var app = document.getElementById("tiling-app");
  if (!app || !app.getContext) app = document.querySelector("[data-tiling-canvas]");
  if (!app) return;

  var canvas = app;
  var wrap = canvas.closest(".tiling");
  var ctx = canvas.getContext("2d");
  var PHI = (1 + Math.sqrt(5)) / 2;
  var R3 = Math.sqrt(3);

  /* ------------------------------------------------------------------ *
   * Penrose P3, by substitution.
   * ------------------------------------------------------------------ */

  // Ten half-rhombs around a point: the "sun" seed. Alternate copies are
  // mirrored so neighbouring halves share a full edge.
  function penroseSeed() {
    var tris = [];
    for (var i = 0; i < 10; i++) {
      var b = [Math.cos(((2 * i - 1) * Math.PI) / 10), Math.sin(((2 * i - 1) * Math.PI) / 10)];
      var c = [Math.cos(((2 * i + 1) * Math.PI) / 10), Math.sin(((2 * i + 1) * Math.PI) / 10)];
      tris.push(i % 2 === 0 ? [0, [0, 0], c, b] : [0, [0, 0], b, c]);
    }
    return tris;
  }

  function lerp(a, b, t) {
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }

  // Deflation by phi. Each triangle is [type, apex, base1, base2]; type 0 is the
  // acute golden triangle (half a thin rhomb), type 1 the obtuse gnomon (half a
  // fat rhomb). Areas force the counts: acute -> 1 + 1, gnomon -> 1 + 2.
  function penroseSubdivide(tris) {
    var out = [];
    for (var i = 0; i < tris.length; i++) {
      var t = tris[i], A = t[1], B = t[2], C = t[3];
      if (t[0] === 0) {
        var P = lerp(A, B, 1 / PHI);
        out.push([0, C, P, B], [1, P, C, A]);
      } else {
        var Q = lerp(B, A, 1 / PHI);
        var R = lerp(B, C, 1 / PHI);
        out.push([1, R, C, A], [1, Q, R, B], [0, R, Q, A]);
      }
    }
    return out;
  }

  function buildPenrose(level) {
    var tris = penroseSeed();
    for (var i = 0; i < level; i++) tris = penroseSubdivide(tris);
    // Keep the rhombs a constant size on screen: the patch grows instead.
    var s = Math.pow(PHI, level);
    var seen = Object.create(null);
    var tiles = [];
    for (var j = 0; j < tris.length; j++) {
      var t = tris[j], A = t[1], B = t[2], C = t[3];
      // Two mirror halves share the base B-C, so the midpoint of that edge
      // names the whole rhomb and the second half can be dropped.
      var mx = (B[0] + C[0]) / 2, my = (B[1] + C[1]) / 2;
      var key = Math.round(mx * 1e7) + "," + Math.round(my * 1e7);
      if (seen[key]) continue;
      seen[key] = 1;
      var D = [B[0] + C[0] - A[0], B[1] + C[1] - A[1]];
      tiles.push({
        type: t[0],
        pts: [A[0] * s, A[1] * s, B[0] * s, B[1] * s, D[0] * s, D[1] * s, C[0] * s, C[1] * s],
      });
    }
    return { tiles: tiles, kinds: ["thin rhomb", "fat rhomb"] };
  }

  /* ------------------------------------------------------------------ *
   * Ammann-Beenker, by cut and project from Z^4.
   * ------------------------------------------------------------------ */

  function buildAmmann(radius) {
    var par = [], perp = [];
    for (var j = 0; j < 4; j++) {
      par.push([Math.cos((j * Math.PI) / 4), Math.sin((j * Math.PI) / 4)]);
      perp.push([Math.cos((3 * j * Math.PI) / 4), Math.sin((3 * j * Math.PI) / 4)]);
    }
    // The acceptance window is the shadow of the unit hypercube in the internal
    // plane: a regular octagon. Build it as the hull of the 16 corner images.
    var corners = [];
    for (var m = 0; m < 16; m++) {
      var p = [0, 0];
      for (var b = 0; b < 4; b++) {
        var sgn = m & (1 << b) ? 0.5 : -0.5;
        p[0] += sgn * perp[b][0];
        p[1] += sgn * perp[b][1];
      }
      corners.push(p);
    }
    var win = convexHull(corners);
    // A small irrational shift keeps lattice points off the window boundary,
    // where an exact tie would drop or duplicate a tile.
    var shift = [0.0731, 0.0459];

    function inside(x) {
      var px = shift[0], py = shift[1];
      for (var j2 = 0; j2 < 4; j2++) {
        px += x[j2] * perp[j2][0];
        py += x[j2] * perp[j2][1];
      }
      for (var i = 0; i < win.length; i++) {
        var a = win[i], b2 = win[(i + 1) % win.length];
        if ((b2[0] - a[0]) * (py - a[1]) - (b2[1] - a[1]) * (px - a[0]) < -1e-9) return false;
      }
      return true;
    }

    function project(x) {
      var px = 0, py = 0;
      for (var j3 = 0; j3 < 4; j3++) {
        px += x[j3] * par[j3][0];
        py += x[j3] * par[j3][1];
      }
      return [px, py];
    }

    var kev = function (x) { return ((x[0] + 64) << 21) | ((x[1] + 64) << 14) | ((x[2] + 64) << 7) | (x[3] + 64); };
    // The accepted points are connected by single steps, so a flood fill from
    // the origin finds every vertex in range without touching the whole box.
    var start = [0, 0, 0, 0];
    var accepted = Object.create(null);
    var queue = [start];
    accepted[kev(start)] = start;
    var head = 0;
    while (head < queue.length) {
      var x = queue[head++];
      for (var d = 0; d < 4; d++) {
        for (var s2 = -1; s2 <= 1; s2 += 2) {
          var y = [x[0], x[1], x[2], x[3]];
          y[d] += s2;
          var k = kev(y);
          if (accepted[k]) continue;
          if (Math.abs(y[0]) > 90 || Math.abs(y[1]) > 90 || Math.abs(y[2]) > 90 || Math.abs(y[3]) > 90) continue;
          if (!inside(y)) continue;
          var p2 = project(y);
          if (Math.hypot(p2[0], p2[1]) > radius + 2) continue;
          accepted[k] = y;
          queue.push(y);
        }
      }
    }

    var tiles = [];
    for (var n = 0; n < queue.length; n++) {
      var v = queue[n];
      for (var i2 = 0; i2 < 4; i2++) {
        for (var j4 = i2 + 1; j4 < 4; j4++) {
          var a2 = [v[0], v[1], v[2], v[3]]; a2[i2] += 1;
          var b3 = [v[0], v[1], v[2], v[3]]; b3[j4] += 1;
          var c2 = [v[0], v[1], v[2], v[3]]; c2[i2] += 1; c2[j4] += 1;
          if (!accepted[kev(a2)] || !accepted[kev(b3)] || !accepted[kev(c2)]) continue;
          var P0 = project(v), P1 = project(a2), P2 = project(c2), P3 = project(b3);
          var cx = (P0[0] + P1[0] + P2[0] + P3[0]) / 4, cy = (P0[1] + P1[1] + P2[1] + P3[1]) / 4;
          if (Math.hypot(cx, cy) > radius) continue;
          // Steps two apart in the 8-fold star meet at 90 degrees (a square);
          // adjacent steps meet at 45 (a rhomb).
          tiles.push({ type: j4 - i2 === 2 ? 0 : 1, pts: [P0[0], P0[1], P1[0], P1[1], P2[0], P2[1], P3[0], P3[1]] });
        }
      }
    }
    return { tiles: tiles, kinds: ["square", "rhomb"] };
  }

  function convexHull(pts) {
    var p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var cross = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lower = [];
    for (var i = 0; i < p.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 1e-12) lower.pop();
      lower.push(p[i]);
    }
    var upper = [];
    for (var j = p.length - 1; j >= 0; j--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p[j]) <= 1e-12) upper.pop();
      upper.push(p[j]);
    }
    return lower.slice(0, -1).concat(upper.slice(0, -1));
  }

  /* ------------------------------------------------------------------ *
   * The hat.
   *
   * The hat is eight kites of the deltoidal trihexagonal tiling, which is what
   * HAT_CELLS records: (q, r, k) is kite k of the hexagon at axial coordinate
   * (q, r). HAT_PATCH lists one placement per tile as [dq, dr, rotation,
   * reflected], rotation counting sixths of a turn.
   *
   * Unlike the two above, this patch is finite and precomputed. There is no
   * short deflation rule for the hat: the aperiodicity proof runs through a
   * hierarchy of four metatiles, and building a patch directly is an exact
   * cover problem that grows exponentially. This one, a disc of radius 44, took
   * three random restarts and 8.8 * 10^8 nodes offline. A phone should not be
   * asked to do that.
   * ------------------------------------------------------------------ */

  var HAT_CELLS = [[0, 0, 0], [0, 0, 5], [1, -1, 2], [1, 0, 4], [0, 0, 1], [0, 0, 4], [1, -1, 1], [1, 0, 3]];
  var HAT_PATCH = [
    0, 0, 1, 0, -1, 0, 1, 1, 0, -1, 3, 0, 1, -1, 1, 0, 1, -2, 2, 0, -1, 1, 3, 0, 0, 1, 2, 0,
    2, 0, 3, 0, -2, 0, 5, 0, -2, 1, 4, 0, -1, 2, 3, 0, 1, 1, 2, 0, 2, -1, 5, 1, 0, -2, 3, 0,
    2, -2, 5, 0, 1, -3, 1, 0, 0, -3, 1, 1, 3, -1, 2, 0, 0, 3, 4, 0, -3, 2, 1, 0, 2, 1, 0, 0,
    -4, 2, 0, 0, -1, 3, 3, 0, -1, -2, 4, 0, 1, 2, 0, 1, 3, -2, 1, 0, -2, -1, 4, 0, -3, 0, 2,
    0, -3, 4, 5, 0, 3, -4, 3, 0, -3, -1, 2, 1, 3, -3, 0, 0, 1, 3, 3, 0, 4, 0, 4, 0, 2, -4,
    4, 0, -1, 4, 1, 0, 1, -4, 3, 0, -4, 3, 1, 0, 4, -1, 5, 0, 2, 2, 2, 0, 4, -3, 1, 0, -2,
    4, 1, 1, -4, 1, 3, 0, -1, -3, 5, 0, 3, 1, 1, 0, -5, 3, 5, 0, -3, -2, 0, 0, -4, 4, 2, 0,
    4, -5, 2, 0, -5, 4, 5, 1, -3, 5, 4, 0, 3, -5, 0, 1, 0, 5, 5, 0, -4, 0, 4, 0, 3, 2, 2, 0,
    -2, 5, 3, 0, 3, -6, 2, 0, 6, -3, 3, 0, 2, -6, 2, 0, -4, -1, 5, 0, -2, -3, 5, 0, 5, -4,
    1, 0, 1, -5, 3, 0, 5, 0, 3, 0, 5, -5, 2, 0, 5, -1, 1, 1, 1, 4, 0, 0, 6, -2, 3, 0, -6, 2,
    1, 0, -5, 1, 4, 0, -1, 5, 2, 0, -5, 6, 0, 0, -1, -5, 1, 0, -6, 3, 2, 0, -3, -3, 3, 0,
    -6, 4, 1, 0, 5, 1, 3, 0, -4, 6, 1, 0, -5, 5, 3, 0, 5, -6, 1, 0, -2, -4, 3, 1, 4, 2, 2,
    0, -2, 6, 3, 0, 3, 4, 4, 0, -5, -2, 1, 0, 4, -6, 0, 0, 6, -4, 5, 1, -5, -1, 2, 0, 0, 6,
    4, 0, 1, -6, 3, 0, 1, 5, 2, 1, 6, -5, 5, 0, 2, 5, 4, 0, -7, 2, 0, 0, 4, -7, 3, 0, 7, -4,
    2, 0, 7, -2, 4, 0, 6, -1, 1, 0, 6, 0, 2, 0, 2, -7, 1, 0, -2, -5, 0, 0, 1, -7, 1, 1, -7,
    1, 0, 0, 0, -6, 4, 0, -6, 7, 5, 0, -7, 3, 4, 1, -1, 7, 4, 0, -7, 5, 1, 0, -4, 8, 5, 0,
    -8, 4, 0, 0, -5, 7, 3, 1, 5, 2, 0, 0, -4, -3, 4, 0, -2, 7, 3, 0, 4, 3, 0, 1, -8, 5, 0,
    0, -3, -4, 5, 0, 7, -5, 1, 0, -5, 8, 5, 0, 5, -8, 2, 0, 7, -7, 3, 0, -6, -1, 2, 0, 6,
    -7, 4, 0, -7, 7, 5, 0, 4, 4, 3, 0, 8, -4, 2, 0, 8, -2, 3, 0, 3, -8, 1, 0, 2, 6, 5, 0,
    -6, -2, 0, 0, 1, 6, 2, 0, 0, 7, 3, 0, 7, -6, 0, 0, 7, 1, 4, 0, -8, 2, 5, 0, -7, -1, 0,
    1, -1, -7, 2, 0, 7, 0, 5, 0, -7, 0, 3, 0, 5, 3, 2, 0, -4, -4, 5, 0, 4, -8, 5, 1, 9, -5,
    3, 0, 2, -8, 3, 0, -8, 7, 5, 0, -2, -6, 3, 0, -2, 8, 1, 0, -8, 3, 4, 0, -3, 8, 1, 1, 3,
    -9, 2, 0, 8, -6, 1, 0, 8, -3, 0, 1, -8, 6, 3, 1, 6, -8, 5, 0, 0, -7, 5, 0, -7, 8, 4, 0,
    -4, 9, 4, 0, -9, 4, 1, 0, -6, 8, 3, 0, 6, 2, 1, 0, -6, 9, 0, 0, 4, 5, 3, 0, 5, -9, 1, 0,
    8, -8, 3, 1, 8, -7, 5, 0, -9, 6, 5, 0, -5, -4, 2, 0, 2, 7, 4, 0, 7, -8, 5, 0, 8, -1, 0,
    0, 9, -3, 2, 0, -1, 9, 5, 0, -9, 8, 0, 0, -6, -3, 3, 0, -9, 1, 1, 0, -4, -5, 4, 0, 5, 5,
    4, 0, 9, -4, 0, 0, -3, 9, 3, 0, 4, -9, 5, 0, 6, 3, 2, 0, 0, -8, 4, 0, 0, 8, 0, 0, 8, 1,
    4, 1, 8, 0, 0, 0, -10, 4, 0, 0, -3, -6, 4, 0, 9, -6, 5, 1, 3, 6, 1, 1, -1, -8, 2, 1, -7,
    -2, 2, 0, 2, -9, 3, 0, 7, 2, 0, 0, -9, 2, 2, 0, 9, -7, 5, 0, -7, 10, 5, 0, -2, -7, 4, 0,
    -5, -5, 2, 1, -5, 10, 4, 0, -8, 0, 4, 0, -9, 9, 0, 0, -10, 6, 5, 0, 10, -6, 2, 0, 6,
    -10, 1, 0, -2, 9, 2, 0, -9, 7, 3, 0, 3, -10, 1, 0, -8, 9, 1, 0, 1, -9, 4, 0, 1, 8, 1, 0,
    3, 7, 3, 0, 2, -10, 1, 1, 8, -10, 3, 0, 10, -3, 2, 0, -10, 5, 3, 1, -5, 11, 5, 0, 5,
    -10, 0, 0, 4, 6, 1, 0, 8, -9, 0, 0, 9, -9, 1, 0, 7, 3, 0, 0, -10, 7, 4, 0, -6, -4, 4, 0,
    -6, 10, 2, 1, -3, 10, 3, 0, 6, 4, 0, 1, 10, -7, 1, 0, 10, -4, 1, 0, 10, -1, 4, 0, -10,
    3, 3, 0, -1, 10, 5, 1, 0, 9, 1, 0, -9, 0, 3, 0, -7, -3, 4, 0, -10, 1, 1, 1, -10, 9, 5,
    0, -2, 10, 1, 0, -8, -2, 2, 0, 6, 5, 3, 0, 11, -5, 4, 0, -11, 5, 5, 0, -5, -6, 0, 0,
    -10, 2, 3, 0, -8, 10, 2, 0, 5, -11, 3, 0, -7, 11, 4, 0, 7, -11, 1, 0, -3, -8, 2, 0, -1,
    -9, 0, 0, 9, 0, 1, 0, -2, -8, 5, 0, 9, 1, 2, 0, 10, -8, 0, 0, 11, -6, 5, 0, -9, -1, 3,
    0, -9, 10, 4, 1, -8, -3, 2, 1, 3, 8, 3, 0, 11, -2, 4, 0, 9, -11, 2, 0, 4, -11, 4, 0, -6,
    -5, 5, 0, -6, 11, 2, 0, 6, -12, 2, 0, -11, 6, 3, 0, 7, 4, 2, 0, 7, -12, 2, 0, 12, -5, 3,
    0, -11, 8, 1, 0, 3, -11, 3, 0, -3, 11, 1, 0, 11, -3, 5, 0, -10, 10, 4, 0, 1, -10, 5, 0,
    10, -9, 0, 0, -11, 7, 3, 0, -4, 11, 1, 1, 11, -8, 1, 0, 4, 7, 2, 0, -10, 11, 0, 0, 1,
    10, 5, 0, 10, -10, 4, 0, 11, -1, 3, 0, 5, 7, 5, 0, -5, 12, 4, 0, 8, -11, 5, 1, 8, 3, 1,
    0, -12, 5, 5, 0, -5, -7, 0, 0, -11, 9, 2, 0, -8, -4, 0, 0, -3, -9, 1, 0, -12, 3, 1, 0,
    -12, 8, 1, 1, -8, 12, 4, 0, 0, -10, 5, 0, 0, 10, 2, 0, -11, 1, 5, 0, 11, -10, 4, 1, 6,
    6, 0, 0, 12, -6, 5, 0, 5, -12, 0, 1, -11, 2, 4, 0, -1, 11, 3, 0, -9, -2, 4, 0, 9, 2, 1,
    0, -1, -10, 3, 0, 10, 1, 5, 0, -7, -5, 5, 0, -12, 6, 4, 0, -10, 12, 0, 0, 3, 9, 3, 0, 9,
    -12, 1, 0, 13, -6, 3, 1, -6, -7, 1, 0, 10, -11, 5, 0, -7, 12, 3, 0, -4, 12, 3, 0, 5,
    -13, 2, 0, 8, 4, 2, 0, 13, -8, 3, 0, 5, 8, 4, 0, 8, -12, 5, 0, 12, -4, 0, 0, 12, -10, 2,
    0, 12, -3, 2, 1, 3, -12, 3, 0, -9, -3, 5, 0, -4, -8, 4, 1, 4, -13, 2, 0, 12, -9, 1, 0,
    -12, 11, 0, 0, -10, -1, 4, 0, 0, -11, 3, 1, 4, 9, 4, 0, 10, 2, 5, 1, 12, -2, 2, 0, -7,
    13, 0, 0, 7, -13, 1, 0, -13, 8, 5, 0, -11, 11, 1, 0, 11, 0, 0, 0, 1, 11, 4, 0, -13, 4,
    1, 0, -12, 9, 3, 0, -3, 12, 2, 0, 1, -12, 1, 0, -2, -10, 4, 0, -13, 3, 0, 0, -6, 13, 1,
    0, 6, 7, 0, 0, 13, -3, 4, 0, -9, 13, 4, 0, -4, -9, 0, 0, -13, 5, 2, 0, -8, -5, 3, 0, 13,
    -5, 5, 0, -11, 0, 4, 0, 11, -11, 0, 0, -13, 7, 4, 0, 6, -13, 0, 0, 10, 3, 3, 0, 2, 10,
    1, 1, -2, 12, 2, 0, -12, 10, 3, 0, 12, -11, 1, 0, -7, -6, 3, 1, 6, 8, 4, 1, 8, 6, 4, 0,
    13, -7, 0, 0, -8, 14, 5, 0, -5, -8, 4, 0, 10, -13, 1, 0, -12, 1, 2, 0, -1, 12, 0, 0,
    -13, 9, 4, 0, -4, 13, 3, 0, 9, 4, 2, 0, -11, 13, 5, 0, -9, 14, 5, 0, -10, -3, 2, 0, 3,
    -13, 3, 0, -10, -4, 1, 0, 9, -13, 0, 0, 13, -9, 5, 1, -7, -7, 0, 0, 13, -10, 5, 0, 9,
    -14, 3, 0, -12, 0, 2, 1, -1, -11, 5, 0, 0, -12, 0, 0, 11, -12, 0, 0, 11, 1, 1, 0, 3, 10,
    1, 0, -2, 13, 0, 1, 2, 11, 3, 0, 13, -2, 2, 0, 6, -14, 3, 0, 14, -9, 2, 0, 5, 9, 3, 0,
    14, -5, 2, 0, -12, 12, 3, 1, -12, 13, 5, 0, 0, 12, 1, 0, 11, 2, 2, 0, -10, 13, 2, 1, -7,
    14, 1, 0, 4, -14, 1, 0, -14, 5, 5, 1, -13, 12, 5, 0, -12, -1, 0, 0, 2, -13, 4, 0, 8,
    -14, 4, 0, -14, 8, 2, 0, -13, 2, 3, 0, 14, -3, 3, 0, -4, -10, 0, 0, 3, -14, 1, 1, -14,
    4, 5, 0, -8, -6, 5, 0, -8, 15, 5, 1, 7, -15, 2, 0, 7, 7, 1, 0, -14, 7, 2, 1, 14, -7, 1,
    0, -14, 6, 3, 0, 12, 0, 1, 0, -6, 15, 5, 0, -14, 10, 1, 0, -4, 14, 0, 0, 6, 9, 4, 0, 15,
    -6, 3, 0, -2, -11, 5, 0, 11, -13, 0, 0, 14, -12, 3, 0, 10, 4, 0, 0, -9, -5, 4, 0, -5,
    -9, 5, 0, -5, 15, 5, 0, 9, 5, 0, 1, -15, 10, 0, 0, 14, -10, 1, 0, -11, 14, 4, 0, 13,
    -12, 4, 0, -10, 14, 2, 0, 10, -15, 2, 0, -6, -9, 2, 0, 9, 6, 3, 0, 15, -9, 2, 0, 14, -4,
    0, 1, -14, 12, 5, 0, -12, -2, 0, 0, -15, 5, 1, 0, -9, 15, 4, 0, -3, 14, 1, 0, 11, -14,
    4, 0, -11, -3, 4, 1, -1, 13, 2, 0, 1, -14, 2, 0, -13, 1, 4, 0, -13, 0, 5, 0, 13, -1, 1,
    0, 5, -15, 1, 0, 2, 12, 3, 0, -13, 14, 0, 0, 5, 10, 3, 0, -7, -8, 3, 0, -15, 7, 2, 0, 0,
    -13, 3, 0, 13, -14, 2, 0, -3, -11, 5, 0, 3, 11, 2, 0, 12, -15, 2, 1, 12, 3, 4, 0, 14,
    -11, 0, 0
  ];

  // Kite k of hexagon (q, r): centre, edge midpoint, hexagon vertex, edge
  // midpoint. Integer coordinates (X, Y) stand for the point (X/2, Y*sqrt3/2).
  var HEX_VERT = [[4, 0], [2, 2], [-2, 2], [-4, 0], [-2, -2], [2, -2]];
  var HEX_MID = [[3, 1], [0, 2], [-3, 1], [-3, -1], [0, -2], [3, -1]];

  function kiteCorners(q, r, k) {
    var cx = 6 * q, cy = 2 * q + 4 * r;
    var a = HEX_MID[(k + 5) % 6], b = HEX_VERT[k], c = HEX_MID[k];
    return [cx, cy, cx + a[0], cy + a[1], cx + b[0], cy + b[1], cx + c[0], cy + c[1]];
  }

  // Rotation by 60 degrees CCW, after an optional reflection in the x-axis.
  function hatTransform(cell, turns, flip) {
    var q = cell[0], r = cell[1], k = cell[2], nq;
    if (flip) { r = -q - r; k = (6 - k) % 6; }
    for (var i = 0; i < turns; i++) { nq = -r; r = q + r; q = nq; k = (k + 1) % 6; }
    return [q, r, k];
  }

  function buildHat() {
    var tiles = [];
    // Which way round the patch happens to sit is an accident of the search, so
    // find the majority handedness and call that one the unreflected hat.
    var flips = 0;
    for (var f = 3; f < HAT_PATCH.length; f += 4) flips += HAT_PATCH[f];
    var majority = flips * 2 > HAT_PATCH.length / 4 ? 1 : 0;
    for (var i = 0; i < HAT_PATCH.length; i += 4) {
      var dq = HAT_PATCH[i], dr = HAT_PATCH[i + 1], turns = HAT_PATCH[i + 2], flip = HAT_PATCH[i + 3];
      var edges = Object.create(null);
      var cells = [];
      for (var c = 0; c < HAT_CELLS.length; c++) {
        var cell = hatTransform(HAT_CELLS[c], turns, flip);
        cells.push([cell[0] + dq, cell[1] + dr, cell[2]]);
      }
      // Outline the eight kites: interior edges are the ones used twice.
      for (var n = 0; n < cells.length; n++) {
        var p = kiteCorners(cells[n][0], cells[n][1], cells[n][2]);
        for (var e = 0; e < 4; e++) {
          var x1 = p[e * 2], y1 = p[e * 2 + 1];
          var x2 = p[((e + 1) % 4) * 2], y2 = p[((e + 1) % 4) * 2 + 1];
          var fwd = x1 + ":" + y1 + ":" + x2 + ":" + y2;
          var rev = x2 + ":" + y2 + ":" + x1 + ":" + y1;
          if (edges[rev]) delete edges[rev];
          else edges[fwd] = [x1, y1, x2, y2];
        }
      }
      tiles.push({ type: flip === majority ? 0 : 1, pts: traceOutline(edges) });
    }
    return { tiles: tiles, kinds: ["hat", "reflected hat"] };
  }

  function traceOutline(edges) {
    var next = Object.create(null), first = null;
    for (var key in edges) {
      var e = edges[key];
      next[e[0] + ":" + e[1]] = e;
      if (!first) first = e;
    }
    var pts = [];
    var cur = first;
    var guard = 0;
    do {
      pts.push(cur[0] / 2, (cur[1] * R3) / 2);
      cur = next[cur[2] + ":" + cur[3]];
    } while (cur && cur !== first && ++guard < 64);
    return pts;
  }

  /* ------------------------------------------------------------------ *
   * Tilings, and the control that builds them.
   * ------------------------------------------------------------------ */

  // `fill` maps a tile's type onto the two palette entries. The hat runs the
  // other way round: its reflected tiles are the rare ones, and they read
  // better as pale flecks in a field of the darker colour than the reverse.
  var TILINGS = {
    penrose: {
      label: "Penrose rhombs",
      detail: { min: 1, max: 8, value: 5, label: "Substitution steps" },
      fill: [0, 1],
      build: buildPenrose,
    },
    ammann: {
      label: "Ammann–Beenker",
      detail: { min: 6, max: 46, value: 20, step: 2, label: "Patch radius" },
      fill: [0, 1],
      build: buildAmmann,
    },
    hat: {
      label: "The hat",
      detail: null,
      fill: [1, 0],
      build: buildHat,
    },
  };

  var current = { name: "penrose", tiles: [], kinds: [], bounds: null };
  var view = { x: 0, y: 0, scale: 1 };
  var colors = { a: "#eee", b: "#ccc", line: "#333", bg: "#fff" };

  function readColors() {
    var cs = getComputedStyle(wrap || document.documentElement);
    var pick = function (name, fallback) {
      var v = cs.getPropertyValue(name);
      return v && v.trim() ? v.trim() : fallback;
    };
    colors.a = pick("--tile-a", "#efe3d6");
    colors.b = pick("--tile-b", "#d8c0a8");
    colors.line = pick("--tile-line", "rgba(28,28,26,.5)");
    colors.bg = pick("--tile-bg", "#fbfaf8");
  }

  function measure(tiles) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (var i = 0; i < tiles.length; i++) {
      var p = tiles[i].pts;
      for (var j = 0; j < p.length; j += 2) {
        if (p[j] < minX) minX = p[j];
        if (p[j] > maxX) maxX = p[j];
        if (p[j + 1] < minY) minY = p[j + 1];
        if (p[j + 1] > maxY) maxY = p[j + 1];
      }
    }
    return { minX: minX, minY: minY, maxX: maxX, maxY: maxY };
  }

  function build(name, detail) {
    var spec = TILINGS[name];
    var t0 = (window.performance || Date).now();
    var result = spec.build(detail);
    current.name = name;
    current.tiles = result.tiles;
    current.kinds = result.kinds;
    current.bounds = measure(result.tiles);
    current.ms = Math.round((window.performance || Date).now() - t0);
    return current;
  }

  /* ------------------------------------------------------------------ *
   * Rendering.
   * ------------------------------------------------------------------ */

  var dpr = 1, cssW = 0, cssH = 0, needsDraw = false;

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cssW = Math.max(1, rect.width);
    cssH = Math.max(1, rect.height);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    clampView();
    draw();
  }

  /** The scale at which the whole patch just fits the canvas. */
  function fitScale() {
    var b = current.bounds;
    if (!b || !isFinite(b.minX)) return 1;
    return Math.min(cssW / ((b.maxX - b.minX) * 1.06), cssH / ((b.maxY - b.minY) * 1.06));
  }

  function fit() {
    var b = current.bounds;
    if (!b || !isFinite(b.minX)) return;
    var s = fitScale();
    view.scale = s;
    view.x = cssW / 2 - ((b.minX + b.maxX) / 2) * s;
    view.y = cssH / 2 + ((b.minY + b.maxY) / 2) * s;
    schedule();
  }

  /**
   * Keep the patch on screen. Without this, one determined scroll shrinks the
   * tiling to nothing or flings it past the edge, and the canvas goes blank
   * with no clue about which way to come back.
   */
  function clampView() {
    var b = current.bounds;
    if (!b || !isFinite(b.minX)) return;
    var s = view.scale;
    // Whatever sits under the middle of the canvas has to be part of the patch.
    // That holds at every zoom level, and still lets you push right out to a
    // corner of a large one.
    var wx = Math.min(b.maxX, Math.max(b.minX, (cssW / 2 - view.x) / s));
    var wy = Math.min(b.maxY, Math.max(b.minY, (view.y - cssH / 2) / s));
    view.x = cssW / 2 - wx * s;
    view.y = cssH / 2 + wy * s;
  }

  function schedule() {
    if (needsDraw) return;
    needsDraw = true;
    requestAnimationFrame(function () { needsDraw = false; draw(); });
  }

  function draw() {
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, cssW, cssH);

    var s = view.scale, tx = view.x, ty = view.y;
    var pad = 4;
    var paths = [new Path2D(), new Path2D()];
    var tiles = current.tiles;

    for (var i = 0; i < tiles.length; i++) {
      var p = tiles[i].pts;
      // Screen-space bounding box, so off-view tiles cost one comparison each.
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      var k, sx, sy;
      for (k = 0; k < p.length; k += 2) {
        sx = p[k] * s + tx;
        sy = -p[k + 1] * s + ty;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
      if (maxX < -pad || minX > cssW + pad || maxY < -pad || minY > cssH + pad) continue;
      var path = paths[tiles[i].type ? 1 : 0];
      for (k = 0; k < p.length; k += 2) {
        sx = p[k] * s + tx;
        sy = -p[k + 1] * s + ty;
        if (k === 0) path.moveTo(sx, sy);
        else path.lineTo(sx, sy);
      }
      path.closePath();
    }

    var palette = [colors.a, colors.b];
    var fill = TILINGS[current.name].fill;
    ctx.fillStyle = palette[fill[0]];
    ctx.fill(paths[0]);
    ctx.fillStyle = palette[fill[1]];
    ctx.fill(paths[1]);
    // One world unit is a tile edge. Below about two and a half pixels of it,
    // outlines turn the patch into a solid block of ink, so they drop out.
    if (s > 2.5) {
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.min(1.1, Math.max(0.35, s / 22));
      ctx.strokeStyle = colors.line;
      ctx.stroke(paths[0]);
      ctx.stroke(paths[1]);
    }
  }

  /* ------------------------------------------------------------------ *
   * Pan, zoom and pinch.
   * ------------------------------------------------------------------ */

  var pointers = Object.create(null);
  var pointerCount = 0;
  var last = null;
  var glide = { vx: 0, vy: 0, raf: 0 };

  function zoomAt(factor, px, py) {
    var base = fitScale();
    // One world unit is a tile edge in all three tilings, so capping at 300
    // pixels per unit stops the zoom inside a single tile. Small patches get a
    // relative cap instead, since there is nothing to explore in them.
    var hi = Math.max(base * 3, 300);
    var next = Math.min(hi, Math.max(base * 0.5, view.scale * factor));
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
    last = centroidOfPointers();
    glide.vx = glide.vy = 0;
    cancelAnimationFrame(glide.raf);
    canvas.classList.add("is-dragging");
    e.preventDefault();
  });

  canvas.addEventListener("pointermove", function (e) {
    if (!pointers[e.pointerId]) return;
    pointers[e.pointerId] = localPoint(e);
    var now = centroidOfPointers();
    if (last) {
      var dx = now.x - last.x, dy = now.y - last.y;
      view.x += dx;
      view.y += dy;
      glide.vx = dx;
      glide.vy = dy;
      if (now.n > 1 && last.n === now.n && last.spread > 0 && now.spread > 0) {
        zoomAt(now.spread / last.spread, now.x, now.y);
      }
      clampView();
      schedule();
    }
    last = now;
    e.preventDefault();
  });

  function release(e) {
    if (pointers[e.pointerId]) { delete pointers[e.pointerId]; pointerCount--; }
    last = pointerCount > 0 ? centroidOfPointers() : null;
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
    zoomAt(1.7, p[0], p[1]);
  });

  canvas.addEventListener("keydown", function (e) {
    var step = e.shiftKey ? 120 : 40;
    if (e.key === "ArrowLeft") view.x += step;
    else if (e.key === "ArrowRight") view.x -= step;
    else if (e.key === "ArrowUp") view.y += step;
    else if (e.key === "ArrowDown") view.y -= step;
    else if (e.key === "+" || e.key === "=") zoomAt(1.25, cssW / 2, cssH / 2);
    else if (e.key === "-" || e.key === "_") zoomAt(0.8, cssW / 2, cssH / 2);
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
    detail: pick("[data-role=detail]"),
    detailLabel: pick("[data-role=detail-label]"),
    detailValue: pick("[data-role=detail-value]"),
    count: pick("[data-role=count]"),
    legend: pick("[data-role=legend]"),
    reset: pick("[data-role=reset]"),
    expand: pick("[data-role=expand]"),
    zoomIn: pick("[data-role=zoom-in]"),
    zoomOut: pick("[data-role=zoom-out]"),
  };

  function syncDetail(name) {
    var spec = TILINGS[name].detail;
    if (!els.detail) return;
    var row = els.detail.closest(".tiling-field");
    if (!spec) {
      if (row) row.hidden = true;
      return;
    }
    if (row) row.hidden = false;
    els.detail.min = spec.min;
    els.detail.max = spec.max;
    els.detail.step = spec.step || 1;
    els.detail.value = spec.value;
    if (els.detailLabel) els.detailLabel.textContent = spec.label;
    if (els.detailValue) els.detailValue.textContent = spec.value;
  }

  function report() {
    if (els.count) {
      var n = current.tiles.length.toLocaleString() + " tiles";
      els.count.textContent = current.ms >= 1 ? n + ", built in " + current.ms + " ms" : n;
    }
    if (els.legend) {
      els.legend.innerHTML = "";
      var palette = [colors.a, colors.b];
      var fill = TILINGS[current.name].fill;
      for (var i = 0; i < current.kinds.length; i++) {
        var item = document.createElement("span");
        item.className = "tiling-key";
        var sw = document.createElement("i");
        sw.style.background = palette[fill[i]];
        item.appendChild(sw);
        item.appendChild(document.createTextNode(current.kinds[i]));
        els.legend.appendChild(item);
      }
    }
  }

  function rebuild(name, detail, keepView) {
    var spec = TILINGS[name];
    build(name, detail);
    if (spec.detail) spec.detail.value = detail;
    canvas.setAttribute("aria-label", spec.label + " tiling, " + current.tiles.length + " tiles. Drag to pan, pinch or scroll to zoom.");
    report();
    if (!keepView) fit();
    else { clampView(); schedule(); }
  }

  if (els.kind) {
    els.kind.addEventListener("change", function () {
      var name = els.kind.value;
      syncDetail(name);
      var spec = TILINGS[name].detail;
      rebuild(name, spec ? spec.value : 0, false);
      // #hat and friends make a particular tiling linkable, without adding a
      // history entry per fiddle with the control.
      if (window.history && history.replaceState) history.replaceState(null, "", "#" + name);
    });
  }
  if (els.detail) {
    var onDetail = function () {
      var spec = TILINGS[current.name].detail;
      if (!spec) return;
      var v = Number(els.detail.value);
      if (els.detailValue) els.detailValue.textContent = v;
      rebuild(current.name, v, true);
    };
    els.detail.addEventListener("input", onDetail);
    els.detail.addEventListener("change", onDetail);
  }
  if (els.reset) els.reset.addEventListener("click", fit);
  if (els.zoomIn) els.zoomIn.addEventListener("click", function () { zoomAt(1.4, cssW / 2, cssH / 2); });
  if (els.zoomOut) els.zoomOut.addEventListener("click", function () { zoomAt(1 / 1.4, cssW / 2, cssH / 2); });
  if (els.expand) {
    els.expand.addEventListener("click", function () {
      // A CSS overlay rather than the Fullscreen API, which iOS Safari does not
      // offer for elements.
      var on = wrap.classList.toggle("is-expanded");
      document.body.classList.toggle("tiling-locked", on);
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
  if (!TILINGS[start]) start = "penrose";
  if (els.kind) els.kind.value = start;

  readColors();
  resize();
  syncDetail(start);
  rebuild(start, TILINGS[start].detail ? TILINGS[start].detail.value : 0, false);
})();
