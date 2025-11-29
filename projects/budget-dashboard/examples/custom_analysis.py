#!/usr/bin/env python3
"""
Custom Analysis Examples

This file demonstrates how to create custom analysis functions
for specific financial insights beyond the standard dashboard.
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add the project root to the path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root / "scripts" / "analytics"))

from budget_analyzer import BudgetAnalyzer

class CustomFinancialAnalyzer:
    """Extended analyzer with custom financial insights."""
    
    def __init__(self, data=None):
        self.base_analyzer = BudgetAnalyzer(data)
        self.data = self.base_analyzer.data
    
    def analyze_debt_payoff_simulation(self, debt_amount, monthly_payment, interest_rate):
        """
        Simulate debt payoff based on current spending patterns.
        
        Args:
            debt_amount: Total debt amount
            monthly_payment: Proposed monthly payment
            interest_rate: Annual interest rate (as decimal)
            
        Returns:
            dict: Payoff analysis including timeline and total interest
        """
        monthly_rate = interest_rate / 12
        
        # Calculate payoff timeline
        if monthly_payment <= debt_amount * monthly_rate:
            return {"error": "Payment too small - debt will never be paid off"}
        
        months = 0
        remaining = debt_amount
        total_interest = 0
        
        while remaining > 0:
            interest_charge = remaining * monthly_rate
            principal_payment = min(monthly_payment - interest_charge, remaining)
            
            total_interest += interest_charge
            remaining -= principal_payment
            months += 1
            
            if months > 600:  # Safety check for 50 years
                break
        
        return {
            "months_to_payoff": months,
            "years_to_payoff": months / 12,
            "total_interest_paid": total_interest,
            "total_amount_paid": debt_amount + total_interest,
            "monthly_payment_amount": monthly_payment
        }
    
    def analyze_emergency_fund_adequacy(self, target_months=6):
        """
        Analyze if current savings rate supports adequate emergency fund.
        
        Args:
            target_months: Target months of expenses to save
            
        Returns:
            dict: Emergency fund analysis
        """
        monthly_analysis = self.base_analyzer.monthly_analysis()
        
        if monthly_analysis.empty:
            return {"error": "No monthly data available"}
        
        avg_monthly_expenses = abs(monthly_analysis["Total_Expenses"].mean())
        target_emergency_fund = avg_monthly_expenses * target_months
        
        avg_monthly_savings = monthly_analysis["Net_Amount"].mean()
        
        if avg_monthly_savings <= 0:
            months_to_target = float('inf')
        else:
            months_to_target = target_emergency_fund / avg_monthly_savings
        
        return {
            "average_monthly_expenses": avg_monthly_expenses,
            "target_emergency_fund": target_emergency_fund,
            "average_monthly_savings": avg_monthly_savings,
            "months_to_target": months_to_target,
            "years_to_target": months_to_target / 12 if months_to_target != float('inf') else float('inf'),
            "current_savings_adequate": avg_monthly_savings > 0 and months_to_target <= 24
        }
    
    def analyze_spending_elasticity(self, category, percentage_change):
        """
        Analyze impact of changing spending in one category.
        
        Args:
            category: Category to modify
            percentage_change: Percentage change in spending (e.g., -0.2 for 20% reduction)
            
        Returns:
            dict: Impact analysis
        """
        category_analysis = self.base_analyzer.category_analysis()
        
        if category not in category_analysis.index:
            return {"error": f"Category '{category}' not found"}
        
        current_spending = abs(category_analysis.loc[category, "Expense_Amount"])
        spending_change = current_spending * percentage_change
        
        monthly_analysis = self.base_analyzer.monthly_analysis()
        avg_monthly_savings = monthly_analysis["Net_Amount"].mean()
        new_monthly_savings = avg_monthly_savings - spending_change
        
        # Calculate compound impact over time
        def compound_savings(monthly_amount, months, annual_return=0.07):
            monthly_return = annual_return / 12
            return monthly_amount * (((1 + monthly_return) ** months - 1) / monthly_return)
        
        savings_1_year = compound_savings(-spending_change, 12)
        savings_5_years = compound_savings(-spending_change, 60)
        savings_10_years = compound_savings(-spending_change, 120)
        
        return {
            "category": category,
            "current_monthly_spending": current_spending / len(monthly_analysis),
            "monthly_spending_change": spending_change / len(monthly_analysis),
            "annual_spending_change": spending_change,
            "current_monthly_savings": avg_monthly_savings,
            "new_monthly_savings": new_monthly_savings,
            "compound_savings_1_year": savings_1_year,
            "compound_savings_5_years": savings_5_years,
            "compound_savings_10_years": savings_10_years
        }
    
    def analyze_weekend_vs_weekday_patterns(self):
        """
        Detailed analysis of weekend vs weekday spending patterns.
        
        Returns:
            dict: Weekend spending analysis
        """
        if self.data.empty:
            return {"error": "No data available"}
        
        # Ensure we have day of week data
        if 'Day_of_Week' not in self.data.columns:
            self.data['Day_of_Week'] = pd.to_datetime(self.data['Transaction Date']).dt.day_name()
        
        # Categorize as weekend/weekday
        weekend_days = ['Saturday', 'Sunday']
        weekday_data = self.data[~self.data['Day_of_Week'].isin(weekend_days)]
        weekend_data = self.data[self.data['Day_of_Week'].isin(weekend_days)]
        
        # Calculate spending by category for each
        weekday_spending = weekday_data[weekday_data['Amount'] < 0].groupby('Category_Clean')['Amount'].sum().abs()
        weekend_spending = weekend_data[weekend_data['Amount'] < 0].groupby('Category_Clean')['Amount'].sum().abs()
        
        # Calculate daily averages (accounting for different number of days)
        total_weekdays = len(weekday_data['Transaction Date'].dt.date.unique())
        total_weekends = len(weekend_data['Transaction Date'].dt.date.unique())
        
        weekday_daily_avg = weekday_spending / max(total_weekdays, 1)
        weekend_daily_avg = weekend_spending / max(total_weekends, 1)
        
        # Find categories with biggest weekend differences
        comparison = pd.DataFrame({
            'weekday_avg': weekday_daily_avg,
            'weekend_avg': weekend_daily_avg
        }).fillna(0)
        
        comparison['weekend_premium'] = comparison['weekend_avg'] - comparison['weekday_avg']
        comparison['weekend_multiplier'] = comparison['weekend_avg'] / comparison['weekday_avg'].replace(0, 1)
        
        return {
            "total_weekday_spending": weekday_spending.sum(),
            "total_weekend_spending": weekend_spending.sum(),
            "weekday_daily_average": weekday_daily_avg.sum(),
            "weekend_daily_average": weekend_daily_avg.sum(),
            "weekend_premium_total": comparison['weekend_premium'].sum(),
            "category_comparison": comparison.sort_values('weekend_premium', ascending=False).to_dict('index'),
            "biggest_weekend_categories": comparison.nlargest(5, 'weekend_premium').index.tolist()
        }
    
    def analyze_subscription_roi(self):
        """
        Analyze return on investment for subscription services.
        
        Returns:
            dict: Subscription ROI analysis
        """
        # Get subscription data
        subscription_data = self.base_analyzer.analyze_monthly_subscriptions()
        
        if subscription_data.empty:
            return {"error": "No subscription data found"}
        
        # Estimate usage and value
        roi_analysis = {}
        
        for idx, sub in subscription_data.iterrows():
            merchant = sub['Merchant']
            monthly_cost = sub['Avg_Amount']
            
            # Basic ROI estimates (could be enhanced with actual usage data)
            estimated_usage_hours = {
                'streaming': 20,  # hours per month
                'gym': 8,         # visits per month  
                'software': 40,   # hours per month
                'cloud': 24*30,   # hours per month (always available)
            }
            
            # Categorize subscription type
            if any(term in merchant.lower() for term in ['netflix', 'spotify', 'disney', 'streaming']):
                category = 'streaming'
            elif any(term in merchant.lower() for term in ['gym', 'fitness', 'yoga']):
                category = 'gym'
            elif any(term in merchant.lower() for term in ['adobe', 'microsoft', 'software']):
                category = 'software'
            elif any(term in merchant.lower() for term in ['cloud', 'storage', 'backup']):
                category = 'cloud'
            else:
                category = 'other'
            
            usage_hours = estimated_usage_hours.get(category, 10)
            cost_per_hour = monthly_cost / usage_hours
            
            roi_analysis[merchant] = {
                'monthly_cost': monthly_cost,
                'category': category,
                'estimated_usage_hours': usage_hours,
                'cost_per_hour': cost_per_hour,
                'annual_cost': monthly_cost * 12,
                'value_rating': 'high' if cost_per_hour < 2 else 'medium' if cost_per_hour < 5 else 'low'
            }
        
        return {
            "total_monthly_subscriptions": subscription_data['Avg_Amount'].sum(),
            "total_annual_subscriptions": subscription_data['Avg_Amount'].sum() * 12,
            "subscription_count": len(subscription_data),
            "roi_analysis": roi_analysis,
            "optimization_suggestions": self._get_subscription_optimization_suggestions(roi_analysis)
        }
    
    def _get_subscription_optimization_suggestions(self, roi_analysis):
        """Generate subscription optimization suggestions."""
        suggestions = []
        
        for merchant, data in roi_analysis.items():
            if data['value_rating'] == 'low':
                suggestions.append(f"Consider canceling {merchant} (${data['cost_per_hour']:.2f}/hour)")
            elif data['cost_per_hour'] > 10:
                suggestions.append(f"Review usage of {merchant} - high cost per hour")
        
        # Find duplicate categories
        categories = {}
        for merchant, data in roi_analysis.items():
            cat = data['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(merchant)
        
        for category, merchants in categories.items():
            if len(merchants) > 1 and category == 'streaming':
                suggestions.append(f"Multiple streaming services: {', '.join(merchants)} - consider consolidating")
        
        return suggestions

def example_custom_analysis():
    """Example of running custom analysis."""
    
    # Initialize custom analyzer
    print("Initializing Custom Financial Analyzer...")
    analyzer = CustomFinancialAnalyzer()
    
    if analyzer.data.empty:
        print("No data available. Please run the main analysis pipeline first.")
        return
    
    print(f"Loaded {len(analyzer.data)} transactions")
    print("\n" + "="*60)
    print("CUSTOM FINANCIAL ANALYSIS")
    print("="*60)
    
    # 1. Debt Payoff Simulation
    print("\n1. DEBT PAYOFF SIMULATION")
    print("-" * 30)
    debt_analysis = analyzer.analyze_debt_payoff_simulation(
        debt_amount=15000,
        monthly_payment=500,
        interest_rate=0.18  # 18% APR
    )
    
    if "error" not in debt_analysis:
        print(f"Debt Amount: $15,000")
        print(f"Monthly Payment: $500")
        print(f"Interest Rate: 18%")
        print(f"Payoff Time: {debt_analysis['years_to_payoff']:.1f} years")
        print(f"Total Interest: ${debt_analysis['total_interest_paid']:,.2f}")
        print(f"Total Amount Paid: ${debt_analysis['total_amount_paid']:,.2f}")
    
    # 2. Emergency Fund Analysis
    print("\n2. EMERGENCY FUND ANALYSIS")
    print("-" * 30)
    emergency_analysis = analyzer.analyze_emergency_fund_adequacy(target_months=6)
    
    if "error" not in emergency_analysis:
        print(f"Average Monthly Expenses: ${emergency_analysis['average_monthly_expenses']:,.2f}")
        print(f"Target Emergency Fund (6 months): ${emergency_analysis['target_emergency_fund']:,.2f}")
        print(f"Average Monthly Savings: ${emergency_analysis['average_monthly_savings']:,.2f}")
        
        if emergency_analysis['months_to_target'] != float('inf'):
            print(f"Time to Target: {emergency_analysis['years_to_target']:.1f} years")
        else:
            print("Time to Target: Never (negative savings)")
        
        print(f"Current Savings Adequate: {'Yes' if emergency_analysis['current_savings_adequate'] else 'No'}")
    
    # 3. Spending Elasticity Analysis
    print("\n3. SPENDING ELASTICITY ANALYSIS")
    print("-" * 35)
    print("What if you reduced dining out by 20%?")
    
    elasticity_analysis = analyzer.analyze_spending_elasticity("Food & Dining", -0.2)
    
    if "error" not in elasticity_analysis:
        print(f"Current Monthly Dining: ${elasticity_analysis['current_monthly_spending']:,.2f}")
        print(f"Reduction Amount: ${abs(elasticity_analysis['monthly_spending_change']):,.2f}/month")
        print(f"Compound Savings (1 year): ${elasticity_analysis['compound_savings_1_year']:,.2f}")
        print(f"Compound Savings (5 years): ${elasticity_analysis['compound_savings_5_years']:,.2f}")
        print(f"Compound Savings (10 years): ${elasticity_analysis['compound_savings_10_years']:,.2f}")
    
    # 4. Weekend Spending Analysis
    print("\n4. WEEKEND vs WEEKDAY SPENDING")
    print("-" * 35)
    weekend_analysis = analyzer.analyze_weekend_vs_weekday_patterns()
    
    if "error" not in weekend_analysis:
        print(f"Weekday Daily Average: ${weekend_analysis['weekday_daily_average']:,.2f}")
        print(f"Weekend Daily Average: ${weekend_analysis['weekend_daily_average']:,.2f}")
        print(f"Weekend Premium: ${weekend_analysis['weekend_premium_total']:,.2f}/day")
        print("Top Weekend Categories:")
        for category in weekend_analysis['biggest_weekend_categories'][:3]:
            print(f"  - {category}")
    
    # 5. Subscription ROI Analysis
    print("\n5. SUBSCRIPTION ROI ANALYSIS")
    print("-" * 30)
    subscription_roi = analyzer.analyze_subscription_roi()
    
    if "error" not in subscription_roi:
        print(f"Total Monthly Subscriptions: ${subscription_roi['total_monthly_subscriptions']:,.2f}")
        print(f"Total Annual Cost: ${subscription_roi['total_annual_subscriptions']:,.2f}")
        print(f"Number of Subscriptions: {subscription_roi['subscription_count']}")
        
        print("\nOptimization Suggestions:")
        for suggestion in subscription_roi['optimization_suggestions'][:3]:
            print(f"  • {suggestion}")
    
    print("\n" + "="*60)
    print("CUSTOM ANALYSIS COMPLETE")
    print("="*60)

if __name__ == "__main__":
    example_custom_analysis()
