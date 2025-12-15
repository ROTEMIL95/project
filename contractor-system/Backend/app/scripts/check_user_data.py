"""
Check what data users actually have in the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.config import settings
from supabase import create_client

def check_user_data():
    """Check user data in database"""
    print("Checking user data in database...")

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Fetch all users
    try:
        response = supabase.table("user_profiles").select("email, paint_items, tiling_items, demolition_items, plumbing_subcontractor_items, electrical_subcontractor_items, construction_subcontractor_items").execute()
        users = response.data

        print(f"\nFound {len(users)} users:\n")

        for user in users:
            email = user.get('email', 'unknown')
            print(f"\n{'='*60}")
            print(f"User: {email}")
            print(f"{'='*60}")

            # Check each category
            paint = user.get('paint_items', [])
            tiling = user.get('tiling_items', [])
            demolition = user.get('demolition_items', [])
            plumbing = user.get('plumbing_subcontractor_items', [])
            electrical = user.get('electrical_subcontractor_items', [])
            construction = user.get('construction_subcontractor_items', [])

            print(f"  Paint items: {len(paint) if paint else 0}")
            print(f"  Tiling items: {len(tiling) if tiling else 0}")
            print(f"  Demolition items: {len(demolition) if demolition else 0}")
            print(f"  Plumbing items: {len(plumbing) if plumbing else 0}")
            print(f"  Electrical items: {len(electrical) if electrical else 0}")
            print(f"  Construction items: {len(construction) if construction else 0}")

            # Show first paint item if exists (keys only)
            if paint and len(paint) > 0:
                print(f"\n  Sample paint item keys: {list(paint[0].keys())}")

            # Show first plumbing item if exists (keys only)
            if plumbing and len(plumbing) > 0:
                print(f"\n  Sample plumbing item keys: {list(plumbing[0].keys())}")

    except Exception as e:
        print(f"Error fetching users: {e}")

if __name__ == "__main__":
    check_user_data()
