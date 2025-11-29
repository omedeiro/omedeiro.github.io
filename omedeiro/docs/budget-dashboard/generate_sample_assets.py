#!/usr/bin/env python3
"""
Sample Data Generator for Documentation

Creates realistic but anonymized financial data for documentation examples.
Generates charts and visualizations that can be safely shared publicly.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
from datetime import datetime, timedelta
import random
from pathlib import Path

# Set style
plt.style.use('seaborn-v0_8')
sns.set_palette("husl")

class SampleDataGenerator:
    """Generates realistic sample financial data for documentation."""
    
    def __init__(self):
        self.start_date = datetime(2024, 1, 1)
        self.end_date = datetime(2024, 11, 30)
        self.docs_dir = Path("docs")
        self.images_dir = self.docs_dir / "images"
        self.images_dir.mkdir(parents=True, exist_ok=True)
        
        # Sample merchants by category
        self.merchants = {
            "Food & Dining": [
                "Corner Cafe", "Pizza Palace", "Burger Joint", "Sushi Express",
                "Coffee Central", "Taco Tuesday", "Mediterranean Grill", "Deli Delight"
            ],
            "Transportation": [
                "Metro Transit", "Gas Station A", "Gas Station B", "Rideshare Co",
                "Parking Authority", "Auto Service"
            ],
            "Shopping": [
                "Department Store", "Online Retailer", "Electronics Plus", "Clothing Co",
                "Grocery Chain", "Pharmacy Plus", "Home Goods"
            ],
            "Entertainment": [
                "Movie Theater", "Streaming Service", "Music Store", "Gaming Platform",
                "Sports Bar", "Concert Venue"
            ],
            "Utilities": [
                "Electric Company", "Gas Utility", "Water Department", "Internet Provider",
                "Phone Company"
            ],
            "Subscriptions": [
                "Streaming A", "Streaming B", "Software License", "Gym Membership",
                "Magazine Sub", "Cloud Storage"
            ],
            "Healthcare": [
                "Dr. Smith", "Pharmacy", "Dental Care", "Vision Center"
            ],
            "Housing": [
                "Rent Payment", "Property Management", "Home Insurance"
            ]
        }
        
        # Income sources
        self.income_sources = [
            "Tech Company Salary", "Freelance Work", "Investment Returns", "Side Project"
        ]
    
    def generate_sample_data(self, n_transactions=2000):
        """Generate sample transaction data."""
        transactions = []
        current_date = self.start_date
        
        while current_date <= self.end_date:
            # Generate 3-8 transactions per day
            daily_transactions = random.randint(3, 8)
            
            for _ in range(daily_transactions):
                transaction = self._generate_transaction(current_date)
                transactions.append(transaction)
            
            current_date += timedelta(days=1)
        
        df = pd.DataFrame(transactions)
        return df.sample(n=min(n_transactions, len(df))).sort_values('date').reset_index(drop=True)
    
    def _generate_transaction(self, date):
        """Generate a single transaction."""
        # Choose category (weighted by typical spending frequency)
        category_weights = {
            "Food & Dining": 0.25,
            "Shopping": 0.20,
            "Transportation": 0.15,
            "Entertainment": 0.10,
            "Utilities": 0.05,
            "Subscriptions": 0.03,
            "Healthcare": 0.07,
            "Housing": 0.10,
            "Income": 0.05
        }
        
        category = np.random.choice(
            list(category_weights.keys()),
            p=list(category_weights.values())
        )
        
        if category == "Income":
            merchant = random.choice(self.income_sources)
            amount = random.uniform(2500, 5500)  # Positive for income
            amount = round(amount, 2)
        else:
            merchant = random.choice(self.merchants[category])
            # Category-specific amount ranges
            amount_ranges = {
                "Food & Dining": (8, 75),
                "Shopping": (15, 200),
                "Transportation": (5, 80),
                "Entertainment": (10, 120),
                "Utilities": (50, 350),
                "Subscriptions": (5, 50),
                "Healthcare": (25, 500),
                "Housing": (800, 2500)
            }
            min_amt, max_amt = amount_ranges[category]
            amount = -random.uniform(min_amt, max_amt)  # Negative for expenses
            amount = round(amount, 2)
        
        return {
            "date": date,
            "merchant": merchant,
            "category": category,
            "amount": amount,
            "description": f"{merchant} Purchase"
        }
    
    def create_monthly_trends_chart(self, data):
        """Create monthly trends visualization."""
        monthly_data = data.groupby([data['date'].dt.to_period('M'), 'category'])['amount'].sum().unstack(fill_value=0)
        monthly_totals = data.groupby(data['date'].dt.to_period('M'))['amount'].sum()
        
        # Separate income and expenses
        monthly_income = data[data['amount'] > 0].groupby(data['date'].dt.to_period('M'))['amount'].sum()
        monthly_expenses = data[data['amount'] < 0].groupby(data['date'].dt.to_period('M'))['amount'].sum()
        
        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
        
        # Income vs Expenses
        ax1.plot(monthly_income.index.astype(str), monthly_income.values, 
                marker='o', label='Income', color='green', linewidth=3)
        ax1.plot(monthly_expenses.index.astype(str), abs(monthly_expenses.values), 
                marker='o', label='Expenses', color='red', linewidth=3)
        ax1.set_title('Monthly Income vs Expenses', fontsize=16, fontweight='bold')
        ax1.set_ylabel('Amount ($)', fontsize=12)
        ax1.legend()
        ax1.grid(True, alpha=0.3)
        ax1.tick_params(axis='x', rotation=45)
        
        # Net Amount (Savings)
        net_amount = monthly_income + monthly_expenses  # expenses are negative
        colors = ['green' if x > 0 else 'red' for x in net_amount]
        ax2.bar(range(len(net_amount)), net_amount.values, color=colors, alpha=0.7)
        ax2.set_title('Monthly Net Amount (Savings/Deficit)', fontsize=16, fontweight='bold')
        ax2.set_ylabel('Amount ($)', fontsize=12)
        ax2.set_xlabel('Month', fontsize=12)
        ax2.set_xticks(range(len(net_amount)))
        ax2.set_xticklabels(net_amount.index.astype(str), rotation=45)
        ax2.grid(True, alpha=0.3)
        ax2.axhline(y=0, color='black', linestyle='-', alpha=0.5)
        
        plt.tight_layout()
        plt.savefig(self.images_dir / 'monthly-trends.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def create_category_breakdown_chart(self, data):
        """Create category breakdown visualization."""
        # Filter to expenses only
        expenses = data[data['amount'] < 0].copy()
        expenses['amount'] = abs(expenses['amount'])
        
        category_totals = expenses.groupby('category')['amount'].sum().sort_values(ascending=False)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
        
        # Pie chart
        colors = plt.cm.Set3.colors
        wedges, texts, autotexts = ax1.pie(category_totals.values, labels=category_totals.index, 
                                          autopct='%1.1f%%', startangle=90, colors=colors)
        ax1.set_title('Spending by Category', fontsize=16, fontweight='bold')
        
        # Bar chart
        bars = ax2.barh(range(len(category_totals)), category_totals.values, 
                       color=colors[:len(category_totals)])
        ax2.set_yticks(range(len(category_totals)))
        ax2.set_yticklabels(category_totals.index)
        ax2.set_title('Category Spending Amounts', fontsize=16, fontweight='bold')
        ax2.set_xlabel('Amount ($)', fontsize=12)
        
        # Add value labels on bars
        for i, bar in enumerate(bars):
            width = bar.get_width()
            ax2.text(width + max(category_totals) * 0.01, bar.get_y() + bar.get_height()/2, 
                    f'${width:,.0f}', ha='left', va='center', fontweight='bold')
        
        plt.tight_layout()
        plt.savefig(self.images_dir / 'category-breakdown.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def create_top_merchants_chart(self, data):
        """Create top merchants visualization."""
        expenses = data[data['amount'] < 0].copy()
        expenses['amount'] = abs(expenses['amount'])
        
        merchant_data = expenses.groupby('merchant').agg({
            'amount': ['sum', 'count', 'mean']
        }).round(2)
        
        merchant_data.columns = ['Total_Amount', 'Transaction_Count', 'Avg_Amount']
        top_merchants = merchant_data.sort_values('Total_Amount', ascending=True).tail(15)
        
        fig, ax = plt.subplots(figsize=(12, 8))
        
        bars = ax.barh(range(len(top_merchants)), top_merchants['Total_Amount'].values, 
                      color='steelblue', alpha=0.8)
        ax.set_yticks(range(len(top_merchants)))
        ax.set_yticklabels(top_merchants.index, fontsize=10)
        ax.set_title('Top 15 Merchants by Total Spending', fontsize=16, fontweight='bold')
        ax.set_xlabel('Total Amount ($)', fontsize=12)
        
        # Add value labels
        for i, bar in enumerate(bars):
            width = bar.get_width()
            ax.text(width + max(top_merchants['Total_Amount']) * 0.01, 
                   bar.get_y() + bar.get_height()/2, 
                   f'${width:,.0f}', ha='left', va='center', fontweight='bold', fontsize=9)
        
        ax.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        plt.savefig(self.images_dir / 'top-merchants.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def create_income_sources_chart(self, data):
        """Create income sources visualization."""
        income = data[data['amount'] > 0].copy()
        income_sources = income.groupby('merchant')['amount'].sum().sort_values(ascending=True)
        
        fig, ax = plt.subplots(figsize=(12, 6))
        
        bars = ax.barh(range(len(income_sources)), income_sources.values, 
                      color='green', alpha=0.7)
        ax.set_yticks(range(len(income_sources)))
        ax.set_yticklabels(income_sources.index)
        ax.set_title('Income Sources', fontsize=16, fontweight='bold')
        ax.set_xlabel('Total Income ($)', fontsize=12)
        
        # Add value labels
        for i, bar in enumerate(bars):
            width = bar.get_width()
            ax.text(width + max(income_sources) * 0.01, 
                   bar.get_y() + bar.get_height()/2, 
                   f'${width:,.0f}', ha='left', va='center', fontweight='bold')
        
        ax.grid(True, alpha=0.3, axis='x')
        plt.tight_layout()
        plt.savefig(self.images_dir / 'income-sources.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def create_daily_patterns_chart(self, data):
        """Create daily spending patterns chart."""
        expenses = data[data['amount'] < 0].copy()
        expenses['amount'] = abs(expenses['amount'])
        expenses['day_of_week'] = expenses['date'].dt.day_name()
        
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        daily_spending = expenses.groupby('day_of_week')['amount'].sum().reindex(day_order)
        
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(15, 6))
        
        # Daily spending bar chart
        ax1.bar(daily_spending.index, daily_spending.values, color='skyblue', alpha=0.8)
        ax1.set_title('Spending by Day of Week', fontsize=14, fontweight='bold')
        ax1.set_ylabel('Total Amount ($)', fontsize=12)
        ax1.tick_params(axis='x', rotation=45)
        ax1.grid(True, alpha=0.3, axis='y')
        
        # Weekend vs Weekday pie chart
        weekday_spending = daily_spending[['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']].sum()
        weekend_spending = daily_spending[['Saturday', 'Sunday']].sum()
        
        ax2.pie([weekday_spending, weekend_spending], 
               labels=['Weekday', 'Weekend'], 
               autopct='%1.1f%%',
               colors=['lightblue', 'lightcoral'])
        ax2.set_title('Weekday vs Weekend Spending', fontsize=14, fontweight='bold')
        
        plt.tight_layout()
        plt.savefig(self.images_dir / 'daily-patterns.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def create_subscriptions_chart(self, data):
        """Create subscriptions analysis chart."""
        # Filter for subscriptions
        subs = data[data['category'] == 'Subscriptions'].copy()
        subs['amount'] = abs(subs['amount'])
        subs['month'] = subs['date'].dt.to_period('M')
        
        if subs.empty:
            return
        
        fig, ((ax1, ax2), (ax3, ax4)) = plt.subplots(2, 2, figsize=(16, 12))
        fig.suptitle('Subscription Spending Analysis', fontsize=16, fontweight='bold')
        
        # Monthly subscription spending
        monthly_subs = subs.groupby('month')['amount'].sum()
        ax1.plot(range(len(monthly_subs)), monthly_subs.values, 
                marker='o', color='purple', linewidth=3)
        ax1.set_title('Monthly Subscription Spending')
        ax1.set_ylabel('Amount ($)')
        ax1.set_xticks(range(0, len(monthly_subs), 2))
        ax1.set_xticklabels([str(m) for m in monthly_subs.index[::2]], rotation=45)
        ax1.grid(True, alpha=0.3)
        
        # Top subscription services
        sub_totals = subs.groupby('merchant')['amount'].sum().sort_values(ascending=True)
        ax2.barh(range(len(sub_totals)), sub_totals.values, color='mediumpurple')
        ax2.set_yticks(range(len(sub_totals)))
        ax2.set_yticklabels(sub_totals.index)
        ax2.set_title('Subscription Services by Total Spending')
        ax2.set_xlabel('Total Amount ($)')
        
        # Monthly transaction count
        monthly_count = subs.groupby('month').size()
        ax3.bar(range(len(monthly_count)), monthly_count.values, 
               color='plum', alpha=0.8)
        ax3.set_title('Monthly Subscription Transaction Count')
        ax3.set_ylabel('Number of Transactions')
        ax3.set_xticks(range(0, len(monthly_count), 2))
        ax3.set_xticklabels([str(m) for m in monthly_count.index[::2]], rotation=45)
        
        # Average amount per service
        avg_amounts = subs.groupby('merchant')['amount'].mean()
        ax4.pie(avg_amounts.values, labels=avg_amounts.index, autopct='$%1.0f',
               colors=plt.cm.Set3.colors)
        ax4.set_title('Average Amount per Subscription Service')
        
        plt.tight_layout()
        plt.savefig(self.images_dir / 'subscriptions-analysis.png', dpi=300, bbox_inches='tight')
        plt.close()
    
    def create_interactive_dashboard_preview(self, data):
        """Create a sample interactive dashboard using Plotly."""
        # Create sample plotly chart
        monthly_data = data.groupby([data['date'].dt.to_period('M')])['amount'].sum()
        monthly_income = data[data['amount'] > 0].groupby(data['date'].dt.to_period('M'))['amount'].sum()
        monthly_expenses = data[data['amount'] < 0].groupby(data['date'].dt.to_period('M'))['amount'].sum()
        
        fig = make_subplots(
            rows=2, cols=2,
            subplot_titles=('Monthly Income vs Expenses', 'Category Breakdown', 
                           'Monthly Net Amount', 'Daily Patterns'),
            specs=[[{"secondary_y": False}, {"type": "pie"}],
                   [{"secondary_y": False}, {"secondary_y": False}]]
        )
        
        # Monthly trends
        fig.add_trace(
            go.Scatter(x=[str(m) for m in monthly_income.index], y=monthly_income.values,
                      name="Income", line=dict(color="green")),
            row=1, col=1
        )
        fig.add_trace(
            go.Scatter(x=[str(m) for m in monthly_expenses.index], y=abs(monthly_expenses.values),
                      name="Expenses", line=dict(color="red")),
            row=1, col=1
        )
        
        # Category pie chart
        expenses = data[data['amount'] < 0].copy()
        expenses['amount'] = abs(expenses['amount'])
        category_totals = expenses.groupby('category')['amount'].sum()
        
        fig.add_trace(
            go.Pie(labels=category_totals.index, values=category_totals.values,
                  name="Categories"),
            row=1, col=2
        )
        
        # Net amount
        net_amount = monthly_income + monthly_expenses
        fig.add_trace(
            go.Bar(x=[str(m) for m in net_amount.index], y=net_amount.values,
                  name="Net Amount", 
                  marker_color=['green' if x > 0 else 'red' for x in net_amount.values]),
            row=2, col=1
        )
        
        # Daily patterns
        expenses['day_of_week'] = expenses['date'].dt.day_name()
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        daily_spending = expenses.groupby('day_of_week')['amount'].sum().reindex(day_order)
        
        fig.add_trace(
            go.Bar(x=daily_spending.index, y=daily_spending.values,
                  name="Daily Spending", marker_color="lightblue"),
            row=2, col=2
        )
        
        fig.update_layout(
            height=800,
            showlegend=True,
            title_text="Budget Dashboard - Interactive Preview",
            title_font_size=20
        )
        
        # Save as HTML for documentation
        fig.write_html(self.images_dir / "interactive-dashboard-preview.html")
        
        # Also save a static image (skip if kaleido not available)
        try:
            fig.write_image(self.images_dir / "dashboard-overview.png", width=1200, height=800)
        except Exception as e:
            print(f"Skipping PNG export (kaleido not available): {e}")
            # Create a matplotlib version instead
            import matplotlib.pyplot as plt
            fig, ax = plt.subplots(figsize=(12, 8))
            ax.text(0.5, 0.5, 'Interactive Dashboard Preview\n\nOpen interactive-dashboard-preview.html\nto see the full interactive version', 
                   ha='center', va='center', fontsize=16, 
                   bbox=dict(boxstyle="round,pad=1", facecolor="lightblue"))
            ax.set_xlim(0, 1)
            ax.set_ylim(0, 1)
            ax.axis('off')
            plt.savefig(self.images_dir / 'dashboard-overview.png', dpi=300, bbox_inches='tight')
            plt.close()
    
    def generate_all_documentation_assets(self):
        """Generate all charts and assets for documentation."""
        print("Generating sample data for documentation...")
        data = self.generate_sample_data(2000)
        
        print("Creating visualization assets...")
        self.create_monthly_trends_chart(data)
        self.create_category_breakdown_chart(data)
        self.create_top_merchants_chart(data)
        self.create_income_sources_chart(data)
        self.create_daily_patterns_chart(data)
        self.create_subscriptions_chart(data)
        self.create_interactive_dashboard_preview(data)
        
        print(f"All documentation assets created in {self.images_dir}")
        print("\nGenerated files:")
        for file in sorted(self.images_dir.glob("*")):
            print(f"  - {file.name}")

if __name__ == "__main__":
    generator = SampleDataGenerator()
    generator.generate_all_documentation_assets()
