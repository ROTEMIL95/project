from supabase import create_client, Client
from app.config import settings
import httpx
import os
import logging

logger = logging.getLogger(__name__)

# CRITICAL FIX: Disable HTTP/2 to prevent ConnectionTerminated errors
# This must be set BEFORE creating any httpx clients or Supabase clients
# Issue: HTTP/2 connections to Supabase Auth API randomly terminate (error_code:1)
# Solution: Force HTTP/1.1 for all httpx connections
os.environ['HTTPCORE_HTTP2'] = '0'

logger.info("🔧 HTTP/2 disabled globally for all httpx connections (HTTPCORE_HTTP2=0)")

# Create custom HTTP client for Supabase with explicit HTTP/2 disabled
# This is a defense-in-depth approach (both env var + explicit config)
supabase_http_client = httpx.Client(
    http2=False,  # Explicitly disable HTTP/2
    timeout=30.0,  # Longer timeout for auth requests (prevent timeouts)
    follow_redirects=True,
    limits=httpx.Limits(
        max_keepalive_connections=20,
        max_connections=50,
        keepalive_expiry=30.0
    )
)

logger.info(f"✅ Created custom HTTP client: http2=False, timeout={supabase_http_client.timeout}")

# Initialize Supabase client (without options - they cause AttributeError)
# We'll patch the HTTP client after creation
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

# Patch the Supabase client to use our custom HTTP client
# This is necessary because create_client doesn't accept http_client directly
try:
    if hasattr(supabase, 'auth') and hasattr(supabase.auth, '_http_client'):
        supabase.auth._http_client = supabase_http_client
        logger.info("✅ Patched supabase.auth to use custom HTTP client")
except Exception as e:
    logger.warning(f"⚠️ Could not patch supabase.auth: {e}")

try:
    if hasattr(supabase, 'postgrest') and hasattr(supabase.postgrest, '_client'):
        original_client = supabase.postgrest._client
        # Replace the session within the postgrest client
        if hasattr(original_client, '_session'):
            original_client._session = supabase_http_client
            logger.info("✅ Patched supabase.postgrest._client._session to use custom HTTP client")
except Exception as e:
    logger.warning(f"⚠️ Could not patch supabase.postgrest: {e}")

# Admin client (for operations that bypass RLS)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

# Patch admin client too
try:
    if hasattr(supabase_admin, 'auth') and hasattr(supabase_admin.auth, '_http_client'):
        supabase_admin.auth._http_client = supabase_http_client
        logger.info("✅ Patched supabase_admin.auth to use custom HTTP client")
except Exception as e:
    logger.warning(f"⚠️ Could not patch supabase_admin.auth: {e}")

try:
    if hasattr(supabase_admin, 'postgrest') and hasattr(supabase_admin.postgrest, '_client'):
        original_client = supabase_admin.postgrest._client
        if hasattr(original_client, '_session'):
            original_client._session = supabase_http_client
            logger.info("✅ Patched supabase_admin.postgrest._client._session to use custom HTTP client")
except Exception as e:
    logger.warning(f"⚠️ Could not patch supabase_admin.postgrest: {e}")

# HTTP client for external API calls (with HTTP/2 disabled for compatibility)
# Use this for any external HTTP requests (not Supabase - that has its own client)
# HTTP/2 is disabled to prevent connection issues with some servers
http_client = httpx.Client(
    http2=False,      # Disable HTTP/2 for better compatibility
    timeout=5.0,      # 5 second timeout for external requests
    follow_redirects=True,
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
)

# Async version for async endpoints
http_async_client = httpx.AsyncClient(
    http2=False,
    timeout=5.0,
    follow_redirects=True,
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
)


def get_supabase() -> Client:
    """Dependency for getting Supabase client"""
    return supabase


def get_supabase_admin() -> Client:
    """Dependency for getting Supabase admin client"""
    return supabase_admin


def get_http_client() -> httpx.Client:
    """Dependency for getting httpx sync client for external API calls"""
    return http_client


def get_http_async_client() -> httpx.AsyncClient:
    """Dependency for getting httpx async client for external API calls"""
    return http_async_client
