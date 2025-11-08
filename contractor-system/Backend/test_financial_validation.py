"""
Quick smoke test for financial transaction validation logic
Run this with: python test_financial_validation.py
"""

import sys
import io
from datetime import date
from app.models.financial import FinancialTransactionCreate
from pydantic import ValidationError
import json

# Fix encoding for Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')


def test_valid_payload():
    """Test a valid payload"""
    print("=" * 60)
    print("TEST 1: Valid Payload")
    print("=" * 60)
    
    valid_payload = {
        "type": "income",
        "category": "quote_payment",
        "amount": 5000.50,
        "description": "Payment for project ABC",
        "transaction_date": "2025-11-08",
        "payment_method": "bank_transfer",
        "reference_number": "REF-12345"
    }
    
    try:
        transaction = FinancialTransactionCreate(**valid_payload)
        print("✅ PASSED: Valid payload accepted")
        print(f"   Parsed data: {transaction.model_dump()}")
        print(f"   Transaction date type: {type(transaction.transaction_date)}")
    except ValidationError as e:
        print(f"❌ FAILED: {e}")
    print()


def test_missing_required_fields():
    """Test missing required fields"""
    print("=" * 60)
    print("TEST 2: Missing Required Fields")
    print("=" * 60)
    
    test_cases = [
        {"name": "missing type", "data": {
            "category": "quote_payment",
            "amount": 5000,
            "description": "Payment",
            "transaction_date": "2025-11-08"
        }},
        {"name": "missing category", "data": {
            "type": "income",
            "amount": 5000,
            "description": "Payment",
            "transaction_date": "2025-11-08"
        }},
        {"name": "missing amount", "data": {
            "type": "income",
            "category": "quote_payment",
            "description": "Payment",
            "transaction_date": "2025-11-08"
        }},
        {"name": "missing description", "data": {
            "type": "income",
            "category": "quote_payment",
            "amount": 5000,
            "transaction_date": "2025-11-08"
        }},
        {"name": "missing transaction_date", "data": {
            "type": "income",
            "category": "quote_payment",
            "amount": 5000,
            "description": "Payment"
        }},
    ]
    
    for test_case in test_cases:
        try:
            transaction = FinancialTransactionCreate(**test_case["data"])
            print(f"❌ FAILED ({test_case['name']}): Should have raised ValidationError")
        except ValidationError as e:
            print(f"✅ PASSED ({test_case['name']}): Validation error raised correctly")
            print(f"   Error: {e.errors()[0]['msg']}")
    print()


def test_invalid_enum_values():
    """Test invalid enum values"""
    print("=" * 60)
    print("TEST 3: Invalid Enum Values")
    print("=" * 60)
    
    test_cases = [
        {"name": "invalid type", "data": {
            "type": "profit",  # Invalid
            "category": "quote_payment",
            "amount": 5000,
            "description": "Payment",
            "transaction_date": "2025-11-08"
        }},
        {"name": "invalid category", "data": {
            "type": "income",
            "category": "rent_payment",  # Invalid
            "amount": 5000,
            "description": "Payment",
            "transaction_date": "2025-11-08"
        }},
        {"name": "invalid payment_method", "data": {
            "type": "income",
            "category": "quote_payment",
            "amount": 5000,
            "description": "Payment",
            "transaction_date": "2025-11-08",
            "payment_method": "paypal"  # Invalid
        }},
    ]
    
    for test_case in test_cases:
        try:
            transaction = FinancialTransactionCreate(**test_case["data"])
            print(f"❌ FAILED ({test_case['name']}): Should have raised ValidationError")
        except ValidationError as e:
            print(f"✅ PASSED ({test_case['name']}): Validation error raised correctly")
            print(f"   Error: {e.errors()[0]['msg']}")
    print()


def test_invalid_amount():
    """Test invalid amount values"""
    print("=" * 60)
    print("TEST 4: Invalid Amount Values")
    print("=" * 60)
    
    test_cases = [
        {"name": "zero amount", "amount": 0},
        {"name": "negative amount", "amount": -100},
    ]
    
    for test_case in test_cases:
        data = {
            "type": "income",
            "category": "quote_payment",
            "amount": test_case["amount"],
            "description": "Payment",
            "transaction_date": "2025-11-08"
        }
        try:
            transaction = FinancialTransactionCreate(**data)
            print(f"❌ FAILED ({test_case['name']}): Should have raised ValidationError")
        except ValidationError as e:
            print(f"✅ PASSED ({test_case['name']}): Validation error raised correctly")
            print(f"   Error: {e.errors()[0]['msg']}")
    print()


def test_date_formats():
    """Test different date formats"""
    print("=" * 60)
    print("TEST 5: Date Format Handling")
    print("=" * 60)
    
    test_cases = [
        {"name": "ISO format (YYYY-MM-DD)", "date": "2025-11-08", "should_pass": True},
        {"name": "datetime object", "date": date(2025, 11, 8), "should_pass": True},
        {"name": "invalid format", "date": "11/08/2025", "should_pass": False},
        {"name": "invalid date string", "date": "not-a-date", "should_pass": False},
    ]
    
    for test_case in test_cases:
        data = {
            "type": "income",
            "category": "quote_payment",
            "amount": 5000,
            "description": "Payment",
            "transaction_date": test_case["date"]
        }
        try:
            transaction = FinancialTransactionCreate(**data)
            if test_case["should_pass"]:
                print(f"✅ PASSED ({test_case['name']}): Correctly accepted")
                print(f"   Parsed date: {transaction.transaction_date}")
            else:
                print(f"❌ FAILED ({test_case['name']}): Should have raised ValidationError")
        except ValidationError as e:
            if not test_case["should_pass"]:
                print(f"✅ PASSED ({test_case['name']}): Correctly rejected")
                print(f"   Error: {e.errors()[0]['msg']}")
            else:
                print(f"❌ FAILED ({test_case['name']}): Should have been accepted")
    print()


def test_optional_fields():
    """Test optional fields"""
    print("=" * 60)
    print("TEST 6: Optional Fields")
    print("=" * 60)
    
    # Minimal payload (only required fields)
    minimal_payload = {
        "type": "expense",
        "category": "supplier_payment",
        "amount": 1500.75,
        "description": "Supplier payment for materials",
        "transaction_date": "2025-11-08"
    }
    
    try:
        transaction = FinancialTransactionCreate(**minimal_payload)
        print("✅ PASSED: Minimal payload with only required fields accepted")
        print(f"   Optional fields are None: payment_method={transaction.payment_method}, notes={transaction.notes}")
    except ValidationError as e:
        print(f"❌ FAILED: {e}")
    print()
    
    # Full payload with all optional fields
    full_payload = {
        "type": "income",
        "category": "quote_payment",
        "amount": 10000,
        "description": "Full project payment",
        "transaction_date": "2025-11-08",
        "payment_method": "credit_card",
        "reference_number": "REF-99999",
        "project_id": "550e8400-e29b-41d4-a716-446655440000",
        "quote_id": "660e8400-e29b-41d4-a716-446655440000",
        "client_id": "770e8400-e29b-41d4-a716-446655440000",
        "notes": "Final payment for completed project"
    }
    
    try:
        transaction = FinancialTransactionCreate(**full_payload)
        print("✅ PASSED: Full payload with all optional fields accepted")
        print(f"   All fields populated correctly")
    except ValidationError as e:
        print(f"❌ FAILED: {e}")
    print()


def test_valid_enum_values():
    """Test all valid enum values"""
    print("=" * 60)
    print("TEST 7: All Valid Enum Values")
    print("=" * 60)
    
    types = ['income', 'expense']
    categories = ['quote_payment', 'project_cost', 'supplier_payment', 'salary', 'other']
    payment_methods = ['cash', 'bank_transfer', 'check', 'credit_card']
    
    print(f"Valid types: {types}")
    print(f"Valid categories: {categories}")
    print(f"Valid payment_methods: {payment_methods}")
    
    # Test each type
    for t in types:
        data = {
            "type": t,
            "category": "other",
            "amount": 100,
            "description": f"Test {t}",
            "transaction_date": "2025-11-08"
        }
        try:
            transaction = FinancialTransactionCreate(**data)
            print(f"✅ Type '{t}' accepted")
        except ValidationError as e:
            print(f"❌ Type '{t}' rejected: {e}")
    
    # Test each category
    for cat in categories:
        data = {
            "type": "income",
            "category": cat,
            "amount": 100,
            "description": f"Test {cat}",
            "transaction_date": "2025-11-08"
        }
        try:
            transaction = FinancialTransactionCreate(**data)
            print(f"✅ Category '{cat}' accepted")
        except ValidationError as e:
            print(f"❌ Category '{cat}' rejected: {e}")
    
    # Test each payment method
    for pm in payment_methods:
        data = {
            "type": "income",
            "category": "other",
            "amount": 100,
            "description": "Test payment",
            "transaction_date": "2025-11-08",
            "payment_method": pm
        }
        try:
            transaction = FinancialTransactionCreate(**data)
            print(f"✅ Payment method '{pm}' accepted")
        except ValidationError as e:
            print(f"❌ Payment method '{pm}' rejected: {e}")
    print()


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("FINANCIAL TRANSACTION VALIDATION SMOKE TEST")
    print("=" * 60 + "\n")
    
    test_valid_payload()
    test_missing_required_fields()
    test_invalid_enum_values()
    test_invalid_amount()
    test_date_formats()
    test_optional_fields()
    test_valid_enum_values()
    
    print("=" * 60)
    print("SMOKE TEST COMPLETE")
    print("=" * 60)

