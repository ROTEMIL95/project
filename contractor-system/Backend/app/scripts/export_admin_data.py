"""
Export admin user data to see what we should copy
"""
import sys
import json
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.config import settings
from supabase import create_client

def export_admin_data():
    """Export admin user data"""
    print("Exporting admin user data...")

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

    # Fetch admin user
    try:
        response = supabase.table("user_profiles").select("*").eq("email", "rotemiluz53@gmail.com").execute()

        if not response.data or len(response.data) == 0:
            print("Admin user not found!")
            return

        admin = response.data[0]

        print(f"\n[OK] Found admin user: {admin.get('email')}")

        # Fields we want to export
        fields_to_export = {
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

        # Print counts
        print("\nAdmin data counts:")
        print(f"  Plumbing items: {len(fields_to_export['plumbing_subcontractor_items'])}")
        print(f"  Electrical items: {len(fields_to_export['electrical_subcontractor_items'])}")
        print(f"  Construction items: {len(fields_to_export['construction_subcontractor_items'])}")
        print(f"  Demolition items: {len(fields_to_export['demolition_items'])}")
        print(f"  Paint items: {len(fields_to_export['paint_items'])}")
        print(f"  Tiling items: {len(fields_to_export['tiling_items'])}")

        # Print sample items (keys only to avoid encoding issues)
        if fields_to_export['paint_items']:
            print(f"\nSample paint item keys: {list(fields_to_export['paint_items'][0].keys())}")

        if fields_to_export['tiling_items']:
            print(f"Sample tiling item keys: {list(fields_to_export['tiling_items'][0].keys())}")

        if fields_to_export['demolition_items']:
            print(f"Sample demolition item keys: {list(fields_to_export['demolition_items'][0].keys())}")

        # Save to file
        output_path = Path(__file__).parent.parent / 'data' / 'admin_exported_data.json'
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(fields_to_export, f, indent=2, ensure_ascii=False)

        print(f"\n[OK] Admin data exported to: {output_path}")

    except Exception as e:
        print(f"[ERROR] Failed to export admin data: {e}")

if __name__ == "__main__":
    export_admin_data()
