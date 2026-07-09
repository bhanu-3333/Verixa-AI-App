"""
Fix script: delete users with plain-text passwords (stored before Phase 3).
These cause passlib.exc.UnknownHashError on login.
"""
import asyncio
import sys
import re

sys.path.insert(0, '.')


async def fix():
    from app.database.database import db
    await db.connect()

    # Find all users
    all_users = await db.users.find({}).to_list(100)
    print(f"Total users: {len(all_users)}")

    deleted = 0
    kept = 0
    for user in all_users:
        hp = user.get("hashed_password", "")
        email = user.get("email", "")
        is_bcrypt = hp.startswith("$2b$") or hp.startswith("$2a$")

        if is_bcrypt:
            print(f"  KEEP  {email}  (bcrypt hash)")
            kept += 1
        else:
            await db.users.delete_one({"_id": user["_id"]})
            print(f"  DEL   {email}  (plain text: '{hp[:20]}...')")
            deleted += 1

    print(f"\nDone. Kept: {kept}  Deleted: {deleted}")
    print("You can now re-register deleted accounts with a fresh password.")


asyncio.run(fix())
