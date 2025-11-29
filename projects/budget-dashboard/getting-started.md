# Getting Started Guide

This guide will walk you through setting up the budget dashboard and running your first analysis.

## Prerequisites

- Python 3.8 or higher
- Conda (recommended) or pip
- Transaction data from supported banks (Capital One, Santander)

## Step 1: Installation

### Option A: Using Conda (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/budget-dashboard.git
cd budget-dashboard

# Create and activate environment
conda env create -f environment.yml
conda activate budget-dashboard
```

### Option B: Using pip

```bash
# Clone the repository
git clone https://github.com/yourusername/budget-dashboard.git
cd budget-dashboard

# Install dependencies
pip install -r requirements.txt
```

## Step 2: Prepare Your Data

### Capital One Data

1. Log into your Capital One account
2. Go to "Download Account Activity"
3. Select date range (recommend 6+ months for better insights)
4. Download as CSV format
5. Place CSV files in `data/raw/capital_one/`

### Santander Data

1. Log into your Santander account
2. Navigate to statements section
3. Download statements as text or PDF files
4. Place files in `data/raw/santander/`

### Data Structure

Your data directory should look like:
```
data/
├── raw/
│   ├── capital_one/
│   │   ├── statement_2024_01.csv
│   │   ├── statement_2024_02.csv
│   │   └── ...
│   └── santander/
│       ├── statement_2024_01.txt
│       ├── statement_2024_02.txt
│       └── ...
└── processed/  # Generated automatically
```

## Step 3: Run Your First Analysis

### Complete Pipeline

```bash
python main.py
```

This single command will:
1. Import all transaction data
2. Clean and standardize descriptions
3. Categorize transactions automatically
4. Generate comprehensive analysis
5. Create charts and interactive dashboard
6. Generate detailed reports

### Expected Output

You'll see output like:
```
Running complete budget analysis pipeline...
============================================================

🔄 Step 1: Importing data...
   ✓ Imported 1,245 Capital One transactions
   ✓ Imported 856 Santander transactions
   ✓ Combined 2,101 total transactions

🧹 Step 2: Cleaning data...
   ✓ Standardized 127 merchant names
   ✓ Categorized 2,098 transactions
   ✓ Removed 3 duplicate transactions
   ✓ Data validation passed!

📊 Step 3: Analyzing data...
   ✓ Monthly analysis complete
   ✓ Category breakdown complete
   ✓ Merchant analysis complete
   ✓ 12 visualizations generated
   ✓ Interactive dashboard created

📁 Results saved to output/ folder
```

## Step 4: Review Your Results

### Generated Files

After running the analysis, you'll find:

```
output/
├── charts/
│   ├── monthly_trends.png
│   ├── category_breakdown.png
│   ├── income_vs_expenses.png
│   ├── interactive_dashboard.html
│   └── ...
└── reports/
    └── budget_report_20241129_143022.txt
```

### Interactive Dashboard

Open `output/charts/interactive_dashboard.html` in your web browser to explore:

![Interactive Dashboard](images/interactive-dashboard-preview.png)

- **Overview Tab**: Monthly trends and category summaries
- **Category Tabs**: Deep-dive analysis for major spending categories
- **Interactive Charts**: Hover, zoom, and filter capabilities

### Key Insights Report

The text report provides:
- Overall spending summary
- Monthly breakdown with savings rate
- Top expense categories
- Subscription analysis
- Spending recommendations

## Step 5: Customize Categories

If you find transactions categorized incorrectly:

1. Review "Other" category items:
   ```bash
   python main.py --other
   ```

2. Edit category mappings in `scripts/cleaners/category_mappings.py`

3. Re-run cleaning to apply changes:
   ```bash
   python main.py --clean
   ```

## Common Issues & Solutions

### No Data Found

**Problem**: "No data found to process"

**Solution**: 
- Check file locations in `data/raw/`
- Ensure CSV files are properly formatted
- Try with a single file first

### Import Errors

**Problem**: Module import failures

**Solution**:
- Ensure environment is activated: `conda activate budget-dashboard`
- Reinstall dependencies: `pip install -r requirements.txt`
- Check Python version: `python --version` (needs 3.8+)

### Large Dataset Performance

**Problem**: Analysis is slow with lots of data

**Solution**:
- Start with 3-6 months of data
- Use `python main.py --analyze` to skip re-importing
- Consider filtering data by date range

## Next Steps

Once you have basic analysis working:

1. [Explore Analysis Features](analysis-features.md) - Learn about specialized analyzers
2. [Customize Categories](customization.md) - Improve transaction categorization
3. [Automate Updates](automation.md) - Set up regular analysis runs

## Example Workflows

### Monthly Review Workflow
```bash
# Download new statements to data/raw/
# Run full analysis
python main.py

# Review specific categories
python main.py --other
python main.py --subscriptions
```

### Quick Status Check
```bash
# Just run analysis (skip re-import/cleaning)
python main.py --analyze
```

### Data Quality Review
```bash
# Check category mappings
python main.py --other

# Review housing transactions
python main.py --housing
```

Ready to dive deeper? Check out the [Analysis Features](analysis-features.md) guide next!
