"""
Auth Service — Placeholder
Business logic for user authentication
Full implementation in Phase 3
"""


async def login_user(email: str, password: str) -> dict:
    """
    Authenticate a user with email and password
    Phase 3: Will verify hashed password and return JWT token
    Phase 3: Will query MongoDB users collection
    """
    # Placeholder — full logic in Phase 3
    return {
        "message": "login_user service placeholder",
        "user_id": None,
        "token": None
    }


async def register_user(name: str, email: str, password: str) -> dict:
    """
    Register a new user
    Phase 3: Will hash password, store in MongoDB, return user ID
    """
    # Placeholder — full logic in Phase 3
    return {
        "message": "register_user service placeholder",
        "user_id": None
    }


async def logout_user(user_id: str) -> dict:
    """
    Logout a user and invalidate their session
    Phase 3: Will invalidate JWT / clear session
    """
    # Placeholder — full logic in Phase 3
    return {"message": "logout_user service placeholder"}
