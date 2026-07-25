---
layout: ../../layouts/Md.astro
title: TDGL Simulation
---

A physics simulation tool implementing the Time-Dependent Ginzburg–Landau (TDGL) equations for studying superconducting materials and flux dynamics in type-II superconductors.

![TDGL vortex dynamics simulation](/projects/tdgl/trapGif20211201T151612.gif)

<figure>
  <img src="/projects/tdgl/tdgl-evolution.gif" alt="TDGL order parameter and magnetic field time evolution" style="width: 50%; display: block; margin: 0 auto;" />
  <figcaption>Time evolution of a type-II superconductor under a 0.6 mT applied field in the z-direction, turned off at t=65. Top: 2D color map of the order parameter. Bottom: 2D color map of the z-component of the magnetic field.</figcaption>
</figure>

## Overview

This project implements a numerical solver for the Time-Dependent Ginzburg–Landau equations, enabling detailed study of superconducting vortex dynamics, flux penetration, and magnetic field effects. The simulation provides insights into the fundamental physics of superconductivity and practical applications in superconducting device design.

## Getting started

### Installation

```bash
git clone https://github.com/omedeiro/tdgl.git
cd tdgl
pip install -r requirements.txt
```

### Basic simulation

```python
import numpy as np
from tdgl_solver import TDGLSolver

# Initialize simulation parameters
params = {
    'alpha': -1.0,
    'beta': 1.0,
    'gamma': 1.0,
    'grid_size': (128, 128),
    'dt': 0.01
}

# Create solver instance
solver = TDGLSolver(params)

# Run simulation
results = solver.evolve(time_steps=1000)

# Visualize results
solver.plot_order_parameter()
solver.animate_vortex_dynamics()
```

## Source

[github.com/omedeiro/simulation6336](https://github.com/omedeiro/simulation6336)
