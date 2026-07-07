"""
Chat Model — Placeholder
Represents a chat/translation session in MongoDB
Full implementation in Phase 3
"""

# Placeholder class — database fields will be defined in Phase 3
class ChatModel:
    """
    Represents a chat session document in MongoDB
    Fields to be implemented in Phase 3:
    - id: ObjectId
    - user_id: ObjectId (ref: UserModel)
    - source_language: str
    - target_language: str
    - messages: list[dict]
    - created_at: datetime
    """
    COLLECTION = "chats"
