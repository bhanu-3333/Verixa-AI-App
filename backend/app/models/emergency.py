"""
Emergency Model — Placeholder
Represents emergency communication data in MongoDB
Full implementation in Phase 3
"""

# Placeholder class — database fields will be defined in Phase 3
class EmergencyModel:
    """
    Represents an emergency interaction document in MongoDB
    Fields to be implemented in Phase 3:
    - id: ObjectId
    - user_id: ObjectId (ref: UserModel)
    - emergency_type: str  (medical / fire / police)
    - location: dict       (lat, lng)
    - communication_log: list[dict]
    - resolved: bool
    - created_at: datetime
    """
    COLLECTION = "emergency_interactions"
