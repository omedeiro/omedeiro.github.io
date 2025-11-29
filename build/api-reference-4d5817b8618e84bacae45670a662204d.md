# API Reference

Complete reference for programmatically using the budget dashboard components.

## Core Classes

### BudgetAnalyzer

The main analysis engine for financial data.

```python
from scripts.analytics.budget_analyzer import BudgetAnalyzer

analyzer = BudgetAnalyzer(data=None)
```

#### Constructor

**Parameters:**
- `data` (pd.DataFrame, optional): Pre-loaded transaction data. If None, loads from processed files.

#### Methods

##### `load_data(file_path=None)`

Load transaction data from file or default location.

**Parameters:**
- `file_path` (str, optional): Path to CSV file. Uses default if None.

**Returns:**
- `bool`: True if data loaded successfully

```python
analyzer = BudgetAnalyzer()
success = analyzer.load_data('data/processed/cleaned_transactions.csv')
```

##### `basic_summary()`

Generate high-level financial summary.

**Returns:**
- `dict`: Summary statistics including:
  - `total_transactions`: Number of transactions
  - `total_income`: Sum of positive amounts
  - `total_spent`: Sum of negative amounts (absolute)
  - `net_amount`: Net income - expenses
  - `date_range`: Start and end dates
  - `average_transaction`: Mean transaction amount

```python
summary = analyzer.basic_summary()
print(f"Net amount: ${summary['net_amount']:,.2f}")
```

##### `monthly_analysis()`

Analyze spending and income by month.

**Returns:**
- `pd.DataFrame`: Monthly data with columns:
  - `Total_Income`: Monthly income
  - `Total_Expenses`: Monthly expenses (negative)
  - `Net_Amount`: Monthly savings
  - `Transaction_Count`: Number of transactions
  - `Savings_Rate`: Percentage saved

```python
monthly = analyzer.monthly_analysis()
print(monthly.head())
```

##### `category_analysis()`

Break down spending by category.

**Returns:**
- `pd.DataFrame`: Category data with columns:
  - `Total_Amount`: Total amount per category
  - `Expense_Amount`: Expense amount (negative values)
  - `Income_Amount`: Income amount (positive values)
  - `Transaction_Count`: Number of transactions
  - `Expense_Percentage`: Percentage of total expenses

```python
categories = analyzer.category_analysis()
top_expense = categories['Expense_Amount'].idxmin()
print(f"Top expense category: {top_expense}")
```

##### `merchant_analysis(top_n=20)`

Analyze spending by merchant/vendor.

**Parameters:**
- `top_n` (int): Number of top merchants to return

**Returns:**
- `pd.DataFrame`: Merchant data with columns:
  - `Total_Volume`: Total transaction volume
  - `Transaction_Count`: Number of transactions
  - `Average_Amount`: Mean transaction amount

```python
merchants = analyzer.merchant_analysis(top_n=10)
print(merchants.head())
```

##### `trend_analysis()`

Detect spending trends and patterns.

**Returns:**
- `dict`: Trend analysis including:
  - `monthly_trend`: Linear trend in monthly spending
  - `seasonal_patterns`: Seasonal spending variations
  - `weekend_vs_weekday`: Weekend spending comparison

```python
trends = analyzer.trend_analysis()
print(f"Monthly trend: {trends['monthly_trend']['slope']:.2f} per month")
```

##### `create_visualizations()`

Generate all standard charts and save to output directory.

**Returns:**
- `None`

**Side effects:**
- Saves PNG files to `output/charts/`
- Creates interactive dashboard HTML

```python
analyzer.create_visualizations()
print("Charts saved to output/charts/")
```

##### `run_full_analysis()`

Execute complete analysis pipeline.

**Returns:**
- `dict`: Complete results including all analysis components

```python
results = analyzer.run_full_analysis()
# Automatically generates charts, reports, and dashboard
```

### DataImporter

Import transaction data from various bank sources.

```python
from scripts.importers.data_importer import DataImporter

importer = DataImporter()
```

#### Methods

##### `import_all_data()`

Import from all configured data sources.

**Returns:**
- `dict`: Imported data with keys:
  - `capital_one`: Capital One transactions
  - `santander`: Santander transactions  
  - `combined`: All transactions combined

```python
data = importer.import_all_data()
print(f"Total transactions: {len(data['combined'])}")
```

##### `import_capital_one_data()`

Import only Capital One CSV files.

**Returns:**
- `pd.DataFrame`: Capital One transactions

##### `import_santander_data()`

Import only Santander statement files.

**Returns:**
- `pd.DataFrame`: Santander transactions

##### `save_processed_data()`

Save imported data to processed directory.

**Returns:**
- `None`

**Side effects:**
- Saves CSV files to `data/processed/`

### DataCleaner

Clean and standardize transaction data.

```python
from scripts.cleaners.data_cleaner import DataCleaner

cleaner = DataCleaner()
```

#### Methods

##### `clean_transaction_data(data)`

Clean raw transaction data.

**Parameters:**
- `data` (pd.DataFrame): Raw transaction data

**Returns:**
- `pd.DataFrame`: Cleaned transaction data

```python
cleaned = cleaner.clean_transaction_data(raw_data)
```

##### `get_cleaning_summary(original, cleaned)`

Generate summary of cleaning process.

**Parameters:**
- `original` (pd.DataFrame): Original data
- `cleaned` (pd.DataFrame): Cleaned data

**Returns:**
- `dict`: Cleaning summary with statistics

##### `validate_cleaned_data(data)`

Validate cleaned data quality.

**Parameters:**
- `data` (pd.DataFrame): Cleaned data

**Returns:**
- `list`: List of validation issues (empty if no issues)

## Specialized Analyzers

### GasSpendingAnalyzer

Analyze gas/fuel spending patterns.

```python
from scripts.analytics.gas_spending_analyzer import GasSpendingAnalyzer

gas_analyzer = GasSpendingAnalyzer(data)
```

#### Methods

##### `analyze_weekly_patterns()`

Analyze gas spending by week.

**Returns:**
- `dict`: Weekly analysis including:
  - `weekly_totals`: Spending by week
  - `average_weekly`: Average weekly spending
  - `fill_up_frequency`: Days between fill-ups

##### `analyze_monthly_trends()`

Track monthly gas spending trends.

**Returns:**
- `dict`: Monthly trends and totals

##### `create_gas_spending_chart()`

Generate gas spending visualization.

**Returns:**
- `None`

**Side effects:**
- Saves chart to output directory

### SubscriptionAnalyzer

Analyze recurring subscription charges.

```python
from scripts.analytics.budget_analyzer import BudgetAnalyzer

analyzer = BudgetAnalyzer()
subscription_data = analyzer.analyze_monthly_subscriptions()
```

#### Methods

##### `analyze_monthly_subscriptions()`

Identify monthly recurring charges.

**Returns:**
- `pd.DataFrame`: Subscription analysis with confidence scores

##### `print_monthly_subscription_report()`

Print detailed subscription report.

**Returns:**
- `None`

**Side effects:**
- Prints formatted report to console

## Utility Functions

### Category Management

```python
from scripts.cleaners.category_mappings import CategoryMappings

# Get category for transaction
category = CategoryMappings.get_category("STARBUCKS COFFEE")

# Add new mapping
CategoryMappings.add_mapping("Food & Dining", "new_restaurant")
```

### Date Utilities

```python
from scripts.utils.date_utils import DateUtils

# Get fiscal year
fy = DateUtils.get_fiscal_year(date, start_month=10)

# Check if weekend
is_weekend = DateUtils.is_weekend(date)

# Get month name
month_name = DateUtils.get_month_name(date)
```

### Export Functions

```python
from scripts.utils.export_utils import ExportUtils

# Export to CSV
ExportUtils.to_csv(data, 'output/export.csv')

# Export for taxes
tax_data = ExportUtils.for_tax_prep(data, year=2024)

# Export summary
ExportUtils.create_summary_report(analysis_results)
```

## Configuration

### Default Paths

```python
from scripts.config import Config

# Data directories
raw_data_path = Config.RAW_DATA_DIR
processed_data_path = Config.PROCESSED_DATA_DIR
output_path = Config.OUTPUT_DIR

# File patterns
capital_one_pattern = Config.CAPITAL_ONE_PATTERN
santander_pattern = Config.SANTANDER_PATTERN
```

### Category Mappings

```python
from scripts.cleaners.category_mappings import CATEGORY_MAPPINGS

# View all mappings
for category, keywords in CATEGORY_MAPPINGS.items():
    print(f"{category}: {keywords[:3]}...")  # First 3 keywords

# Modify mappings
CATEGORY_MAPPINGS["Food & Dining"].append("new_restaurant")
```

## Custom Analysis Examples

### Example 1: Weekly Spending Analysis

```python
def analyze_weekly_spending(analyzer):
    """Analyze spending patterns by week of year."""
    
    # Add week number to data
    analyzer.data['week'] = analyzer.data['Transaction Date'].dt.isocalendar().week
    
    # Weekly spending
    weekly_spending = analyzer.data[analyzer.data['Amount'] < 0].groupby('week')['Amount'].sum().abs()
    
    # Find highest spending weeks
    top_weeks = weekly_spending.nlargest(5)
    
    return {
        'weekly_totals': weekly_spending,
        'top_spending_weeks': top_weeks,
        'average_weekly': weekly_spending.mean()
    }

# Usage
analyzer = BudgetAnalyzer()
analyzer.load_data()
weekly_results = analyze_weekly_spending(analyzer)
```

### Example 2: Merchant Loyalty Analysis

```python
def analyze_merchant_loyalty(analyzer):
    """Find merchants visited most frequently."""
    
    # Transaction frequency by merchant
    merchant_frequency = analyzer.data.groupby('Merchant').agg({
        'Transaction Date': 'count',
        'Amount': ['sum', 'mean']
    })
    
    merchant_frequency.columns = ['visit_count', 'total_spent', 'avg_amount']
    
    # Calculate loyalty score (frequency × average amount)
    merchant_frequency['loyalty_score'] = (
        merchant_frequency['visit_count'] * 
        merchant_frequency['avg_amount'].abs()
    )
    
    return merchant_frequency.sort_values('loyalty_score', ascending=False)

# Usage
loyalty_analysis = analyze_merchant_loyalty(analyzer)
print(loyalty_analysis.head())
```

### Example 3: Seasonal Spending Patterns

```python
def analyze_seasonal_patterns(analyzer):
    """Analyze spending by season."""
    
    # Define seasons
    def get_season(month):
        if month in [12, 1, 2]:
            return 'Winter'
        elif month in [3, 4, 5]:
            return 'Spring'
        elif month in [6, 7, 8]:
            return 'Summer'
        else:
            return 'Fall'
    
    # Add season column
    analyzer.data['season'] = analyzer.data['Transaction Date'].dt.month.apply(get_season)
    
    # Seasonal spending by category
    seasonal_spending = analyzer.data[analyzer.data['Amount'] < 0].groupby(
        ['season', 'Category_Clean']
    )['Amount'].sum().abs().unstack(fill_value=0)
    
    return seasonal_spending

# Usage
seasonal_analysis = analyze_seasonal_patterns(analyzer)
print(seasonal_analysis)
```

## Error Handling

### Common Exceptions

```python
from scripts.exceptions import BudgetAnalysisError

try:
    analyzer = BudgetAnalyzer()
    analyzer.load_data('nonexistent_file.csv')
except FileNotFoundError:
    print("Data file not found")
except pd.errors.EmptyDataError:
    print("Data file is empty")
except BudgetAnalysisError as e:
    print(f"Analysis error: {e}")
```

### Data Validation

```python
def validate_data(data):
    """Validate data before analysis."""
    
    required_columns = ['Transaction Date', 'Description', 'Amount']
    
    # Check required columns
    if not all(col in data.columns for col in required_columns):
        raise ValueError("Missing required columns")
    
    # Check data types
    if not pd.api.types.is_datetime64_any_dtype(data['Transaction Date']):
        raise ValueError("Transaction Date must be datetime")
    
    if not pd.api.types.is_numeric_dtype(data['Amount']):
        raise ValueError("Amount must be numeric")
    
    # Check for empty data
    if data.empty:
        raise ValueError("Dataset is empty")
    
    return True

# Usage
try:
    validate_data(analyzer.data)
    results = analyzer.run_full_analysis()
except ValueError as e:
    print(f"Data validation error: {e}")
```

## Performance Optimization

### Large Dataset Handling

```python
# Use chunking for large datasets
def process_large_dataset(file_path, chunk_size=10000):
    """Process large datasets efficiently."""
    
    chunks = []
    for chunk in pd.read_csv(file_path, chunksize=chunk_size):
        # Process each chunk
        processed_chunk = clean_chunk(chunk)
        chunks.append(processed_chunk)
    
    return pd.concat(chunks, ignore_index=True)

# Memory optimization
def optimize_memory(data):
    """Reduce memory usage."""
    
    # Convert to categorical
    categorical_columns = ['Merchant', 'Category_Clean', 'Bank']
    for col in categorical_columns:
        if col in data.columns:
            data[col] = data[col].astype('category')
    
    # Use appropriate numeric types
    data['Amount'] = pd.to_numeric(data['Amount'], downcast='float')
    
    return data
```

### Caching Results

```python
import pickle
from pathlib import Path

def cache_analysis_results(analyzer, cache_dir='cache'):
    """Cache expensive analysis results."""
    
    cache_path = Path(cache_dir)
    cache_path.mkdir(exist_ok=True)
    
    # Check if cached results exist
    cache_file = cache_path / 'monthly_analysis.pkl'
    
    if cache_file.exists():
        with open(cache_file, 'rb') as f:
            return pickle.load(f)
    
    # Perform analysis and cache
    results = analyzer.monthly_analysis()
    
    with open(cache_file, 'wb') as f:
        pickle.dump(results, f)
    
    return results
```

This API reference provides the foundation for building custom analysis tools and integrating the budget dashboard into larger financial management systems.
