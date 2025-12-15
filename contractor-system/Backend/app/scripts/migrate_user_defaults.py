"""
Migration script to update existing users with new default data fields.
Adds demolition_items, demolition_defaults, tilingItems, and paintItems to users who don't have them.
"""
import sys
import os
import json
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.config import settings
from supabase import create_client

def load_default_data():
    """Load default user data from JSON file"""
    default_data_path = Path(__file__).parent.parent / 'data' / 'default_user_data.json'
    with open(default_data_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def migrate_users():
    """Update all existing users with new default data fields"""
    print("Starting user migration...")

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Load default data
    try:
        default_data = load_default_data()
        print(f"[OK] Loaded default data:")
        print(f"  - {len(default_data.get('demolition_items', []))} demolition items")
        print(f"  - {len(default_data.get('tiling_items', []))} tiling items")
        print(f"  - {len(default_data.get('paint_items', []))} paint items")
    except Exception as e:
        print(f"[ERROR] Failed to load default data: {e}")
        return

    # Fetch all users from user_profiles
    try:
        response = supabase.table("user_profiles").select("*").execute()
        users = response.data
        print(f"\n[OK] Found {len(users)} users to check")
    except Exception as e:
        print(f"[ERROR] Failed to fetch users: {e}")
        return

    updated_count = 0
    skipped_count = 0

    # Update each user
    for user in users:
        user_id = user.get('auth_user_id')
        email = user.get('email', 'unknown')

        # Check which fields are missing or empty
        needs_update = False
        update_data = {}

        # Check demolition_items
        if not user.get('demolition_items') or len(user.get('demolition_items', [])) == 0:
            update_data['demolition_items'] = default_data.get('demolition_items', [])
            needs_update = True

        # Check demolition_defaults
        if not user.get('demolition_defaults'):
            update_data['demolition_defaults'] = default_data.get('demolition_defaults', {
                "laborCostPerDay": 1000,
                "profitPercent": 40
            })
            needs_update = True

        # Check tiling_items
        if not user.get('tiling_items') or len(user.get('tiling_items', [])) == 0:
            update_data['tiling_items'] = default_data.get('tiling_items', [])
            needs_update = True

        # Check paint_items
        if not user.get('paint_items') or len(user.get('paint_items', [])) == 0:
            update_data['paint_items'] = default_data.get('paint_items', [])
            needs_update = True

        # Also check and update older fields if they're missing
        if not user.get('plumbing_subcontractor_items') or len(user.get('plumbing_subcontractor_items', [])) == 0:
            update_data['plumbing_subcontractor_items'] = default_data.get('plumbing_subcontractor_items', [])
            update_data['plumbing_defaults'] = default_data.get('plumbing_defaults', {"desiredProfitPercent": 30})
            needs_update = True

        if not user.get('electrical_subcontractor_items') or len(user.get('electrical_subcontractor_items', [])) == 0:
            update_data['electrical_subcontractor_items'] = default_data.get('electrical_subcontractor_items', [])
            update_data['electrical_defaults'] = default_data.get('electrical_defaults', {"desiredProfitPercent": 40})
            needs_update = True

        if not user.get('construction_subcontractor_items') or len(user.get('construction_subcontractor_items', [])) == 0:
            update_data['construction_subcontractor_items'] = default_data.get('construction_subcontractor_items', [])
            update_data['construction_defaults'] = default_data.get('construction_defaults', {
                "desiredProfitPercent": 30,
                "workerCostPerUnit": 1000
            })
            needs_update = True

        if needs_update:
            try:
                supabase.table("user_profiles").update(update_data).eq("auth_user_id", user_id).execute()
                updated_count += 1
                print(f"[OK] Updated user: {email} (added {len(update_data)} fields)")
            except Exception as e:
                print(f"[ERROR] Failed to update user {email}: {e}")
        else:
            skipped_count += 1
            print(f"[SKIP] Skipped user: {email} (already has all data)")

    print(f"\n{'='*60}")
    print(f"Migration complete!")
    print(f"  [OK] Updated: {updated_count} users")
    print(f"  [SKIP] Skipped: {skipped_count} users (already had data)")
    print(f"  Total: {len(users)} users processed")
    print(f"{'='*60}")

if __name__ == "__main__":
    migrate_users()
