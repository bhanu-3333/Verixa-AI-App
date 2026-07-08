"""
Verixa AI — MongoDB Connection & Collection Manager
Uses Motor (async PyMongo driver) for non-blocking database I/O.

Responsibilities:
  • Connect / disconnect lifecycle
  • Auto-create all required collections on startup
  • Expose typed collection accessors used by services
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase, AsyncIOMotorCollection
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from app.config.config import settings
from app.utils.logger import db_logger


class Database:
    """
    Single shared MongoDB connection.
    Instantiated once and imported as `db` everywhere.
    """

    def __init__(self):
        self.client: AsyncIOMotorClient   = None
        self.db:     AsyncIOMotorDatabase = None

    # ──────────────────────────────────────────────────────────────────────────
    # Lifecycle
    # ──────────────────────────────────────────────────────────────────────────

    async def connect(self):
        """
        Open the MongoDB connection and verify it with a ping.
        Called from FastAPI lifespan startup.
        """
        try:
            db_logger.info(f"Connecting to MongoDB: {settings.MONGO_URI}")
            self.client = AsyncIOMotorClient(
                settings.MONGO_URI,
                serverSelectionTimeoutMS=5000,   # fail fast if unreachable
            )
            self.db = self.client[settings.DATABASE_NAME]

            # Verify connection
            await self.client.admin.command("ping")
            db_logger.info(f"MongoDB connected — database: '{settings.DATABASE_NAME}'")

            # Auto-create collections
            await self._ensure_collections()

        except (ConnectionFailure, ServerSelectionTimeoutError) as exc:
            db_logger.error(f"MongoDB connection FAILED: {exc}")
            raise
        except Exception as exc:
            db_logger.error(f"Unexpected DB error: {exc}")
            raise

    async def disconnect(self):
        """Close the connection. Called from FastAPI lifespan shutdown."""
        if self.client:
            self.client.close()
            db_logger.info("MongoDB connection closed")

    # ──────────────────────────────────────────────────────────────────────────
    # Collection bootstrap
    # ──────────────────────────────────────────────────────────────────────────

    async def _ensure_collections(self):
        """
        Create all required collections if they don't exist yet.
        MongoDB creates collections lazily on first insert, but explicit
        creation lets us add validators / indexes later without migration pain.
        """
        required = [
            settings.COL_USERS,
            settings.COL_TRANSLATIONS,
            settings.COL_HOSPITAL_HISTORY,
            settings.COL_BANK_HISTORY,
            settings.COL_EMERGENCY_CONTACTS,
            settings.COL_CHAT_HISTORY,
            settings.COL_APP_SETTINGS,
        ]
        existing = await self.db.list_collection_names()
        for name in required:
            if name not in existing:
                await self.db.create_collection(name)
                db_logger.info(f"  Created collection: '{name}'")
            else:
                db_logger.info(f"  Collection exists:  '{name}'")

    # ──────────────────────────────────────────────────────────────────────────
    # Collection accessors (typed helpers used by services)
    # ──────────────────────────────────────────────────────────────────────────

    def _col(self, name: str) -> AsyncIOMotorCollection:
        if self.db is None:
            raise RuntimeError("Database is not initialised. connect() must be called first.")
        return self.db[name]

    @property
    def users(self)              -> AsyncIOMotorCollection: return self._col(settings.COL_USERS)
    @property
    def translations(self)       -> AsyncIOMotorCollection: return self._col(settings.COL_TRANSLATIONS)
    @property
    def hospital_history(self)   -> AsyncIOMotorCollection: return self._col(settings.COL_HOSPITAL_HISTORY)
    @property
    def bank_history(self)       -> AsyncIOMotorCollection: return self._col(settings.COL_BANK_HISTORY)
    @property
    def emergency_contacts(self) -> AsyncIOMotorCollection: return self._col(settings.COL_EMERGENCY_CONTACTS)
    @property
    def chat_history(self)       -> AsyncIOMotorCollection: return self._col(settings.COL_CHAT_HISTORY)
    @property
    def app_settings(self)       -> AsyncIOMotorCollection: return self._col(settings.COL_APP_SETTINGS)


# ── Singleton ──────────────────────────────────────────────────────────────────
db = Database()
