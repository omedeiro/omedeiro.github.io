# Data Import Guide

This guide explains how to prepare and import financial data from different bank sources into the budget dashboard.

## Supported Data Sources

### Capital One

**Format**: CSV files  
**Typical columns**: Date, Description, Amount, Category (optional)

#### How to Export from Capital One

1. **Log into your Capital One account**
2. **Navigate to your account** (Checking, Savings, or Credit Card)
3. **Find "Download Account Activity"** or "Export Transactions"
4. **Select date range** (recommend 6+ months for comprehensive analysis)
5. **Choose CSV format**
6. **Download the file**

#### File Naming Convention

Place CSV files in `data/raw/capital_one/` with descriptive names:
```
data/raw/capital_one/
├── capital_one_checking_2024_01_to_06.csv
├── capital_one_credit_2024_01_to_06.csv
└── capital_one_savings_2024_01_to_06.csv
```

#### Sample Capital One CSV Format

```csv
Date,Description,Amount,Category
2024-01-15,"GROCERY STORE #123",-67.84,"Shopping"
2024-01-16,"PAYCHECK DEPOSIT",2500.00,"Income"
2024-01-17,"COFFEE SHOP DOWNTOWN",-4.75,"Food & Dining"
```

### Santander Bank

**Format**: Text files or PDFs  
**Source**: Monthly statements

#### How to Export from Santander

1. **Log into Santander online banking**
2. **Go to "Statements" or "Account Documents"**
3. **Select the account and date range**
4. **Download as PDF or text file**
5. **Save to the santander folder**

#### File Naming Convention

Place statement files in `data/raw/santander/`:
```
data/raw/santander/
├── santander_statement_2024_01.pdf
├── santander_statement_2024_02.txt
└── santander_statement_2024_03.pdf
```

#### Sample Santander Statement Format

The tool can parse various statement formats including:

```
01/15/2024  GROCERY STORE                    -67.84
01/16/2024  PAYROLL DEPOSIT               +2,500.00
01/17/2024  ATM WITHDRAWAL                   -60.00
```

## Data Directory Structure

Your complete data directory should look like:

```
data/
├── raw/
│   ├── capital_one/
│   │   ├── checking_2024_Q1.csv
│   │   ├── checking_2024_Q2.csv
│   │   ├── credit_card_2024_Q1.csv
│   │   └── savings_2024.csv
│   └── santander/
│       ├── statement_2024_01.pdf
│       ├── statement_2024_02.txt
│       ├── statement_2024_03.pdf
│       └── statement_2024_04.txt
└── processed/  # Generated automatically
    ├── capital_one_transactions.csv
    ├── santander_transactions.csv
    ├── combined_transactions.csv
    └── cleaned_transactions.csv
```

## Import Process

### Automated Import

```bash
# Import all data sources automatically
python main.py --import
```

This command will:
1. Scan `data/raw/` directories
2. Parse Capital One CSV files
3. Extract data from Santander statements
4. Combine into unified format
5. Save to `data/processed/`

### Manual Import

You can also run the importer directly:

```bash
python scripts/importers/data_importer.py
```

### Import Output

After import, you'll see:

```
🔄 Importing data...
   ✓ Found 3 Capital One files
   ✓ Found 4 Santander statements
   ✓ Processed 1,245 Capital One transactions
   ✓ Processed 856 Santander transactions
   ✓ Combined 2,101 total transactions
   ✓ Date range: 2024-01-01 to 2024-11-30

📁 Saved to data/processed/
```

## Data Quality Checks

The import process includes automatic quality checks:

### Date Validation
- Ensures all dates are valid and reasonable
- Flags future dates or very old transactions
- Standardizes date formats

### Amount Validation
- Checks for valid numeric amounts
- Identifies unusually large transactions
- Maintains proper positive/negative signs

### Description Cleaning
- Removes extra whitespace
- Standardizes merchant names
- Handles special characters

### Duplicate Detection
- Identifies potential duplicate transactions
- Flags transactions with same date, amount, and description
- Provides warnings for manual review

## Common Import Issues

### Missing Files

**Problem**: "No data files found"

**Solutions**:
- Check file locations in `data/raw/capital_one/` and `data/raw/santander/`
- Ensure files have correct extensions (.csv, .txt, .pdf)
- Verify directory structure matches expectations

### CSV Format Issues

**Problem**: Capital One CSV parsing errors

**Solutions**:
- Open CSV in text editor to check format
- Ensure first row contains headers
- Check for commas in description fields (should be quoted)
- Try downloading a fresh copy from bank

### Statement Parsing Issues

**Problem**: Santander statements not parsing correctly

**Solutions**:
- Try both PDF and text formats
- Check if statement format has changed
- Manually review statement layout
- Use file renaming utility: `python main.py --rename`

### Character Encoding Issues

**Problem**: Special characters not displaying correctly

**Solutions**:
- Ensure files are saved in UTF-8 encoding
- Check bank export settings
- Try re-downloading files

### Large File Performance

**Problem**: Import is slow with large files

**Solutions**:
- Split large date ranges into smaller files
- Process one bank at a time
- Ensure sufficient disk space
- Use SSD storage if available

## Advanced Import Options

### Custom Date Ranges

For processing specific periods:

```python
# Example: Import only Q1 2024 data
from scripts.importers.data_importer import DataImporter

importer = DataImporter()
data = importer.import_date_range('2024-01-01', '2024-03-31')
```

### Bank-Specific Import

Import from single source:

```python
# Capital One only
data = importer.import_capital_one_data()

# Santander only  
data = importer.import_santander_data()
```

### File Validation

Check files before import:

```bash
# Validate file formats
python scripts/importers/validate_files.py
```

## Export Configuration

### Capital One Export Settings

Recommended export settings:
- **Format**: CSV (Comma Separated Values)
- **Date Range**: 12 months maximum per file
- **Columns**: Include all available columns
- **Account**: Export each account separately

### Santander Export Settings

Recommended settings:
- **Format**: Text file preferred, PDF acceptable
- **Period**: Monthly statements
- **Include**: All transaction details
- **Save As**: Plain text when possible

## Data Privacy

### Local Processing
- All data remains on your local machine
- No data transmitted to external services
- Import happens entirely offline

### File Security
- Store raw data files securely
- Consider encrypting sensitive directories
- Remove temporary files after processing

### Access Control
- Set appropriate file permissions
- Use secure backup methods
- Don't commit raw data to version control

## Next Steps

After successful import:

1. **[Clean the Data](getting-started.md#step-3-run-your-first-analysis)** - Standardize and categorize
2. **[Review Categories](customization.md)** - Customize transaction categories  
3. **[Run Analysis](analysis-features.md)** - Generate insights and visualizations

## Troubleshooting

### Getting Help

If you encounter issues:

1. **Check the logs** - Import process provides detailed output
2. **Validate file format** - Use text editor to inspect files
3. **Test with subset** - Try importing a single file first
4. **Review documentation** - Check bank-specific guidance above

### Sample Data

For testing the system without real data:

```bash
# Generate sample data for testing
python scripts/utils/generate_sample_data.py
```

This creates realistic but fake transaction data for demonstration purposes.

Ready to clean and analyze your imported data? Continue to the [Getting Started Guide](getting-started.md#step-3-run-your-first-analysis)!
