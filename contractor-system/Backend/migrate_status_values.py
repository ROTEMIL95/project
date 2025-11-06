"""
Migration script to convert Hebrew status values to English in the database.

This script updates all existing quotes with Hebrew status values to English equivalents:
- Hebrew 'approved' -> 'approved'
- Hebrew 'draft' -> 'draft'
- Hebrew 'sent' -> 'sent'
- Hebrew 'rejected' -> 'rejected'
- Hebrew 'cancelled' -> 'cancelled'
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client

# Fix Windows console encoding for Hebrew characters
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

# Load environment variables
load_dotenv()

# Get Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: Missing environment variables")
    print(f"  SUPABASE_URL: {'✓' if SUPABASE_URL else '✗'}")
    print(f"  SUPABASE_SERVICE_KEY: {'✓' if SUPABASE_SERVICE_KEY else '✗'}")
    exit(1)

# Create Supabase admin client
supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Status mapping: Hebrew -> English
STATUS_MAPPING = {
    'אושר': 'approved',
    'טיוטה': 'draft',
    'נשלח': 'sent',
    'נדחה': 'rejected',
    'בוטל': 'cancelled',
}

def migrate_status_values():
    """Migrate all Hebrew status values to English in the quotes table."""
    
    print("Starting status migration...")
    print(f"Supabase URL: {SUPABASE_URL}")
    
    try:
        # Fetch all quotes
        response = supabase.table("quotes").select("id, status").execute()
        quotes = response.data
        
        print(f"\nFound {len(quotes)} quotes in database")
        
        updated_count = 0
        skipped_count = 0
        
        for quote in quotes:
            quote_id = quote['id']
            current_status = quote.get('status')
            
            if not current_status:
                print(f"  Quote {quote_id}: No status (NULL) - skipping")
                skipped_count += 1
                continue
            
            # Check if status needs migration
            if current_status in STATUS_MAPPING:
                new_status = STATUS_MAPPING[current_status]
                try:
                    print(f"  Quote {quote_id}: Migrating Hebrew status -> '{new_status}'")
                except:
                    print(f"  Quote {quote_id}: Migrating status to '{new_status}'")
                
                # Update the quote
                update_response = supabase.table("quotes").update({
                    "status": new_status
                }).eq("id", quote_id).execute()
                
                if update_response.data:
                    updated_count += 1
                else:
                    print(f"    ERROR: Failed to update quote {quote_id}")
                    
            elif current_status in STATUS_MAPPING.values():
                # Already in English
                print(f"  Quote {quote_id}: Already in English ('{current_status}') - skipping")
                skipped_count += 1
            else:
                # Unknown status
                print(f"  Quote {quote_id}: Unknown status - skipping")
                skipped_count += 1
        
        print(f"\n[SUCCESS] Migration complete!")
        print(f"   Updated: {updated_count} quotes")
        print(f"   Skipped: {skipped_count} quotes")
        
    except Exception as e:
        print(f"\n[ERROR] Migration failed with error:")
        print(f"   {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    migrate_status_values()

