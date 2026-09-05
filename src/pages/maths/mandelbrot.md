---
layout: ../../layouts/Md.astro
title: Mandelbrot Set
description: An interactive Mandelbrot and Julia set viewer — smooth escape time, Julia sets picked live off the parameter plane, and orbits you can watch settle.
---

Nobody drew the Mandelbrot set. It is the answer to one question, asked once for every
point of the plane: start at $z_0 = 0$, apply

$$
z_{n+1} = z_n^2 + c
$$

forever, and ask whether the numbers stay bounded. The set is the collection of $c$ for
which they do. Everything on the screen comes out of that line — the cardioid, the discs
bolted onto it, the antenna along the negative axis, the filaments, and the copies of the
whole thing buried in the filaments.

Drag to pan, pinch or scroll to zoom; double-click to zoom in on a point.

<figure class="mandel">
  <div class="mandel-stage">
    <canvas id="mandel-app" tabindex="0" role="img" aria-label="Mandelbrot set"></canvas>
    <div class="mandel-zoom">
      <button type="button" data-role="zoom-in" aria-label="Zoom in">+</button>
      <button type="button" data-role="zoom-out" aria-label="Zoom out">−</button>
    </div>
  </div>
  <div class="mandel-controls">
    <label class="mandel-field">
      <span>Plane</span>
      <select data-role="kind">
        <option value="mandelbrot">Mandelbrot</option>
        <option value="julia">Julia</option>
      </select>
    </label>
    <label class="mandel-field">
      <span>Iterations</span>
      <input type="range" data-role="param-a" min="50" max="4000" step="50" value="500" />
      <output data-role="value-a">500</output>
    </label>
    <label class="mandel-field">
      <span>Colour period</span>
      <input type="range" data-role="param-b" min="4" max="120" step="1" value="16" />
      <output data-role="value-b">16</output>
    </label>
    <div class="mandel-field mandel-buttons">
      <button type="button" data-role="orbit" aria-pressed="false">Orbit</button>
      <button type="button" data-role="reset">Fit</button>
      <button type="button" data-role="expand" aria-pressed="false">Expand</button>
    </div>
  </div>
  <figcaption>
    <span class="mandel-readout" data-role="readout"></span>
    <noscript>The viewer needs JavaScript; the rest of the page does not.</noscript>
  </figcaption>
</figure>

**Orbit** follows the pointer and draws the sequence $z_0, z_1, z_2, \dots$ for the point
under it, then reports what it settles on. **Plane** switches between the two pictures below,
taking $c$ from wherever the Mandelbrot view is centred; in Julia mode the inset is the
parameter plane in miniature, and dragging its marker moves $c$ live. With the canvas
focused, the arrow keys pan, `+` and `−` zoom and `0` refits. **Expand** fills the screen;
`Esc` leaves it. The address bar records the mode, centre and magnification, so a view you
find is a link.

## Two is the whole test

Whether a sequence stays bounded forever sounds like something no finite computation can
decide. For this one it nearly is: a single step with $|z_n| > 2$ already proves escape.

Suppose $|c| \le 2$ and some $|z_n| = 2 + \delta$ with $\delta > 0$. Then

$$
|z_{n+1}| \ge |z_n|^2 - |c| \ge (2 + \delta)^2 - 2 = 2 + 4\delta + \delta^2,
$$

so the excess over $2$ more than quadruples at every step and the orbit runs away. If
instead $|c| > 2$ then $z_1 = c$ is already outside, and
$|z_{n+1}| \ge |z_n|^2 - |c| \ge |z_n|(|z_n| - 1) > |z_n|$ keeps it there. Either way the
orbit of $0$ is bounded exactly when it never crosses the circle of radius $2$, and $M$
itself sits inside the closed disc of radius $2$.

That turns an infinite question into a finite one at every pixel that escapes — and settles
nothing at all about the ones that do not. For those you iterate to whatever budget the
slider allows and then give up, which is why the black in any of these pictures means *not
yet proved to escape* rather than *proved to stay*. Push the iteration slider up in a
filament and watch some of the black turn out to be thin.

## Colouring by when, not whether

Colour the outside by how long it took to cross, and the escape time is an integer, so the
picture comes out in hard bands. The fix is to overshoot deliberately. Iterate to a generous
radius $R$ — this viewer uses $R = 256$ — and record where the orbit actually landed, because
how far past $R$ it went says where between $n - 1$ and $n$ the real crossing was:

$$
\nu = n - \log_2 \frac{\ln |z_n|}{\ln R}.
$$

Land exactly on the circle and $\nu = n$. Overshoot all the way to $R^2$, the modulus one more
squaring would have produced, and $\nu = n - 1$ — the count the previous step would have
given. Since $|z_{n+1}| \approx |z_n|^2$ out there, the two agree wherever they meet, and the
bands close up.

There is a reason it works so cleanly. Writing $G(c) = \lim_{n} \log|z_n| / 2^n$ for the
escape rate — the Green's function of the complement of $M$ — the definition rearranges to

$$
\nu = \log_2 \ln R - \log_2 G(c),
$$

so up to an additive constant $\nu$ *is* $-\log_2$ of a genuine potential. The colour bands
are its level sets, and each one is a halving of the escape rate. Nothing about them depends
on $R$ beyond that constant, which is worth checking rather than assuming: at $R = 256$ the
two agree to about $4 \times 10^{-6}$, while at $R = 4$ the error is $0.07$ — enough to see
the bands breathe.

## Julia sets, and what the Mandelbrot set indexes

Swap what varies. Fix one $c$, let $z_0$ range over the plane instead, and apply the same
escape test: that picture is the filled Julia set $K_c$ of that one map — the starting points
whose orbits stay bounded.

The two pictures are locked together by a dichotomy with no third case. $K_c$ is connected if
the orbit of the critical point $0$ is bounded, and otherwise it is totally disconnected: a
Cantor dust, no interior, no piece joined to any other. But "the orbit of $0$ is bounded" is
the definition of $c \in M$, so the Mandelbrot set is exactly the set of $c$ whose Julia set
is connected. It is a catalogue, one entry per parameter, of which of the two you get.

Switch the viewer to **Julia** and the inset appears: the parameter plane in miniature with a
marker on the current $c$. Drag the marker across the boundary and the set shatters — one
connected piece inside, dust a hair's breadth outside. It starts on Douady's rabbit,
$c \approx -0.1226 + 0.7449i$, the centre of the period-3 bulb.

## The bulbs are counting

The interior of $M$ is where an attracting cycle exists. The main cardioid is the $c$ for
which $z^2 + c$ has an attracting *fixed* point: solve $z = z^2 + c$ and require the
multiplier $|2z| < 1$, then parameterise $2z = e^{i\theta}$ to get the boundary

$$
c(\theta) = \frac{e^{i\theta}}{2} - \frac{e^{2i\theta}}{4},
$$

which is a cardioid. The disc bolted to its left, $|c + 1| < \tfrac14$, is where that fixed
point has gone unstable and a 2-cycle has taken over.

Every other bulb hangs off the point of the cardioid where the multiplier is a root of unity
$e^{2\pi i p/q}$, and inside it the attracting cycle has period $q$. Turn on **Orbit** and
hover: the viewer runs the orbit, lets it settle, and reports the period it lands on. The big
disc gives 2, the round bulbs above and below give 3, and from there Devaney's observation is
visible directly — the antenna growing out of the $p/q$ bulb has $q$ spokes.

In Mandelbrot mode that overlay takes a liberty. The orbit lives in the dynamical plane and
the picture underneath is the parameter plane, so where the orbit falls relative to the black
means nothing; only the point you picked is a $c$. Switch to Julia and the same drawing is
honest, because there the plane on screen is the one the orbit moves in.

## What the boundary is like

Douady and Hubbard proved in 1982 that $M$ is connected: however thin the filaments get, they
are attached, and nothing floats free. Shishikura proved in 1998 that its boundary has
Hausdorff dimension $2$ — the dimension of the plane itself — which is the precise reason
every zoom finds more structure and never bottoms out. The area is known only numerically:
pixel counting puts it near $1.5065$, there is no closed form, and the best proved upper
bounds are still some way above the measured value.

The small copies of the whole set scattered through the filaments are not artefacts and not
quite coincidences. They come from renormalisation: within those regions some iterate of the
map, restricted to a small disc, behaves like a quadratic map all over again, and Douady and
Hubbard's theory of polynomial-like maps says such a thing carries its own copy of $M$. The
copies are the set genuinely recurring — never identically, since each is decorated
differently by the filaments it sits in.

The first picture of it was a rough plot by Brooks and Matelski in 1978, made while studying
Kleinian groups; Mandelbrot's own images followed in 1980.

## Notes on the viewer

The image is built by progressive refinement — a grid of 16×16 blocks first, then 8, 4, 2, 1,
each pass computing only the pixels the previous one skipped. Those passes cost
$\tfrac{1}{256} + \tfrac{3}{256} + \tfrac{12}{256} + \tfrac{48}{256} + \tfrac{192}{256}$ of a
full image, which is exactly one image, so the coarse preview is free rather than paid for.
The work is then sliced across frames on a time budget, so a drag stays responsive at any
iteration count, and while a gesture is running the last finished image is blitted under the
new transform instead of being recomputed — the arithmetic starts once the gesture stops.

Interior points are the expensive ones: they cost the entire iteration budget, since nothing
short of running out proves an orbit bounded. Three shortcuts take most of that back. The main
cardioid and the period-2 disc are the two pieces of the interior with closed forms, and both
are tested algebraically before any iteration. Everything else the two tests miss — the
filaments of the interior, the small copies — is caught by period checking: hold a reference
point, refresh it at powers of two, and declare the point interior as soon as the orbit comes
back to it. Over 200,000 random parameters at a budget of 6,000 iterations the shortcuts and
plain iteration disagree nowhere.

Arithmetic is double precision throughout, and the zoom stops at $\times 10^{14}$ because
that is where doubles stop carrying the picture. Near $c \approx -0.74$ consecutive
representable numbers are about $1.6 \times 10^{-16}$ apart. A pixel is $5 \times 10^{-16}$
wide at $\times 10^{13}$ — four distinct values across it, and the image is clean;
$5 \times 10^{-17}$ at $\times 10^{14}$, where neighbours start landing on the same number
and the fine structure goes grainy; and $5 \times 10^{-18}$ at $\times 10^{15}$, where whole
rows of pixels collapse onto one value and the view is bands of noise. The readout says when
you are into that range. Getting past it means perturbation methods — one orbit computed in
high precision, and a series in the small differences for every other pixel — which is what
deep-zoom software does and this viewer does not.

Colours come from five stops defined in the site's stylesheet, baked into a 2,048-entry
lookup table and cycled by $\nu$, so the drawing follows the light and dark palettes without
repeating them in JavaScript.

**[Download the viewer source](/maths/mandelbrot.js)**

<script defer src="/maths/mandelbrot.js"></script>
