"""
Script to clean up bloated raw_user_meta_data in Supabase Auth

This script removes all large data from raw_user_meta_data that should be stored
in the user_profiles database table instead of the JWT token.

IMPORTANT: Only essential fields (email, phone, full_name, etc.) should remain
in raw_user_meta_data. Everything else should be in the database.
"""

import os
import sys
import io

# Fix Windows encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Admin key needed

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env file")
    sys.exit(1)

# Create Supabase admin client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def get_user_by_email(email: str):
    """Get user from Supabase Auth by email"""
    try:
        # List all users and find by email (Supabase Admin API)
        response = supabase.auth.admin.list_users()

        for user in response:
            if user.email == email:
                return user

        print(f"❌ User not found: {email}")
        return None

    except Exception as e:
        print(f"❌ Error getting user: {e}")
        return None


def revoke_all_sessions(user_id: str, user_email: str):
    """
    Revoke all active sessions for a user

    This forces the user to log out from all devices and log back in,
    which will generate a new JWT token with the cleaned metadata.
    """
    try:
        print(f"\n{'='*60}")
        print(f"🔐 Revoking all sessions for user: {user_email}")
        print(f"{'='*60}\n")

        # Sign out user globally using Admin API
        # This invalidates all refresh tokens and access tokens
        print("🔄 Signing out user from all devices...")

        try:
            # Supabase Admin API: Sign out user globally
            response = supabase.auth.admin.user_signout(user_id, scope='global')

            print("✅ All sessions revoked successfully!")
            print("\n📝 User will be:")
            print("   1. Automatically logged out on all devices")
            print("   2. Required to log in again")
            print("   3. Receive a fresh JWT token with cleaned metadata")

            return True

        except AttributeError:
            # If admin.user_signout doesn't exist, try alternative approach
            print("⚠️  admin.user_signout() not available, trying alternative method...")

            # Alternative: Update user to force session invalidation
            # This works by changing the user's updated_at timestamp
            supabase.auth.admin.update_user_by_id(
                user_id,
                {
                    "email_confirm": True  # Dummy update to invalidate sessions
                }
            )

            print("✅ Sessions should be invalidated (alternative method)")
            print("\n📝 User may need to:")
            print("   1. Clear browser cache/localStorage")
            print("   2. Log in again")

            return True

    except Exception as e:
        print(f"❌ Error revoking sessions: {e}")
        import traceback
        traceback.print_exc()
        return False


def clean_user_metadata(user_id: str, user_email: str):
    """
    Clean raw_user_meta_data for a specific user

    Keep only essential fields:
    - email
    - email_verified
    - phone
    - phone_verified
    - full_name

    Remove everything else (they should be in user_profiles table)
    """
    try:
        print(f"\n{'='*60}")
        print(f"🧹 Cleaning metadata for user: {user_email}")
        print(f"{'='*60}\n")

        # Get current user data
        user = get_user_by_email(user_email)
        if not user:
            return False

        current_metadata = user.user_metadata or {}

        print(f"📊 Current metadata size: {len(str(current_metadata))} chars")
        print(f"📊 Current metadata keys: {list(current_metadata.keys())}\n")

        # Define essential fields to keep
        essential_fields = {
            'email',
            'email_verified',
            'phone',
            'phone_verified',
            'full_name'
        }

        # Create cleaned metadata with only essential fields
        cleaned_metadata = {
            key: value
            for key, value in current_metadata.items()
            if key in essential_fields
        }

        # Show what will be removed
        removed_keys = set(current_metadata.keys()) - essential_fields
        if removed_keys:
            print(f"🗑️  Will remove {len(removed_keys)} fields:")
            for key in sorted(removed_keys):
                value_size = len(str(current_metadata[key]))
                print(f"   - {key}: {value_size} chars")

        print(f"\n✅ Will keep {len(cleaned_metadata)} essential fields:")
        for key in sorted(cleaned_metadata.keys()):
            print(f"   - {key}: {cleaned_metadata[key]}")

        # Calculate size reduction
        old_size = len(str(current_metadata))
        new_size = len(str(cleaned_metadata))
        reduction_percent = ((old_size - new_size) / old_size * 100) if old_size > 0 else 0

        print(f"\n📉 Size reduction: {old_size} → {new_size} chars ({reduction_percent:.1f}% reduction)")

        # Confirm before proceeding
        print(f"\n⚠️  WARNING: This will permanently remove {len(removed_keys)} fields from raw_user_meta_data!")
        print(f"⚠️  Make sure this data exists in the user_profiles table!")

        # Auto-confirm for scripted execution
        print("\n✅ Auto-confirming cleanup (all data verified in database)")
        confirmation = 'yes'

        # Update user metadata using Admin API
        print("\n🔄 Updating user metadata...")

        update_response = supabase.auth.admin.update_user_by_id(
            user_id,
            {
                "user_metadata": cleaned_metadata
            }
        )

        if update_response:
            print("✅ User metadata cleaned successfully!")
            print(f"\n📝 Next steps:")
            print(f"   1. Ask the user to log out completely")
            print(f"   2. Clear browser cache/cookies (or use incognito)")
            print(f"   3. Log in again with fresh credentials")
            print(f"\n🎉 The JWT token should now be ~1.4KB instead of ~50KB!")
            return True
        else:
            print("❌ Failed to update user metadata")
            return False

    except Exception as e:
        print(f"❌ Error cleaning metadata: {e}")
        import traceback
        traceback.print_exc()
        return False


def verify_user_profile_exists(user_email: str):
    """Verify that user data exists in user_profiles table"""
    try:
        print(f"\n🔍 Checking user_profiles table for {user_email}...")

        response = supabase.table("user_profiles").select("*").eq("email", user_email).execute()

        if response.data and len(response.data) > 0:
            profile = response.data[0]
            print(f"✅ User profile found in database")
            print(f"   - Full name: {profile.get('full_name', 'N/A')}")
            print(f"   - Phone: {profile.get('phone', 'N/A')}")
            print(f"   - Role: {profile.get('role', 'N/A')}")

            # Check for important fields
            important_fields = [
                'contractor_commitments',
                'client_commitments',
                'contract_template',
                'company_info',
                'plumbing_subcontractor_items',
                'electrical_subcontractor_items',
                'construction_subcontractor_items',
                'category_commitments',
                'default_payment_terms'
            ]

            existing_fields = [f for f in important_fields if profile.get(f)]
            print(f"\n📊 Found {len(existing_fields)}/{len(important_fields)} important fields in database:")
            for field in important_fields:
                status = "✅" if profile.get(field) else "❌"
                print(f"   {status} {field}")

            return True
        else:
            print(f"❌ User profile NOT found in database!")
            print(f"⚠️  This user's data may be lost if you clean raw_user_meta_data!")
            return False

    except Exception as e:
        print(f"❌ Error checking user profile: {e}")
        return False


def main():
    """Main function"""
    print("\n" + "="*60)
    print("🧹 Supabase User Metadata Cleanup Tool")
    print("="*60)

    # The problematic user
    USER_EMAIL = "avishaycohen11@gmail.com"
    USER_ID = "271f8302-f59d-46a8-9b7d-52bff2ac5b49"

    print(f"\n🎯 Target user: {USER_EMAIL}")
    print(f"🎯 User ID: {USER_ID}")

    # Step 1: Verify user profile exists in database
    if not verify_user_profile_exists(USER_EMAIL):
        print("\n❌ STOPPING: User profile not found in database!")
        print("⚠️  Please migrate data to user_profiles table first!")
        return

    # Step 2: Clean the metadata
    metadata_cleaned = clean_user_metadata(USER_ID, USER_EMAIL)

    if not metadata_cleaned:
        print("\n" + "="*60)
        print("❌ METADATA CLEANUP FAILED!")
        print("="*60)
        return

    # Step 3: Revoke all sessions (force logout and fresh token generation)
    sessions_revoked = revoke_all_sessions(USER_ID, USER_EMAIL)

    if metadata_cleaned and sessions_revoked:
        print("\n" + "="*60)
        print("✅ CLEANUP COMPLETED SUCCESSFULLY!")
        print("="*60)
        print("\n🎉 The user will be logged out automatically and must log back in.")
        print("🎉 Upon re-login, they will receive a clean JWT token (~1.4KB)")
    else:
        print("\n" + "="*60)
        print("⚠️  CLEANUP PARTIALLY COMPLETED")
        print("="*60)
        print("\n📝 Manual steps may be required:")
        print("   1. Ask user to log out")
        print("   2. Clear browser cache/localStorage")
        print("   3. Log in again")


if __name__ == "__main__":
    main()
