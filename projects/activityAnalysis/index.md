# Activity Analysis

A comprehensive GPS-based activity analysis tool that processes and visualizes fitness data to provide insights into running patterns, performance trends, and geographical activity mapping.

```{image} running_map.png
:alt: Running Route Analysis
:width: 100%
:align: center
```

## Overview

The Activity Analysis project transforms raw GPS tracking data into meaningful insights about physical activities. Using Python's powerful data science libraries, this tool analyzes running routes, performance metrics, and geographical patterns to help users understand and improve their fitness activities.

## Key Features

### 🗺️ GPS Route Mapping
- Interactive route visualization on maps
- Elevation profile analysis
- Distance and pace calculations
- Geographic activity distribution

### 📊 Performance Analytics
- Pace analysis over time and distance
- Heart rate zone analysis (when available)
- Split time calculations
- Performance trend identification

### 🏃‍♂️ Activity Insights
- Route comparison and optimization
- Personal best tracking
- Training load analysis
- Activity pattern recognition

### 📈 Data Visualization
- Interactive Plotly charts
- Geographical heatmaps
- Time series analysis
- Statistical summaries

## Technologies Used

::::{grid} 3

:::{grid-item-card} Data Processing
- **Python**: Core programming language
- **Pandas**: Data manipulation and analysis
- **NumPy**: Numerical computations
- **GPX**: GPS data format parsing
:::

:::{grid-item-card} Visualization
- **Matplotlib**: Static plot generation
- **Plotly**: Interactive visualizations
- **Folium**: Interactive mapping
- **Seaborn**: Statistical visualizations
:::

:::{grid-item-card} Geospatial Analysis
- **GeoPandas**: Geospatial data operations
- **Shapely**: Geometric operations
- **Haversine**: Distance calculations
- **Coordinate Systems**: GPS coordinate handling
:::

::::

## Sample Analysis

### Route Visualization
The tool generates detailed route maps showing:
- Start and end points
- Elevation changes along the route
- Pace variations by segment
- Points of interest along the path

### Performance Metrics
Key metrics calculated include:
- **Average Pace**: Overall and segment-based pace analysis
- **Elevation Gain**: Total climbing and descent
- **Distance**: Accurate GPS-based distance measurement
- **Duration**: Active time vs. total time analysis

## Getting Started

### Installation

```bash
git clone https://github.com/omedeiro/activityAnalysis.git
cd activityAnalysis
pip install -r requirements.txt
```

### Basic Usage

```python
import pandas as pd
from activity_analyzer import GPSAnalyzer

# Load GPS data
analyzer = GPSAnalyzer('data/activity.gpx')

# Generate route analysis
route_stats = analyzer.analyze_route()

# Create visualizations
analyzer.plot_route_map()
analyzer.plot_elevation_profile()
analyzer.plot_pace_analysis()
```

## Data Sources

The tool supports various GPS data formats:
- **GPX Files**: Standard GPS exchange format
- **TCX Files**: Training Center XML format
- **CSV Data**: Custom formatted GPS coordinates
- **Fitness Tracker Exports**: Garmin, Strava, etc.

## Analysis Examples

### Route Optimization
Comparing different routes between the same start and end points to identify:
- Shortest distance options
- Fastest time routes
- Most scenic paths
- Elevation-optimized routes

### Performance Trends
Tracking improvements over time:
- Pace improvement analysis
- Consistency metrics
- Training load distribution
- Recovery pattern analysis

## GitHub Repository

[![GitHub](https://img.shields.io/badge/GitHub-View_Source-black?style=for-the-badge&logo=github)](https://github.com/omedeiro/activityAnalysis)

## Key Technical Features

- **Efficient GPS Processing**: Optimized algorithms for large GPS datasets
- **Accurate Distance Calculations**: Haversine formula for precise measurements
- **Interactive Visualizations**: Plotly-based charts with zoom and filter capabilities
- **Geospatial Analysis**: Comprehensive geographic data processing
- **Statistical Insights**: Advanced analytics for performance understanding

## Future Enhancements

- Real-time activity tracking integration
- Machine learning for route recommendations
- Weather data correlation analysis
- Social features for route sharing
- Mobile app companion
