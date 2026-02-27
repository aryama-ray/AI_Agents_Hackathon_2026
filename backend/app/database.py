from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings


@lru_cache()
def get_supabase_anon() -> Client:
    """Client using anon key — respects RLS policies. Use in route handlers."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_key)


@lru_cache()
def get_supabase_admin() -> Client:
    """Client using service_role key — bypasses RLS. Use ONLY in agent tools and seed service."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def get_supabase() -> Client:
    """Deprecated: use get_supabase_anon() or get_supabase_admin() instead."""
    return get_supabase_anon()
