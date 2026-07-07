"""
Bank Model — Placeholder
Represents banking communication data in MongoDB
Full implementation in Phase 3
"""

# Placeholder class — database fields will be defined in Phase 3
class BankModel:
    """
    Represents a bank interaction document in MongoDB
    Fields to be implemented in Phase 3:
    - id: ObjectId
    - user_id: ObjectId (ref: UserModel)
    - bank_name: str
    - transaction_context: str
    - communication_log: list[dict]
    - created_at: datetime
    """
    COLLECTION = "bank_interactions"
