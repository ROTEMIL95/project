"""
Check the most recently created user to see what data they received
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.config import settings
from supabase import create_client

def check_latest_user():
    """Check the most recently created user"""
    print("Checking latest user...")

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Fetch latest user (by created_at)
    try:
        response = supabase.table("user_profiles").select("*").order("created_at", desc=True).limit(1).execute()

        if not response.data or len(response.data) == 0:
            print("No users found!")
            return

        user = response.data[0]
        email = user.get('email', 'unknown')

        print(f"\n{'='*60}")
        print(f"Latest user: {email}")
        print(f"Created at: {user.get('created_at')}")
        print(f"{'='*60}")

        # Check each category
        paint = user.get('paint_items', [])
        tiling = user.get('tiling_items', [])
        demolition = user.get('demolition_items', [])
        plumbing = user.get('plumbing_subcontractor_items', [])
        electrical = user.get('electrical_subcontractor_items', [])
        construction = user.get('construction_subcontractor_items', [])

        print(f"\nData counts:")
        print(f"  Paint items: {len(paint) if paint else 0}")
        print(f"  Tiling items: {len(tiling) if tiling else 0}")
        print(f"  Demolition items: {len(demolition) if demolition else 0}")
        print(f"  Plumbing items: {len(plumbing) if plumbing else 0}")
        print(f"  Electrical items: {len(electrical) if electrical else 0}")
        print(f"  Construction items: {len(construction) if construction else 0}")

        # Show defaults
        print(f"\nDefaults:")
        print(f"  Paint defaults: {user.get('paint_user_defaults', {})}")
        print(f"  Tiling defaults: {user.get('tiling_user_defaults', {})}")
        print(f"  Demolition defaults: {user.get('demolition_defaults', {})}")
        print(f"  Plumbing defaults: {user.get('plumbing_defaults', {})}")
        print(f"  Electrical defaults: {user.get('electrical_defaults', {})}")
        print(f"  Construction defaults: {user.get('construction_defaults', {})}")

        # Show sample items
        if paint and len(paint) > 0:
            print(f"\nSample paint item keys: {list(paint[0].keys())}")
        else:
            print(f"\n[WARNING] No paint items!")

        if plumbing and len(plumbing) > 0:
            print(f"Sample plumbing item keys: {list(plumbing[0].keys())}")
        else:
            print(f"[WARNING] No plumbing items!")

    except Exception as e:
        print(f"[ERROR] Failed to fetch user: {e}")

if __name__ == "__main__":
    check_latest_user()
