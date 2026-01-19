# Euler Spiral

The Euler spiral, also known as a clothoid or Cornu spiral, is a mathematical curve whose curvature changes linearly with arc length. It was first studied by Leonhard Euler and later by Marie Alfred Cornu in the context of optics.

## Mathematical Definition

The Euler spiral is defined parametrically by the Fresnel integrals:

$$x(t) = \int_0^t \cos\left(\frac{\pi u^2}{2}\right) du$$

$$y(t) = \int_0^t \sin\left(\frac{\pi u^2}{2}\right) du$$

The key property is that the curvature κ(s) = s, where s is the arc length parameter.

## Properties

- **Linear curvature**: The curvature increases linearly with arc length
- **Spiral behavior**: The curve spirals inward with decreasing radius
- **Symmetry**: The curve has rotational symmetry about its center
- **Asymptotic convergence**: Both branches converge to specific points as t → ∞

## Applications

Euler spirals have practical applications in:

- **Road design**: Smooth transitions between straight sections and circular curves
- **Railroad engineering**: Gentle acceleration changes for passenger comfort  
- **Optics**: Fresnel diffraction patterns and wave propagation
- **Computer graphics**: Smooth curve interpolation and path planning

## MATLAB Simulation

This simulation demonstrates the spiral's formation through incremental construction:

```matlab
close all

theta = 1.01; % Angular increment (make small changes for smoother curves)

point1 = [0 0];  % Starting point
length = 360*2;  % Number of iterations
rad0 = 0;        % Initial angle

x = zeros(length,1);
y = zeros(length,1);

for i = 2:length
    % Increment angle based on position (creates linear curvature change)
    rad1 = rad0 + (i*theta)*pi/180;

    % Calculate next point
    point2 = point1 + [cos(rad1) sin(rad1)];
    
    % Store coordinates
    x(i) = point2(1);
    y(i) = point2(2);

    % Update for next iteration
    point1 = point2;
    rad0 = rad1;
    
    % Plot the evolving spiral
    plot(x, y, 'k-')
    axis equal
    axis off
    % Uncomment for animation:
    % drawnow 
    % pause(0.1)
end
```

## Visualization

```{figure} /projects/maths/euler_spiral/euler.pdf
:name: euler-spiral-plot
:width: 80%

The Euler spiral showing the characteristic inward spiraling pattern with linearly increasing curvature. The curve starts straight and gradually curves more tightly as it progresses.
```

## Variations

The parameter θ in the simulation controls the tightness of the spiral:
- Smaller values create tighter spirals with more rotations
- Larger values create looser spirals with fewer rotations
- The relationship between θ and final spiral characteristics is nonlinear

**[Download MATLAB Code](euler_spiral/euler_spiral.m)**
