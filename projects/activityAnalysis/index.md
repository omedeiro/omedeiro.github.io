# Activity Analysis

GPS data processing and visualization for running activity analysis.

```{image} running_map.png
:alt: Running Route Analysis
:width: 100%
:align: center
```

Processes GPX files to generate route maps, pace analysis, and performance metrics using Python data science libraries.

## Features

- GPS route mapping with elevation profiles
- Pace analysis and performance trends
- Interactive visualizations with Plotly
- Geospatial data processing with GeoPandas

## Technologies

::::{grid} 3

:::{grid-item-card} Data Processing
- Python, Pandas, NumPy
- GPX file parsing
:::

:::{grid-item-card} Visualization  
- Matplotlib, Plotly, Seaborn
- Folium for mapping
:::

:::{grid-item-card} Geospatial
- GeoPandas, Shapely
- Haversine distance calculations
:::

::::

## Implementation

Calculates pace, elevation gain, and distance from GPX coordinates. Generates interactive route maps and performance charts.

```python
from activity_analyzer import GPSAnalyzer

analyzer = GPSAnalyzer('activity.gpx')
stats = analyzer.analyze_route()
analyzer.plot_route_map()
```

[![GitHub](https://img.shields.io/badge/GitHub-View_Source-black?style=for-the-badge&logo=github)](https://github.com/omedeiro/activityAnalysis)
