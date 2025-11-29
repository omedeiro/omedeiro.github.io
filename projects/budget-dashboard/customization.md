# Customization Guide

Learn how to customize the budget dashboard to better match your spending patterns and analysis needs.

## Category Customization

### Understanding Categories

The system automatically categorizes transactions based on merchant names and descriptions. Categories help organize spending for analysis and insights.

**Default Categories:**
- Food & Dining
- Transportation
- Shopping  
- Entertainment
- Housing
- Utilities
- Subscriptions
- Healthcare
- Income
- Internal Transfers

### Reviewing Category Assignments

#### Check "Other" Category

Start by reviewing items assigned to "Other":

```bash
python main.py --other
```

This shows:
- All transactions categorized as "Other"
- Suggested categories for each merchant
- Spending patterns by merchant
- Recommendations for category mappings

#### Category Breakdown Report

View overall category distribution:

```bash
python main.py --analyze
# Check output/reports/budget_report_*.txt
```

### Customizing Category Mappings

#### Edit Category Mappings File

The main configuration is in `scripts/cleaners/category_mappings.py`:

```python
# Example category mappings
CATEGORY_MAPPINGS = {
    "Food & Dining": [
        "restaurant", "cafe", "coffee", "pizza", "sushi",
        "chipotle", "starbucks", "dunkin", "mcdonald",
        "tst*", "sq *",  # Toast and Square payment processors
        "uber eats", "doordash", "grubhub"
    ],
    "Transportation": [
        "shell", "exxon", "bp", "chevron", "citgo",  # Gas stations
        "mbta", "uber", "lyft", "taxi",              # Transit
        "parking", "zipcar", "car rental"
    ],
    "Shopping": [
        "amazon", "target", "walmart", "costco",
        "home depot", "lowes", "best buy",
        "rei", "clothing", "pharmacy"
    ]
}
```

#### Adding New Merchants

1. **Identify the merchant** from "Other" category analysis
2. **Choose appropriate category** based on spending type
3. **Add keyword to mappings**:

```python
"Food & Dining": [
    # ...existing keywords...
    "new restaurant name",  # Add new merchant
    "food truck",           # Add pattern
]
```

4. **Re-run cleaning** to apply changes:

```bash
python main.py --clean
```

#### Creating New Categories

For specialized tracking, create custom categories:

```python
# Add to CATEGORY_MAPPINGS
"Pet Care": [
    "veterinary", "pet store", "dog grooming",
    "pet supplies", "animal hospital"
],
"Home Improvement": [
    "home depot", "lowes", "contractor",
    "hardware store", "paint store"
]
```

### Advanced Category Rules

#### Merchant Standardization

Clean up merchant names for better grouping:

```python
# In merchant_processor.py
MERCHANT_STANDARDIZATION = {
    # Pattern matching for similar merchants
    r"AMAZON\.COM.*": "Amazon",
    r"SQ \*(.+)": r"\1",  # Square payments
    r"TST\* (.+)": r"\1", # Toast payments
    r"PAYPAL \*(.+)": r"\1",
}
```

#### Amount-Based Rules

Create rules based on transaction amounts:

```python
# Example: Large transactions from Amazon might be electronics
def custom_categorization_rules(row):
    if "amazon" in row['merchant'].lower():
        if abs(row['amount']) > 500:
            return "Electronics"
        elif abs(row['amount']) < 25:
            return "Small Items"
    return None  # Use default mapping
```

#### Date-Based Rules

Seasonal or time-based categorization:

```python
def seasonal_rules(row):
    month = row['date'].month
    merchant = row['merchant'].lower()
    
    # Holiday spending
    if month in [11, 12] and 'gift' in merchant:
        return "Holiday Gifts"
    
    # Summer travel
    if month in [6, 7, 8] and any(word in merchant for word in ['hotel', 'airline']):
        return "Summer Travel"
    
    return None
```

## Analysis Customization

### Custom Spending Targets

Set monthly budgets for categories:

```python
# In config.py or analysis settings
MONTHLY_BUDGETS = {
    "Food & Dining": 800,
    "Transportation": 400,
    "Entertainment": 300,
    "Shopping": 500
}
```

Use in analysis:

```python
from scripts.analytics.budget_analyzer import BudgetAnalyzer

analyzer = BudgetAnalyzer()
analyzer.set_budgets(MONTHLY_BUDGETS)
results = analyzer.analyze_budget_performance()
```

### Custom Time Periods

Analyze specific periods:

```python
# Analyze only recent months
analyzer.set_date_range('2024-06-01', '2024-11-30')

# Academic year analysis
analyzer.set_date_range('2024-09-01', '2025-05-31')

# Tax year analysis  
analyzer.set_date_range('2024-01-01', '2024-12-31')
```

### Custom Merchant Grouping

Group related merchants for analysis:

```python
MERCHANT_GROUPS = {
    "Coffee Shops": ["starbucks", "dunkin", "local coffee", "cafe"],
    "Gas Stations": ["shell", "exxon", "bp", "chevron"],
    "Streaming Services": ["netflix", "spotify", "apple music", "disney+"]
}
```

## Visualization Customization

### Chart Styling

Customize chart appearance:

```python
# In budget_analyzer.py
CHART_STYLE = {
    'figsize': (14, 10),
    'dpi': 300,
    'color_palette': 'viridis',
    'font_size': 12
}

# Apply to matplotlib charts
plt.style.use('seaborn-v0_8')
plt.rcParams.update({'font.size': CHART_STYLE['font_size']})
```

### Custom Chart Types

Add new visualization types:

```python
def plot_weekly_spending_heatmap(self):
    """Create a heatmap of spending by week and day."""
    # Custom analysis code
    weekly_data = self.data.groupby(['week', 'day_of_week'])['amount'].sum()
    
    # Create heatmap
    fig, ax = plt.subplots(figsize=(12, 8))
    sns.heatmap(weekly_data.unstack(), annot=True, ax=ax)
    plt.title('Weekly Spending Patterns')
    plt.savefig(self.charts_dir / 'weekly_heatmap.png')
```

### Interactive Dashboard Customization

Modify the dashboard layout:

```python
# In dashboard generation code
def create_custom_dashboard_tab(self, category_name):
    """Create custom analysis tab."""
    fig = make_subplots(
        rows=3, cols=2,
        subplot_titles=custom_titles,
        specs=custom_layout
    )
    
    # Add custom charts
    # ... custom chart code ...
    
    return fig.to_html()
```

## Specialized Analyzers

### Creating Custom Analyzers

For specific analysis needs, create specialized modules:

```python
# scripts/analytics/custom_analyzer.py
class WorkExpenseAnalyzer:
    """Analyze work-related expenses for tax purposes."""
    
    def __init__(self, data):
        self.data = data
        self.work_categories = ['Business Travel', 'Office Supplies', 'Professional Development']
    
    def analyze_deductible_expenses(self):
        """Calculate potential tax deductions."""
        work_expenses = self.data[
            self.data['category'].isin(self.work_categories)
        ]
        
        monthly_totals = work_expenses.groupby(
            work_expenses['date'].dt.to_period('M')
        )['amount'].sum().abs()
        
        return {
            'total_deductible': monthly_totals.sum(),
            'monthly_average': monthly_totals.mean(),
            'breakdown': work_expenses.groupby('category')['amount'].sum().abs()
        }
```

### Integration with Main Analysis

Add custom analyzer to the pipeline:

```python
# In main.py or budget_analyzer.py
from scripts.analytics.custom_analyzer import WorkExpenseAnalyzer

def run_custom_analysis():
    analyzer = BudgetAnalyzer()
    analyzer.load_data()
    
    # Run standard analysis
    results = analyzer.run_full_analysis()
    
    # Add custom analysis
    work_analyzer = WorkExpenseAnalyzer(analyzer.data)
    work_results = work_analyzer.analyze_deductible_expenses()
    
    return {**results, 'work_expenses': work_results}
```

## Configuration Files

### Main Configuration

Create `config/analysis_config.py`:

```python
# Analysis settings
ANALYSIS_CONFIG = {
    'default_categories': [...],
    'budget_targets': {...},
    'chart_settings': {...},
    'export_settings': {...}
}

# Date range settings
DATE_SETTINGS = {
    'default_lookback_months': 12,
    'fiscal_year_start': 'January',
    'weekend_days': ['Saturday', 'Sunday']
}

# Currency and formatting
FORMATTING = {
    'currency_symbol': '$',
    'decimal_places': 2,
    'thousands_separator': ',',
    'date_format': '%Y-%m-%d'
}
```

### Environment Variables

Use environment variables for sensitive settings:

```bash
# .env file
BUDGET_DATA_PATH=/secure/location/data
BUDGET_OUTPUT_PATH=/secure/location/output
BUDGET_CURRENCY=USD
BUDGET_TIMEZONE=America/New_York
```

Load in Python:

```python
import os
from pathlib import Path

# Load environment settings
DATA_PATH = Path(os.getenv('BUDGET_DATA_PATH', 'data'))
OUTPUT_PATH = Path(os.getenv('BUDGET_OUTPUT_PATH', 'output'))
CURRENCY = os.getenv('BUDGET_CURRENCY', 'USD')
```

## Advanced Customization

### Custom Data Preprocessing

Add preprocessing steps:

```python
def custom_preprocessing(data):
    """Custom data preprocessing pipeline."""
    
    # Remove specific transaction types
    data = data[~data['description'].str.contains('INTERNAL TRANSFER')]
    
    # Adjust amounts for specific merchants
    mask = data['merchant'].str.contains('COSTCO')
    data.loc[mask, 'amount'] *= 0.9  # Assume 10% cashback
    
    # Add custom fields
    data['is_weekend'] = data['date'].dt.dayofweek >= 5
    data['is_holiday'] = data['date'].isin(get_holidays())
    
    return data
```

### Custom Export Formats

Create specialized export functions:

```python
def export_for_taxes(data, year=2024):
    """Export data formatted for tax preparation."""
    
    tax_data = data[data['date'].dt.year == year]
    
    # Group by tax-relevant categories
    tax_categories = {
        'Business': ['Business Travel', 'Office Supplies'],
        'Medical': ['Healthcare', 'Pharmacy'],
        'Charitable': ['Charity', 'Donations']
    }
    
    # Create tax-ready export
    tax_export = {}
    for tax_cat, categories in tax_categories.items():
        tax_export[tax_cat] = data[
            data['category'].isin(categories)
        ]['amount'].sum()
    
    return tax_export
```

### Performance Optimization

For large datasets:

```python
# Optimize memory usage
def optimize_data_types(data):
    """Reduce memory usage through better data types."""
    
    # Use categories for repeated strings
    data['category'] = data['category'].astype('category')
    data['merchant'] = data['merchant'].astype('category')
    
    # Use appropriate numeric types
    data['amount'] = data['amount'].astype('float32')
    
    return data

# Chunk processing for large datasets
def process_large_dataset(file_path, chunk_size=10000):
    """Process large datasets in chunks."""
    
    results = []
    for chunk in pd.read_csv(file_path, chunksize=chunk_size):
        processed_chunk = process_transactions(chunk)
        results.append(processed_chunk)
    
    return pd.concat(results, ignore_index=True)
```

## Testing Customizations

### Validate Changes

Test your customizations:

```bash
# Test category mappings
python main.py --other  # Should show fewer "Other" items

# Test full pipeline
python main.py --clean --analyze

# Validate specific merchant assignments
python scripts/cleaners/test_categorization.py
```

### A/B Testing

Compare different configurations:

```python
def compare_categorization_approaches():
    """Compare two different category mapping approaches."""
    
    # Load same data with different mappings
    results_v1 = analyze_with_config('config_v1.py')
    results_v2 = analyze_with_config('config_v2.py')
    
    # Compare category distributions
    comparison = {
        'v1_other_count': results_v1['other_category_count'],
        'v2_other_count': results_v2['other_category_count'],
        'improvement': results_v1['other_category_count'] - results_v2['other_category_count']
    }
    
    return comparison
```

## Common Customization Scenarios

### Scenario 1: Business Owner

Track business vs personal expenses:

```python
BUSINESS_KEYWORDS = [
    'office depot', 'staples', 'business trip',
    'conference', 'client meeting', 'software license'
]

def classify_business_expense(row):
    description = row['description'].lower()
    if any(keyword in description for keyword in BUSINESS_KEYWORDS):
        return 'Business'
    return 'Personal'
```

### Scenario 2: Student

Track education-related spending:

```python
EDUCATION_CATEGORIES = {
    'Textbooks': ['amazon textbook', 'bookstore', 'textbook'],
    'School Supplies': ['staples', 'office depot', 'notebook'],
    'Tuition': ['university', 'college', 'tuition'],
    'Student Life': ['campus dining', 'student center']
}
```

### Scenario 3: Family Budget

Track family member spending:

```python
FAMILY_TAGS = {
    'Parent1': ['john_card', 'work_lunch'],
    'Parent2': ['jane_card', 'grocery_shopping'],
    'Kids': ['school_lunch', 'allowance', 'toys']
}

def tag_family_member(row):
    description = row['description'].lower()
    for member, keywords in FAMILY_TAGS.items():
        if any(keyword in description for keyword in keywords):
            return member
    return 'Family_General'
```

## Next Steps

After customizing your setup:

1. **Test thoroughly** - Run analysis with new settings
2. **Monitor results** - Check that categories make sense
3. **Iterate** - Refine mappings based on new transactions
4. **Document changes** - Keep notes on customizations
5. **Backup configurations** - Version control your settings

Ready to dive deeper? Check out the [API Reference](api-reference.md) for programmatic customization options.
