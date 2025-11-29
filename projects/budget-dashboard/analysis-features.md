# Analysis Features

The budget dashboard provides comprehensive financial analysis with multiple specialized modules. This guide covers all available analysis features and how to use them.

## Core Analysis Modules

### 1. Monthly Trends Analysis

Tracks income, expenses, and savings over time with trend detection.

```bash
# Included in main analysis
python main.py
```

**Features:**
- Monthly income vs expenses comparison
- Net savings calculation with trends
- Transaction volume analysis
- Seasonal pattern detection

![Monthly Trends](images/monthly-trends.png)

**Key Insights:**
- Identify months with highest/lowest spending
- Track savings rate improvements
- Detect income volatility
- Spot seasonal spending patterns

### 2. Category Breakdown

Comprehensive categorization of all transactions with visual breakdowns.

**Categories Include:**
- Food & Dining
- Transportation  
- Shopping
- Entertainment
- Housing
- Utilities
- Subscriptions
- Healthcare
- And more...

![Category Breakdown](images/category-breakdown.png)

**Analysis Includes:**
- Pie chart with percentage breakdown
- Bar chart showing absolute amounts
- Transaction count per category
- Category trend analysis over time

### 3. Merchant Analysis

Deep dive into spending patterns by merchant/vendor.

**Features:**
- Top merchants by total spending
- Top merchants by transaction frequency
- Merchant spending trends over time
- Duplicate merchant detection and standardization

![Top Merchants](images/top-merchants.png)

**Use Cases:**
- Identify primary spending locations
- Find merchants to negotiate with for discounts
- Track loyalty program opportunities
- Monitor subscription services

### 4. Income Analysis

Detailed analysis of income sources and patterns.

```bash
# View income breakdown in main dashboard
python main.py
```

**Features:**
- Income source identification
- Monthly income stability analysis  
- Income vs expenses correlation
- Irregular income detection

![Income Sources](images/income-sources.png)

## Specialized Analyzers

### Subscription Tracker

Automatically detects and analyzes recurring subscription charges.

```bash
# Included in main analysis, or analyze separately
python main.py --subscriptions
```

**Features:**
- Monthly subscription detection
- Cost per subscription analysis
- Subscription growth over time
- Identifies canceled vs active subscriptions

![Subscriptions Analysis](images/subscriptions-analysis.png)

**Detection Algorithm:**
- Identifies charges recurring every 28-35 days
- Groups similar amounts from same merchants
- Excludes one-time charges and bank fees
- Confidence scoring for subscription likelihood

### Gas/Transportation Spending

Specialized analyzer for vehicle-related expenses.

```bash
python main.py --gas
```

**Features:**
- Weekly gas spending patterns
- Cost per fill-up analysis
- Driving frequency estimation
- Seasonal usage patterns

![Gas Spending](images/gas-spending.png)

**Use Cases:**
- Tax deduction calculations
- Budgeting for fuel costs
- Comparing fuel efficiency
- Mileage estimation

### Dining Out Analyzer

Dedicated analysis for restaurant and food delivery spending.

**Features:**
- Restaurant vs delivery spending
- Average meal costs
- Frequency analysis
- Day-of-week patterns

### Utility Bills Tracking

Monitors recurring utility payments and detects anomalies.

**Features:**
- Monthly utility costs
- Seasonal variation analysis
- Bill increase detection
- Budget vs actual comparison

## Interactive Dashboard

The HTML dashboard provides comprehensive visualization with multiple tabs.

```bash
# Generated automatically with main analysis
python main.py
# Open output/charts/interactive_dashboard.html
```

### Dashboard Features

**Overview Tab:**
- High-level financial summary
- Key metrics and trends
- Month-over-month comparisons

**Category Tabs:**
- Deep-dive analysis for each major category
- Monthly trends per category
- Merchant breakdown within categories
- Day-of-week spending patterns

![Dashboard Overview](images/dashboard-overview.png)

**Interactive Elements:**
- Hover for detailed tooltips
- Zoom and pan capabilities
- Responsive design for mobile/desktop
- Export chart functionality

## Pattern Analysis

### Daily Spending Patterns

Analyzes spending behavior by day of week.

**Insights:**
- Weekend vs weekday spending
- Peak spending days
- Regular schedule detection
- Impulse spending identification

![Daily Patterns](images/daily-patterns.png)

### Seasonal Analysis

Identifies recurring seasonal patterns in spending.

**Detection:**
- Holiday spending spikes
- Back-to-school expenses
- Summer activity costs
- Tax season impacts

### Anomaly Detection

Automatically flags unusual transactions for review.

**Triggers:**
- Unusually large transactions
- New merchants
- Category changes
- Spending spikes

## Reporting Features

### Automated Reports

Text-based reports with key insights and recommendations.

```bash
# Generated automatically
python main.py
# Check output/reports/budget_report_YYYYMMDD_HHMMSS.txt
```

**Report Sections:**
- Executive summary
- Monthly breakdown
- Category analysis
- Key insights and recommendations
- Savings opportunities

### Custom Analysis

For specific analysis needs:

```bash
# Analyze specific categories
python main.py --other       # Review "Other" category items
python main.py --housing     # Housing transaction review
python main.py --mitll       # Workplace cafeteria spending

# Data quality checks
python main.py --validate    # Data validation report
```

## Advanced Features

### Duplicate Detection

Automatically identifies and flags potential duplicate transactions.

**Detection Methods:**
- Same amount, date, and merchant
- Similar descriptions within time window
- Cross-account transfer matching

### Merchant Standardization

Cleans and standardizes merchant names for better analysis.

**Examples:**
- "AMAZON.COM*123456" → "Amazon"
- "SQ *COFFEE SHOP NYC" → "Coffee Shop"
- "TST* RESTAURANT NAME" → "Restaurant Name"

### Category Learning

The system learns from corrections to improve future categorization.

**Process:**
1. Review miscategorized items with `--other`
2. Update category mappings
3. Re-run cleaning to apply changes
4. System remembers patterns for future

### Data Export

Export processed data for external analysis.

**Available Exports:**
- Clean transaction data (CSV)
- Category summaries (CSV)
- Monthly aggregates (CSV)
- Merchant analysis (CSV)

## Performance Tips

### Large Datasets

For datasets with 10,000+ transactions:

```bash
# Run components separately for faster iteration
python main.py --import    # Once
python main.py --clean     # When categories change
python main.py --analyze   # Multiple times for different views
```

### Memory Optimization

- Process data in date ranges if memory is limited
- Use `--analyze` flag to skip data reprocessing
- Consider removing very old transactions

### Speed Improvements

- Keep raw data files organized by date
- Use SSD storage for faster file I/O
- Run analysis on subset first to validate

## Troubleshooting

### Common Issues

**Missing Categories:**
- Add new patterns to `category_mappings.py`
- Use `--other` flag to review uncategorized items

**Incorrect Merchant Names:**
- Update merchant standardization rules
- Add regex patterns for common formats

**Performance Issues:**
- Process smaller date ranges
- Use `--analyze` to skip data import
- Check available system memory

## API Reference

For programmatic access, all analyzers can be used directly:

```python
from scripts.analytics.budget_analyzer import BudgetAnalyzer
from scripts.analytics.subscription_analyzer import SubscriptionAnalyzer

# Load data and analyze
analyzer = BudgetAnalyzer()
analyzer.load_data()
results = analyzer.run_full_analysis()

# Access specific analysis
monthly_data = analyzer.monthly_analysis()
category_data = analyzer.category_analysis()
```

See [API Reference](api-reference.md) for complete documentation.

## Next Steps

- [Customize Categories](customization.md) - Improve categorization accuracy
- [Automation Guide](automation.md) - Set up regular analysis runs
- [Advanced Usage](advanced-usage.md) - Power user features and customization
