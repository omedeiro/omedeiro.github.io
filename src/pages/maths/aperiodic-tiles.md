---
layout: ../../layouts/Md.astro
title: Aperiodic Tiles
description: An interactive builder for Penrose, Ammann–Beenker and hat tilings, with pan and zoom.
---

A set of tiles is *aperiodic* if it can cover the plane but can never do so periodically —
no translation maps the tiling onto itself. Copies of a single square tile the plane in a way
that repeats; Penrose's two rhombs cover it in a way that never does. The tiles below are all
of that second kind.

Pick a tiling, set how far to build it, then drag to pan and pinch or scroll to zoom.

<figure class="tiling">
  <div class="tiling-stage">
    <canvas id="tiling-app" tabindex="0" role="img" aria-label="Aperiodic tiling"></canvas>
    <div class="tiling-zoom">
      <button type="button" data-role="zoom-in" aria-label="Zoom in">+</button>
      <button type="button" data-role="zoom-out" aria-label="Zoom out">−</button>
    </div>
  </div>
  <div class="tiling-controls">
    <label class="tiling-field">
      <span>Tiling</span>
      <select data-role="kind">
        <option value="penrose">Penrose rhombs</option>
        <option value="ammann">Ammann–Beenker</option>
        <option value="hat">The hat</option>
      </select>
    </label>
    <label class="tiling-field">
      <span data-role="detail-label">Substitution steps</span>
      <input type="range" data-role="detail" min="1" max="8" value="5" />
      <output data-role="detail-value">5</output>
    </label>
    <div class="tiling-field tiling-buttons">
      <button type="button" data-role="reset">Fit</button>
      <button type="button" data-role="expand" aria-pressed="false">Expand</button>
    </div>
  </div>
  <figcaption>
    <span data-role="count"></span>
    <span class="tiling-legend" data-role="legend"></span>
    <noscript>The builder needs JavaScript; the rest of the page does not.</noscript>
  </figcaption>
</figure>

Drag to pan, pinch or scroll to zoom, double-tap to zoom in. With the canvas focused, the
arrow keys pan, `+` and `−` zoom and `0` refits. **Expand** fills the screen; `Esc` leaves it.

## Substitution: Penrose rhombs

The P3 Penrose tiling uses two rhombs with equal sides: a thin one with angles $36°$ and
$144°$, and a fat one with $72°$ and $108°$. Cut each along a diagonal and you get the two
Robinson triangles — the golden triangle ($36°$-$72°$-$72°$) and the golden gnomon
($36°$-$36°$-$108°$), both named for the ratio $\varphi = (1+\sqrt5)/2$ between their sides.

Each triangle subdivides into smaller copies of the same two shapes, scaled by $1/\varphi$.
The areas leave no choice about the counts: a golden triangle can only be rebuilt from one
small triangle and one small gnomon, and a gnomon only from one triangle and two gnomons.
Repeating that subdivision from a ten-triangle seed is the entire generator — a dozen lines
of arithmetic, no matching rules and no backtracking. Mirror-image halves meet along their
shared base, so the halves are glued back into whole rhombs before drawing.

The substitution matrix $\begin{pmatrix}1 & 1\\ 1 & 2\end{pmatrix}$ has largest eigenvalue
$\varphi^2$ and eigenvector $(1, \varphi)$: as you add steps, the number of fat rhombs
approaches $\varphi$ times the number of thin ones. Because $\varphi$ is irrational the two
counts share no common measure, which is the quick argument for why the tiling cannot repeat.

## Cut and project: Ammann–Beenker

The Ammann–Beenker tiling uses a square and a $45°$ rhomb, and comes from a different idea
entirely. Take the integer lattice $\mathbb{Z}^4$ and split $\mathbb{R}^4$ into two planes: a
physical one, where $e_j \mapsto (\cos j\pi/4,\ \sin j\pi/4)$, and an internal one, where
$e_j \mapsto (\cos 3j\pi/4,\ \sin 3j\pi/4)$. Keep only the lattice points whose internal image
lands inside the shadow of the unit hypercube — a regular octagon — and project what survives
onto the physical plane.

Those survivors are the tiling's vertices, and every unit square of $\mathbb{Z}^4$ with all
four corners accepted projects to a tile. Two lattice directions two steps apart in the
eight-fold star meet at $90°$ and give a square; adjacent ones meet at $45°$ and give a rhomb.
The generator floods outward from the origin one lattice step at a time, so it only ever
touches points it keeps.

Irrationality enters here as a slope rather than as a ratio. The physical plane sits at an
irrational angle to the lattice, so no lattice translation survives the projection, and the
tiling inherits an eight-fold symmetry that no periodic tiling is allowed to have.

## One tile: the hat

Both tilings above need two tiles. Whether one tile could do the job — the *einstein*
problem, from *ein Stein*, one stone — stayed open until March 2023, when David Smith, Joseph
Samuel Myers, Craig Kaplan and Chaim Goodman-Strauss found the *hat*: a 13-sided polygon that
tiles the plane, and never periodically. It is eight kites of the deltoidal trihexagonal
tiling glued together, and its interior angles are all drawn from $\{90°, 120°, 240°, 270°\}$.

The hat needs reflections. Both handednesses appear in every hat tiling, and the rarer one is
rare in a precise way: the limiting ratio of reflected to unreflected tiles is
$1 : \varphi^4$, so about one tile in eight is a mirror image. The patch here holds 475 tiles,
61 of them reflected — $12.8\%$, against a limit of $1/(1+\varphi^4) = 12.7\%$. The same
golden ratio that runs through the Penrose tiling turns up in a tiling with no five-fold
symmetry anywhere in it.

### Finding it by search

The hat on this page was not copied out of the paper; it was re-derived, and the derivation is
short enough to describe. Every 8-kite patch of the kite grid was enumerated — 10,209 of them
up to translation — and cut down to the 341 whose outline is a simple 13-gon. Each of those
was handed to an exact-cover solver and asked to fill a disc: 90 managed one of radius 5, 14
managed radius 12, and nine managed radius 30. Of those nine, seven tile with one handedness
alone and two mix the reflections about evenly. Exactly one mixes them in the ratio
$1 : \varphi^4$, and that one is the hat. The whole search runs in about eight seconds — the
[script](/maths/hat-search.mjs) is linked at the foot of the page.

The hat is also the one tiling here that is not generated live. Penrose and Ammann–Beenker
have generators that produce as much tiling as you ask for. The hat's aperiodicity proof runs
instead through a hierarchy of four *metatiles*, and without that hierarchy, building a patch
is an exact-cover problem that grows exponentially. Radius 36 fell in $6 \times 10^7$ search
nodes; radius 44 took three random restarts and $8.8 \times 10^8$; four restarts at radius 50
each gave up after $2.5 \times 10^9$. The patch shipped with the page is that radius-44
result, found offline and stored as one line per tile — a translation, a rotation in sixths of
a turn, and a reflection flag.

## Notes on the viewer

Rendering is plain canvas 2D. Tiles are batched into one path per tile type, so the whole
patch is two fills and two strokes rather than tens of thousands of draw calls, and tiles
outside the viewport are skipped by a bounding-box test. Outlines fade out below about two and
a half pixels per tile edge, where drawing them would turn the patch into a solid block of ink.
Pointer events cover mouse, trackpad and touch through the same code path: a two-finger pinch
reads the change in spread between the pointers, and a flick leaves a short glide behind it.

**[Download the viewer source](/maths/aperiodic-tiles.js)** ·
**[Download the hat search](/maths/hat-search.mjs)**

<script defer src="/maths/aperiodic-tiles.js"></script>
