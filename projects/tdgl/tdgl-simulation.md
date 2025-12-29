---
title: TDGL Simulation
---

# TDGL Simulation

A sophisticated physics simulation tool implementing the Time-Dependent Ginzburg-Landau (TDGL) equations for studying superconducting materials and flux dynamics in type-II superconductors.

```{image} trapGif20211201T151612.gif
:alt: TDGL Vortex Dynamics Simulation
:width: 100%
:align: center
```

## Overview

This project implements a comprehensive numerical solver for the Time-Dependent Ginzburg-Landau equations, enabling detailed study of superconducting vortex dynamics, flux penetration, and magnetic field effects. The simulation provides insights into the fundamental physics of superconductivity and practical applications in superconducting device design.

## Getting Started

### Installation

```bash
git clone https://github.com/omedeiro/tdgl.git
cd tdgl
pip install -r requirements.txt
```

### Basic Simulation

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
## GitHub Repository

[![GitHub](https://img.shields.io/badge/GitHub-View_Source-black?style=for-the-badge&logo=github)](https://github.com/omedeiro/tdgl)


