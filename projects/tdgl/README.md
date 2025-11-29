# TDGL - Time-Dependent Ginzburg-Landau Simulation

## Overview
A sophisticated physics simulation tool implementing the Time-Dependent Ginzburg-Landau (TDGL) equations for studying superconducting materials and flux dynamics. This project simulates vortex behavior in superconductors under various conditions.

## Technologies Used
- Python
- NumPy/SciPy (numerical computations)
- Matplotlib (visualization)
- Computational Physics
- Parallel Computing
- Scientific Computing

## Features
- **TDGL Equation Solver**: Numerical implementation of time-dependent equations
- **Vortex Dynamics**: Simulation of superconducting vortex motion
- **Magnetic Field Effects**: Analysis of flux penetration and dynamics
- **Real-time Visualization**: Animated simulations showing temporal evolution
- **Parameter Sweeping**: Systematic analysis across different physical parameters

## Screenshots
![TDGL Simulation](trapGif20211201T151612.gif)
*Real-time visualization of vortex dynamics in a superconducting trap*

## Installation & Usage
```bash
git clone https://github.com/omedeiro/tdgl.git
cd tdgl
pip install -r requirements.txt
python tdgl_simulation.py --config config.json
```

## Physics Background
The Time-Dependent Ginzburg-Landau equations describe the dynamics of superconducting order parameters, allowing for the study of:
- Vortex nucleation and annihilation
- Flux dynamics in type-II superconductors
- Critical current calculations
- Phase transitions in superconducting materials

## Key Results
- Accurate simulation of vortex lattice formation
- Analysis of critical fields and currents
- Study of flux pinning mechanisms
- Investigation of dynamic instabilities

## GitHub Repository
[View Source Code](https://github.com/omedeiro/tdgl)

## Technical Implementation
- Finite difference methods for spatial discretization
- Runge-Kutta integration for time evolution
- Optimized algorithms for large-scale simulations
- Parallel processing for performance enhancement

## Applications
- Superconducting device design
- Material property prediction
- Academic research in condensed matter physics
- Educational demonstrations of superconductivity
