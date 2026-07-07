"""
MongoDB Connection Module
Initializes the async MongoDB client using Motor
Only handles connection lifecycle — no CRUD operations here
"""

from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure
from app.config.config import settings


class Database:
    """
    Database connection handler
    Manages MongoDB client lifecycle (connect / disconnect)
    """

    def __init__(self):
        self.client: AsyncIOMotorClient = None
        self.db = None

    async def connect(self):
        """
        Establish connection to MongoDB
        Called during FastAPI application startup
        """
        try:
            # Create the async MongoDB client
            self.client = AsyncIOMotorClient(settings.MONGODB_URL)
            
            # Get the specific database (creates it lazily if not exists)
            self.db = self.client[settings.DATABASE_NAME]
            
            # Verify connection is alive
            await self.client.admin.command("ping")
            
            print(f"[Database] Connected to MongoDB at: {settings.MONGODB_URL}")
            print(f"[Database] Using database: {settings.DATABASE_NAME}")
            
        except ConnectionFailure as e:
            print(f"[Database] Failed to connect to MongoDB: {e}")
            raise
        except Exception as e:
            print(f"[Database] Unexpected error during connection: {e}")
            raise

    async def disconnect(self):
        """
        Close the MongoDB connection
        Called during FastAPI application shutdown
        """
        if self.client:
            self.client.close()
            print("[Database] MongoDB connection closed")

    def get_db(self):
        """
        Return the active database instance
        Used by repositories and services to get collection handles
        """
        return self.db

    def get_collection(self, collection_name: str):
        """
        Return a specific collection from the database
        Usage: db.get_collection("users")
        """
        if self.db is None:
            raise RuntimeError("Database is not connected. Call connect() first.")
        return self.db[collection_name]


# Singleton database instance shared across the app
db = Database()
