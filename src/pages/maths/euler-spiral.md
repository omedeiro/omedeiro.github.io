---
layout: ../../layouts/Md.astro
title: Euler Spiral
description: An interactive Euler spiral — the Fresnel integrals, the same curve walked out a step at a time, and the transition curve roads and railways are built from.
---

Curvature is how hard a curve bends: the reciprocal of the radius of the circle that hugs it
at a point. A straight line has curvature $0$, a circle of radius $R$ has curvature $1/R$
everywhere along it, and joining the two directly means jumping from one to the other with
nothing in between. The Euler spiral is what fills the gap — the curve whose curvature grows
in exact proportion to the distance travelled along it.

Pick a construction, then drag to pan and pinch or scroll to zoom.

<figure class="euler">
  <div class="euler-stage">
    <canvas id="euler-app" tabindex="0" role="img" aria-label="Euler spiral"></canvas>
    <div class="euler-zoom">
      <button type="button" data-role="zoom-in" aria-label="Zoom in">+</button>
      <button type="button" data-role="zoom-out" aria-label="Zoom out">−</button>
    </div>
  </div>
  <div class="euler-controls">
    <label class="euler-field">
      <span>Construction</span>
      <select data-role="kind">
        <option value="fresnel">Fresnel integrals</option>
        <option value="turtle">Turning by hand</option>
        <option value="transition">Road transition</option>
      </select>
    </label>
    <label class="euler-field">
      <span data-role="label-a">Arc length</span>
      <input type="range" data-role="param-a" min="0.5" max="8" step="0.1" value="4" />
      <output data-role="value-a">4.0</output>
    </label>
    <label class="euler-field">
      <span data-role="label-b">Steps</span>
      <input type="range" data-role="param-b" min="60" max="2400" step="20" value="720" />
      <output data-role="value-b">720</output>
    </label>
    <div class="euler-field euler-buttons">
      <button type="button" data-role="play" aria-pressed="false">Trace</button>
      <button type="button" data-role="reset">Fit</button>
      <button type="button" data-role="expand" aria-pressed="false">Expand</button>
    </div>
  </div>
  <figcaption>
    <span class="euler-readout" data-role="readout"></span>
    <span class="euler-legend" data-role="legend"></span>
    <noscript>The viewer needs JavaScript; the rest of the page does not.</noscript>
  </figcaption>
</figure>

**Trace** walks a point along the curve with the circle that matches its curvature at that
moment — watching that circle shrink at a steady rate is the whole definition, made visible.
The strip under the plot is $\kappa$ against $s$: a straight line for the spiral itself, and a
ramp against a step for the road transition. With the canvas focused, the arrow keys pan,
`+` and `−` zoom and `0` refits.
**Expand** fills the screen; `Esc` leaves it.

## Curvature proportional to distance

The spiral is defined by the Fresnel integrals:

$$
x(t) = \int_0^t \cos\left(\frac{\pi u^2}{2}\right) du
$$

$$
y(t) = \int_0^t \sin\left(\frac{\pi u^2}{2}\right) du
$$

The integrand has modulus $1$, so the curve is traced at unit speed and the parameter $t$ *is*
arc length. That is what makes the rest fall out in one line: the tangent points along
$(\cos \pi s^2/2,\ \sin \pi s^2/2)$, so the tangent angle is $\varphi(s) = \pi s^2 / 2$, and
the curvature is its derivative,

$$
\kappa(s) = \frac{d\varphi}{ds} = \pi s.
$$

Straight at the origin, and bending harder the further you go, without limit. After $n$ full
turns of the tangent the curve has covered an arc length of $2\sqrt n$ and its osculating
circle is down to a radius of $1/2\pi\sqrt n$, so the coils crowd in on themselves while the
two branches wind onto the points $\pm(\tfrac12, \tfrac12)$ without ever reaching them. Euler
described the curve in 1744; the limit points took him until 1781.

The same spiral turns up in optics, where it is usually named after Cornu. Arc length along
it is distance across an aperture, each sample contributes a phase $\pi s^2/2$ picked up on
the way to the screen, and the straight line joining two points of the spiral is the amplitude
arriving from the strip of aperture between them. The tight coils at the ends are why the edge
of a shadow is a set of fringes rather than a step.

## Turning by hand

The curve can also be walked out, with no integral anywhere. Take unit steps, and before step
$i$ turn by $i\theta$:

- after $i$ steps the heading is $\theta \cdot i(i+1)/2$,
- and the distance covered is $i$,

so the turn per unit distance is about $\theta i$ — linear in arc length, which is the
definition again. It is Euler's method applied to $\varphi' = \kappa$ with a step of one:
matching headings puts the walk at arc length $s = i\sqrt{\theta/\pi}$ on the curve above, so
it is the Fresnel spiral drawn $\sqrt{\pi/\theta}$ times larger, converging on it as
$\theta \to 0$. This page used to carry a dozen lines of MATLAB doing exactly that, and a
still of the result; the two sliders now run the same loop as you move them.

Turn $\theta$ up and the spiral stops being a spiral. Headings are only ever multiples of
$\theta$, so when $\theta$ is a rational multiple of $360°$ — say $\theta = 360°p/q$ — the
heading sequence repeats with period $2q$, because
$i(i+1)/2$ advances by a multiple of $q$ over that many steps. A repeating sequence of
headings means a repeating sequence of steps, so the walk copies one shape forever, and when
that period's steps cancel — which they do at every $\theta$ I have tried — the shape closes
into a rosette. Every rational $\theta$ is therefore a resonance, but most of the periods are
far too long to see: $\theta = 2°$ closes after 360 steps, $\theta = 2.01°$ after 24,000, and
the slider stops at 2,400.

## What it is for

A curve made of a straight and a circular arc has a step change in curvature at the join. For
anything travelling along it at speed $v$, lateral acceleration is $v^2\kappa$, so a step in
curvature is a step in sideways force — acquired instantaneously, in theory, and in practice
by the vehicle sliding, the passengers lurching, and the track wearing at one spot.

Slot an Euler spiral in between and the curvature ramps instead of jumping. Over a transition
of length $L$ into an arc of radius $R$,

$$
\kappa(s) = \frac{s}{RL}, \quad \varphi(s) = \frac{s^2}{2RL}, \quad A = \sqrt{RL},
$$

where $A$ is the clothoid parameter that fixes the scale, and the spiral turns through
$\varphi(L) = L/2R$ before the arc takes over. At constant speed the lateral acceleration now
climbs linearly with time, so its rate of change — the jerk $v^3/RL$ — is *constant*, and
bounding that number is what actually sets $L$ in a design standard. On a railway the cant is
ramped along the same length, for the same reason.

There is a geometric price, and the viewer draws it. Both curves in that mode run between the
same two straights — which is how the choice actually presents itself, since the straights are
fixed by where the road has to go and only the corner is up for negotiation — meeting at a
deflection $\Delta$. The plain curve of radius $R$ touches both straights. The transitioned one
cannot: it has to hold the same arc clear of them by

$$
p = \frac{L^2}{24R},
$$

and start into the corner earlier by about $L/2$, to leave room for the spirals. Those two
gaps are the whole difference between the curves on screen, and the readout gives both, with
the approximation above alongside the offset the geometry actually produces. Push the
transition length to its maximum and the circular arc vanishes entirely: the corner becomes
two spirals meeting nose to nose, each turning through $\Delta/2$.

The curve is also the one a driver produces anyway — turning a steering wheel at a constant
rate while holding speed traces a clothoid — which is why it fits the problem so exactly.
Talbot worked it into railway practice in *The Railway Transition Spiral*, and the same shape
is used for the vertical loops on roller coasters, where the point is to cap the peak
acceleration rather than the jerk, and in font and vector-drawing tools, where a spline with
piecewise-linear curvature is about the smoothest thing a curve can do.

## Notes on the viewer

Curves are sampled by how far the tangent has turned, not by even steps of the parameter. The
phase in the Fresnel integrals grows quadratically, so a step fine enough for the coils at
$s = 8$ takes twenty-five times the samples per unit length that the straight middle needs,
and one coarse enough for the middle cuts the coils into visible polygons; stepping so that
the heading advances by a fiftieth of a radian each time spends the samples where the bending
is. The integral itself is the midpoint rule, and lands within $2 \times 10^{-5}$ of tabulated
values of $C(t)$ and $S(t)$ — four decimal places — for every range the slider offers.

Each sample carries its own signed curvature, in closed form, rather than having it
differenced back out of the polyline afterwards — the strip plots that array directly. The
transition alignment is assembled from three primitives (straight, arc, spiral), each
advancing a running position, heading and arc length, so the pieces meet with matching
tangents by construction rather than by fitting.

Rendering is plain canvas 2D. Pointer events cover mouse, trackpad and touch through the same
code path: a two-finger pinch reads the change in spread between the pointers, and a flick
leaves a short glide behind it. The centre of the view is clamped to stay over the curve,
since one determined scroll otherwise leaves a blank canvas with no clue which way to come
back.

**[Download the viewer source](/maths/euler-spiral.js)**

<script defer src="/maths/euler-spiral.js"></script>
