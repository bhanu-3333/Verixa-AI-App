"""
Hospital Model — Placeholder
Represents hospital/medical communication data in MongoDB
Full implementation in Phase 3
"""

# Placeholder class — database fields will be defined in Phase 3
class HospitalModel:
    """
    Represents a hospital interaction document in MongoDB
    Fields to be implemented in Phase 3:
    - id: ObjectId
    - user_id: ObjectId (ref: UserModel)
    - hospital_name: str
    - department: str
    - communication_log: list[dict]
    - created_at: datetime
    """
    COLLECTION = "hospital_interactions"
