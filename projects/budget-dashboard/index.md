# Personal Finance Dashboard

A comprehensive Python-based tool for analyzing personal financial data with automated data import, cleaning, and visualization capabilities.

## 🌟 Features

- **Multi-Bank Support**: Import from Capital One CSV and Santander statements
- **Smart Data Cleaning**: Automated merchant standardization and category assignment
- **Rich Analytics**: Monthly trends, category breakdowns, spending patterns
- **Interactive Visualizations**: Beautiful charts and an interactive HTML dashboard
- **Specialized Analyzers**: Custom modules for subscriptions, gas spending, and more
- **Comprehensive Reports**: Detailed financial insights and recommendations

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/budget-dashboard.git
cd budget-dashboard

# Create conda environment
conda env create -f environment.yml
conda activate budget-dashboard

# Or use pip
pip install -r requirements.txt
```

### Basic Usage

```bash
# Run complete analysis pipeline
python main.py

# Or run individual components
python main.py --import    # Import data only
python main.py --clean     # Clean data only
python main.py --analyze   # Analyze data only
```

## 📊 Dashboard Preview

The tool generates a comprehensive interactive dashboard with multiple tabs for detailed analysis:

![Dashboard Overview](images/dashboard-overview.png)

*Interactive dashboard with multiple analysis tabs and rich visualizations*

### Sample Visualizations

#### Monthly Trends Analysis
![Monthly Trends](images/monthly-trends.png)
*Track income vs expenses over time with savings analysis*

#### Category Breakdown
![Category Breakdown](images/category-breakdown.png) 
*Understand spending distribution across categories*

#### Top Merchants Analysis
![Top Merchants](images/top-merchants.png)
*Identify primary spending locations and opportunities*

#### Daily Spending Patterns
![Daily Patterns](images/daily-patterns.png)
*Analyze spending behavior by day of week*

## 🏗️ Architecture

```
budget-dashboard/
├── scripts/
│   ├── importers/       # Data import modules
│   ├── cleaners/        # Data cleaning and standardization
│   └── analytics/       # Analysis and visualization
├── data/
│   ├── raw/            # Original bank files
│   └── processed/      # Cleaned data
└── output/
    ├── charts/         # Generated visualizations
    └── reports/        # Text-based insights
```

## 📖 Documentation

- [Getting Started Guide](getting-started.md) - Step-by-step setup and first analysis
- [Data Import Guide](data-import.md) - How to prepare and import your financial data
- [Analysis Features](analysis-features.md) - Complete overview of analysis capabilities
- [Customization Guide](customization.md) - How to customize categories and analysis
- [API Reference](api-reference.md) - Technical documentation for developers

## 🎯 Example Workflows

### End-to-End Analysis
```bash
# Complete pipeline with all features
python main.py
```
This runs the full analysis pipeline, generating charts, reports, and an interactive dashboard.

### Specialized Analysis
```bash
# Analyze subscription spending patterns
python main.py --analyze-subscriptions

# Review transactions in 'Other' category for better categorization
python main.py --other

# Gas spending analysis (useful for mileage tracking)
python main.py --gas
```

## 🛡️ Privacy & Security

This tool processes financial data locally on your machine. No data is transmitted to external services. All analysis is performed offline for maximum privacy.

## 📄 License

MIT License - see [LICENSE](../LICENSE) for details.

---

*Built with Python, Pandas, Matplotlib, Plotly, and Seaborn*
