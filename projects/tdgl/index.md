# TDGL Simulation

A sophisticated physics simulation tool implementing the Time-Dependent Ginzburg-Landau (TDGL) equations for studying superconducting materials and flux dynamics in type-II superconductors.

```{image} trapGif20211201T151612.gif
:alt: TDGL Vortex Dynamics Simulation
:width: 100%
:align: center
```

## Overview

This project implements a comprehensive numerical solver for the Time-Dependent Ginzburg-Landau equations, enabling detailed study of superconducting vortex dynamics, flux penetration, and magnetic field effects. The simulation provides insights into the fundamental physics of superconductivity and practical applications in superconducting device design.

## Physics Background

The Time-Dependent Ginzburg-Landau theory describes the dynamics of the superconducting order parameter in the presence of magnetic fields and currents. Key phenomena studied include:

### Superconducting Phenomena
- **Vortex Formation**: Nucleation and dynamics of Abrikosov vortices
- **Flux Penetration**: Magnetic field penetration into type-II superconductors
- **Critical Currents**: Calculation of critical current densities
- **Phase Transitions**: Analysis of normal-superconducting transitions

### Physical Parameters
- **Coherence Length**: Characteristic length scale of superconductivity
- **Penetration Depth**: Magnetic field decay length
- **Ginzburg-Landau Parameter**: Material-specific coupling constant
- **Temperature Dependence**: Thermal effects on superconducting properties

## Technologies Used

::::{grid} 3

:::{grid-item-card} Numerical Methods
- **Python**: Primary programming language
- **NumPy**: Array operations and linear algebra
- **SciPy**: Advanced numerical algorithms
- **Finite Differences**: Spatial discretization
:::

:::{grid-item-card} Visualization
- **Matplotlib**: Scientific plotting and animation
- **VTK**: Advanced 3D visualization
- **PIL**: Image processing
- **FFmpeg**: Video generation
:::

:::{grid-item-card} Computational Physics
- **Runge-Kutta**: Time integration methods
- **Sparse Matrices**: Efficient linear algebra
- **Parallel Computing**: Multi-core optimization
- **Boundary Conditions**: Physical constraint implementation
:::

::::

## Key Features

### 🔬 Physics Simulation
- Full TDGL equation implementation
- Magnetic field coupling
- Temperature-dependent parameters
- Realistic material properties

### ⚡ Numerical Performance
- Optimized finite difference schemes
- Adaptive time stepping
- Parallel computation support
- Memory-efficient algorithms

### 📊 Visualization Tools
- Real-time simulation display
- Vortex tracking and analysis
- Magnetic field visualization
- Order parameter dynamics

### 📈 Analysis Capabilities
- Critical field calculations
- Vortex velocity measurements
- Energy landscape analysis
- Statistical mechanics studies

## Mathematical Foundation

The TDGL equations are given by:

```{math}
\frac{\partial \psi}{\partial t} = \alpha \psi + \beta |\psi|^2 \psi + \gamma \nabla^2 \psi

\frac{\partial \mathbf{A}}{\partial t} = -\nabla \times \mathbf{B} + \sigma (\mathbf{J}_s + \mathbf{J}_{ext})
```

Where:
- ψ is the superconducting order parameter
- A is the vector potential
- B is the magnetic field
- J_s is the supercurrent density

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

## Simulation Examples

### Vortex Lattice Formation
Study the self-organization of vortices in a periodic magnetic field:
- Regular triangular lattice formation
- Defect dynamics and healing
- Temperature-dependent stability
- Critical field measurements

### Flux Dynamics
Analyze the motion of magnetic flux in superconductors:
- Flux creep and flow
- Pinning center interactions
- Critical current determination
- Dynamic instabilities

## Research Applications

### Academic Research
- Fundamental studies of superconductivity
- Vortex matter phase diagrams
- Critical phenomena investigations
- Theoretical model validation

### Practical Applications
- Superconducting magnet design
- Power transmission optimization
- Quantum device development
- Material property prediction

## GitHub Repository

[![GitHub](https://img.shields.io/badge/GitHub-View_Source-black?style=for-the-badge&logo=github)](https://github.com/omedeiro/tdgl)

## Key Technical Achievements

- **Numerical Stability**: Robust algorithms for long-time evolution
- **Physical Accuracy**: Faithful representation of superconducting physics
- **Computational Efficiency**: Optimized for large-scale simulations
- **Visualization Quality**: Publication-ready graphics and animations
- **Modular Design**: Extensible framework for new physics

## Publications & Results

This simulation code has contributed to:
- Understanding of vortex dynamics in engineered landscapes
- Critical current calculations in practical geometries
- Phase diagram mapping of superconducting transitions
- Validation of theoretical predictions

## Future Development

- GPU acceleration for larger systems
- Machine learning integration for parameter optimization
- Three-dimensional simulation capabilities
- Multi-physics coupling (thermal, mechanical)
- Real-time experimental comparison tools
