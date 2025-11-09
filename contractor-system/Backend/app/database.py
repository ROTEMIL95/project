from supabase import create_client, Client
from app.config import settings
import httpx


# Initialize Supabase client
supabase: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)

# Admin client (for operations that bypass RLS)
supabase_admin: Client = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_SERVICE_KEY
)

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
