from fastapi import HTTPException, Header
from app.database import get_supabase_anon
from typing import Optional


async def get_current_user(
    authorization: Optional[str] = Header(None),
) -> str:
    """
    FastAPI dependency: extracts and validates Supabase JWT.
    Returns the authenticated user_id (UUID string).

    Usage in route handlers:
        @router.get("/something")
        async def my_route(user_id: str = Depends(get_current_user)):
            ...
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid authorization header",
        )

    token = authorization.removeprefix("Bearer ")

    try:
        supabase = get_supabase_anon()
        response = supabase.auth.get_user(token)
        if response.user is None:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token",
            )
        return str(response.user.id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}",
        )
