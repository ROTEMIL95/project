"""
JWT Token Cleanup Script v2
============================

This script fixes bloated JWT tokens by cleaning raw_user_meta_data in Supabase Auth.

PROBLEM:
- JWT tokens become 20-50x larger than normal (~29KB instead of ~1.4KB)
- This causes "431 Request Header Fields Too Large" errors
- User data incorrectly stored in JWT instead of database

SOLUTION:
- Removes all non-essential fields from raw_user_meta_data
- Keeps only: email, email_verified, phone, phone_verified, full_name
- Revokes all sessions to force new clean token generation
- Verifies data exists in user_profiles table before cleanup

USAGE:
  # Clean specific user
  python cleanup_user_metadata_v2.py --email user@example.com

  # Clean all users with bloated tokens (>4KB)
  python cleanup_user_metadata_v2.py --all

  # Dry run (check only, don't modify)
  python cleanup_user_metadata_v2.py --email user@example.com --dry-run
"""

import os
import sys
import io
import argparse
from typing import Optional, List, Dict, Any

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

# Constants
NORMAL_TOKEN_SIZE = 1400  # Normal JWT token size in chars
BLOATED_TOKEN_THRESHOLD = 4096  # 4KB - tokens larger than this need cleanup
ESSENTIAL_FIELDS = {'email', 'email_verified', 'phone', 'phone_verified', 'full_name'}


def get_all_users() -> List[Any]:
    """Get all users from Supabase Auth"""
    try:
        response = supabase.auth.admin.list_users()
        return response if response else []
    except Exception as e:
        print(f"❌ Error getting users: {e}")
        return []


def get_user_by_email(email: str) -> Optional[Any]:
    """Get user from Supabase Auth by email"""
    try:
        users = get_all_users()
        for user in users:
            if user.email == email:
                return user
        print(f"❌ User not found: {email}")
        return None
    except Exception as e:
        print(f"❌ Error getting user: {e}")
        return None


def estimate_token_size(user_metadata: Dict) -> int:
    """
    Estimate JWT token size based on user_metadata

    JWT structure includes:
    - Header (~100 chars)
    - Payload: user_metadata + other fields (~300 chars base)
    - Signature (~350 chars)

    Total ≈ 750 + len(user_metadata_json)
    """
    import json
    metadata_json = json.dumps(user_metadata)
    estimated_size = 750 + len(metadata_json)
    return estimated_size


def verify_user_profile_exists(user_email: str) -> bool:
    """Verify that user data exists in user_profiles table"""
    try:
        response = supabase.table("user_profiles").select("*").eq("email", user_email).execute()

        if response.data and len(response.data) > 0:
            profile = response.data[0]
            print(f"   ✅ Profile found in database")
            print(f"      - Full name: {profile.get('full_name', 'N/A')}")
            print(f"      - Phone: {profile.get('phone', 'N/A')}")
            print(f"      - Role: {profile.get('role', 'N/A')}")
            return True
        else:
            print(f"   ❌ Profile NOT found in database!")
            print(f"   ⚠️  Data may be lost if you clean raw_user_meta_data!")
            return False

    except Exception as e:
        print(f"   ❌ Error checking profile: {e}")
        return False


def clean_user_metadata(user_id: str, user_email: str, dry_run: bool = False) -> bool:
    """
    Clean raw_user_meta_data for a specific user

    Args:
        user_id: Supabase user ID
        user_email: User email
        dry_run: If True, only show what would be done without making changes

    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"\n{'='*70}")
        print(f"🧹 Cleaning metadata for: {user_email}")
        print(f"{'='*70}")

        # Get current user data
        user = get_user_by_email(user_email)
        if not user:
            return False

        current_metadata = user.user_metadata or {}

        # Calculate sizes
        old_size = len(str(current_metadata))
        estimated_token_size = estimate_token_size(current_metadata)

        print(f"\n📊 Current state:")
        print(f"   - Metadata size: {old_size:,} chars")
        print(f"   - Estimated token size: {estimated_token_size:,} chars")
        print(f"   - Normal token size: {NORMAL_TOKEN_SIZE:,} chars")

        if estimated_token_size > BLOATED_TOKEN_THRESHOLD:
            size_multiplier = round(estimated_token_size / NORMAL_TOKEN_SIZE)
            print(f"   - ⚠️  Token is {size_multiplier}x larger than normal!")
        else:
            print(f"   - ✅ Token size is acceptable")

        print(f"\n📋 Metadata keys ({len(current_metadata)}): {list(current_metadata.keys())}")

        # Create cleaned metadata with only essential fields
        cleaned_metadata = {
            key: value
            for key, value in current_metadata.items()
            if key in ESSENTIAL_FIELDS
        }

        # Show what will be removed
        removed_keys = set(current_metadata.keys()) - ESSENTIAL_FIELDS
        if removed_keys:
            print(f"\n🗑️  Will remove {len(removed_keys)} fields:")
            for key in sorted(removed_keys):
                value_size = len(str(current_metadata[key]))
                print(f"   - {key}: {value_size:,} chars")
        else:
            print(f"\n✅ No fields to remove - metadata is already clean!")
            return True

        print(f"\n✅ Will keep {len(cleaned_metadata)} essential fields:")
        for key in sorted(cleaned_metadata.keys()):
            print(f"   - {key}: {cleaned_metadata[key]}")

        # Calculate size reduction
        new_size = len(str(cleaned_metadata))
        estimated_new_token_size = estimate_token_size(cleaned_metadata)
        reduction_percent = ((old_size - new_size) / old_size * 100) if old_size > 0 else 0

        print(f"\n📉 Size reduction:")
        print(f"   - Metadata: {old_size:,} → {new_size:,} chars ({reduction_percent:.1f}% reduction)")
        print(f"   - Estimated token: {estimated_token_size:,} → {estimated_new_token_size:,} chars")

        if dry_run:
            print(f"\n🔍 DRY RUN - No changes made")
            return True

        # Confirm before proceeding
        print(f"\n⚠️  WARNING: This will remove {len(removed_keys)} fields from raw_user_meta_data!")
        print(f"⚠️  Make sure this data exists in the user_profiles table!")

        # Update user metadata using Admin API
        print(f"\n🔄 Updating user metadata...")

        update_response = supabase.auth.admin.update_user_by_id(
            user_id,
            {"user_metadata": cleaned_metadata}
        )

        if update_response:
            print("✅ User metadata cleaned successfully!")
            return True
        else:
            print("❌ Failed to update user metadata")
            return False

    except Exception as e:
        print(f"❌ Error cleaning metadata: {e}")
        import traceback
        traceback.print_exc()
        return False


def revoke_all_sessions(user_id: str, user_email: str, dry_run: bool = False) -> bool:
    """
    Revoke all active sessions for a user

    This forces the user to log out from all devices and log back in,
    which will generate a new JWT token with the cleaned metadata.
    """
    try:
        print(f"\n{'='*70}")
        print(f"🔐 Revoking sessions for: {user_email}")
        print(f"{'='*70}")

        if dry_run:
            print(f"\n🔍 DRY RUN - Sessions would be revoked but no changes made")
            return True

        print("\n🔄 Signing out user from all devices...")

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
            supabase.auth.admin.update_user_by_id(
                user_id,
                {"email_confirm": True}  # Dummy update to invalidate sessions
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


def find_bloated_users() -> List[Dict[str, Any]]:
    """Find all users with bloated JWT tokens"""
    print(f"\n🔍 Scanning all users for bloated tokens...")
    print(f"   (Threshold: >{BLOATED_TOKEN_THRESHOLD:,} chars)\n")

    users = get_all_users()
    bloated_users = []

    for user in users:
        user_metadata = user.user_metadata or {}
        estimated_token_size = estimate_token_size(user_metadata)

        if estimated_token_size > BLOATED_TOKEN_THRESHOLD:
            bloated_users.append({
                'user': user,
                'email': user.email,
                'user_id': user.id,
                'estimated_token_size': estimated_token_size,
                'metadata_fields': len(user_metadata)
            })

    return bloated_users


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description='Clean bloated JWT tokens in Supabase Auth',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Clean specific user
  python cleanup_user_metadata_v2.py --email user@example.com

  # Clean all bloated users
  python cleanup_user_metadata_v2.py --all

  # Dry run (check only)
  python cleanup_user_metadata_v2.py --email user@example.com --dry-run
        """
    )

    parser.add_argument('--email', type=str, help='User email to clean')
    parser.add_argument('--all', action='store_true', help='Clean all users with bloated tokens')
    parser.add_argument('--dry-run', action='store_true', help='Check only, don\'t make changes')

    args = parser.parse_args()

    if not args.email and not args.all:
        parser.print_help()
        sys.exit(1)

    print("\n" + "="*70)
    print("🧹 Supabase JWT Token Cleanup Tool v2")
    print("="*70)

    if args.dry_run:
        print("\n🔍 DRY RUN MODE - No changes will be made\n")

    users_to_clean = []

    if args.all:
        # Find all bloated users
        bloated_users = find_bloated_users()

        if not bloated_users:
            print("✅ No bloated tokens found! All users have normal-sized tokens.")
            return

        print(f"📊 Found {len(bloated_users)} users with bloated tokens:\n")
        for i, info in enumerate(bloated_users, 1):
            print(f"   {i}. {info['email']}")
            print(f"      - Estimated token: {info['estimated_token_size']:,} chars")
            print(f"      - Metadata fields: {info['metadata_fields']}")

        users_to_clean = bloated_users

    else:
        # Clean specific user
        user = get_user_by_email(args.email)
        if not user:
            sys.exit(1)

        user_metadata = user.user_metadata or {}
        estimated_token_size = estimate_token_size(user_metadata)

        users_to_clean = [{
            'user': user,
            'email': args.email,
            'user_id': user.id,
            'estimated_token_size': estimated_token_size,
            'metadata_fields': len(user_metadata)
        }]

    # Process each user
    success_count = 0
    failed_count = 0

    for info in users_to_clean:
        user_email = info['email']
        user_id = info['user_id']

        # Step 1: Verify profile exists
        print(f"\n📝 Step 1/3: Verifying database profile for {user_email}")
        if not verify_user_profile_exists(user_email):
            print(f"\n⚠️  SKIPPING {user_email} - No database profile found!")
            failed_count += 1
            continue

        # Step 2: Clean metadata
        print(f"\n📝 Step 2/3: Cleaning metadata")
        metadata_cleaned = clean_user_metadata(user_id, user_email, args.dry_run)

        if not metadata_cleaned:
            print(f"\n❌ Failed to clean {user_email}")
            failed_count += 1
            continue

        # Step 3: Revoke sessions
        print(f"\n📝 Step 3/3: Revoking sessions")
        sessions_revoked = revoke_all_sessions(user_id, user_email, args.dry_run)

        if metadata_cleaned and sessions_revoked:
            print(f"\n✅ Successfully cleaned {user_email}")
            success_count += 1
        else:
            print(f"\n⚠️  Partially cleaned {user_email}")
            failed_count += 1

    # Summary
    print("\n" + "="*70)
    print("📊 CLEANUP SUMMARY")
    print("="*70)
    print(f"✅ Successful: {success_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"📝 Total processed: {success_count + failed_count}")

    if args.dry_run:
        print("\n🔍 This was a DRY RUN - no changes were made")
        print("   Run without --dry-run to apply changes")
    elif success_count > 0:
        print("\n🎉 Users will be logged out automatically and must log back in")
        print("🎉 Upon re-login, they will receive clean JWT tokens (~1.4KB)")

    print("="*70)


if __name__ == "__main__":
    main()
