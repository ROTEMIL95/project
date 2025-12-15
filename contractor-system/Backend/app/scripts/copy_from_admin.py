"""
Copy all pricing data from admin user (rotemiluz53@gmail.com) to all other users.
This ensures all users have the complete, properly formatted data.
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.config import settings
from supabase import create_client

ADMIN_EMAIL = "rotemiluz53@gmail.com"

def copy_from_admin():
    """Copy data from admin to all other users"""
    print("Starting copy from admin user...")

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Step 1: Fetch admin user data
    print(f"\n[1/4] Fetching admin user data from {ADMIN_EMAIL}...")
    try:
        admin_response = supabase.table("user_profiles").select("*").eq("email", ADMIN_EMAIL).execute()

        if not admin_response.data or len(admin_response.data) == 0:
            print(f"[ERROR] Admin user {ADMIN_EMAIL} not found!")
            return

        admin = admin_response.data[0]
        print(f"[OK] Found admin user")

    except Exception as e:
        print(f"[ERROR] Failed to fetch admin user: {e}")
        return

    # Step 2: Prepare data to copy
    data_to_copy = {
        'plumbing_subcontractor_items': admin.get('plumbing_subcontractor_items', []),
        'plumbing_defaults': admin.get('plumbing_defaults', {}),
        'electrical_subcontractor_items': admin.get('electrical_subcontractor_items', []),
        'electrical_defaults': admin.get('electrical_defaults', {}),
        'construction_subcontractor_items': admin.get('construction_subcontractor_items', []),
        'construction_defaults': admin.get('construction_defaults', {}),
        'demolition_items': admin.get('demolition_items', []),
        'demolition_defaults': admin.get('demolition_defaults', {}),
        'paint_items': admin.get('paint_items', []),
        'paint_user_defaults': admin.get('paint_user_defaults', {}),
        'tiling_items': admin.get('tiling_items', []),
        'tiling_user_defaults': admin.get('tiling_user_defaults', {}),
    }

    print(f"\n[2/4] Admin data summary:")
    print(f"  Plumbing items: {len(data_to_copy['plumbing_subcontractor_items'])}")
    print(f"  Electrical items: {len(data_to_copy['electrical_subcontractor_items'])}")
    print(f"  Construction items: {len(data_to_copy['construction_subcontractor_items'])}")
    print(f"  Demolition items: {len(data_to_copy['demolition_items'])}")
    print(f"  Paint items: {len(data_to_copy['paint_items'])}")
    print(f"  Tiling items: {len(data_to_copy['tiling_items'])}")

    # Step 3: Fetch all users (excluding admin)
    print(f"\n[3/4] Fetching all non-admin users...")
    try:
        users_response = supabase.table("user_profiles").select("auth_user_id, email").neq("email", ADMIN_EMAIL).execute()
        users = users_response.data
        print(f"[OK] Found {len(users)} users to update")

    except Exception as e:
        print(f"[ERROR] Failed to fetch users: {e}")
        return

    # Step 4: Update each user
    print(f"\n[4/4] Updating users...")
    updated_count = 0
    failed_count = 0

    for user in users:
        user_id = user.get('auth_user_id')
        email = user.get('email', 'unknown')

        try:
            # Update with admin's data
            supabase.table("user_profiles").update(data_to_copy).eq("auth_user_id", user_id).execute()
            updated_count += 1
            print(f"[OK] Updated: {email}")

        except Exception as e:
            failed_count += 1
            print(f"[ERROR] Failed to update {email}: {e}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Copy complete!")
    print(f"  [OK] Updated: {updated_count} users")
    print(f"  [ERROR] Failed: {failed_count} users")
    print(f"  Total: {len(users)} users processed")
    print(f"{'='*60}")
    print(f"\nNext step: Users should refresh their browser to see the updated data.")

if __name__ == "__main__":
    copy_from_admin()
