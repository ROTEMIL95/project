"""
Test Finance.jsx payload structure against updated model
"""

import sys
import io
from datetime import date
from app.models.financial import FinancialTransactionCreate
from pydantic import ValidationError

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

print("=" * 60)
print("Testing Finance.jsx Payload Structure")
print("=" * 60)

# Simulate the payload that Finance.jsx sends (after snake_case conversion)
finance_jsx_payload = {
    "quote_id": "550e8400-e29b-41d4-a716-446655440000",
    "transaction_date": "2025-11-08",
    "revenue": 15000.50,
    "estimated_cost": 8500.00,
    "estimated_profit": 6500.50,
    "status": "completed",
    "project_type": "שיפוץ כללי"
}

print("\nTest 1: Finance.jsx payload (quote-related transaction)")
print("Payload:", finance_jsx_payload)
try:
    transaction = FinancialTransactionCreate(**finance_jsx_payload)
    print("✅ PASSED: Finance.jsx payload accepted")
    print(f"   Validated data: {transaction.model_dump()}")
except ValidationError as e:
    print(f"❌ FAILED: {e}")

print("\n" + "=" * 60)

# Test traditional validated payload still works
traditional_payload = {
    "type": "income",
    "category": "quote_payment",
    "amount": 5000.50,
    "description": "Payment for project ABC",
    "transaction_date": "2025-11-08"
}

print("\nTest 2: Traditional validated payload")
print("Payload:", traditional_payload)
try:
    transaction = FinancialTransactionCreate(**traditional_payload)
    print("✅ PASSED: Traditional payload still accepted")
    print(f"   Validated data: {transaction.model_dump()}")
except ValidationError as e:
    print(f"❌ FAILED: {e}")

print("\n" + "=" * 60)

# Test combined payload (both old and new fields)
combined_payload = {
    "type": "income",
    "category": "quote_payment",
    "amount": 15000.50,
    "description": "Quote payment",
    "transaction_date": "2025-11-08",
    "quote_id": "550e8400-e29b-41d4-a716-446655440000",
    "revenue": 15000.50,
    "estimated_cost": 8500.00,
    "estimated_profit": 6500.50,
    "status": "completed",
    "project_type": "שיפוץ כללי"
}

print("\nTest 3: Combined payload (old + new fields)")
print("Payload:", combined_payload)
try:
    transaction = FinancialTransactionCreate(**combined_payload)
    print("✅ PASSED: Combined payload accepted")
    print(f"   Validated data: {transaction.model_dump()}")
except ValidationError as e:
    print(f"❌ FAILED: {e}")

print("\n" + "=" * 60)
print("VERIFICATION COMPLETE")
print("=" * 60)

