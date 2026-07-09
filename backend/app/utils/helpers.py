"""
Verixa AI — Shared Utility Helpers
"""

from bson import ObjectId
from datetime import datetime
from typing import Any


def str_to_objectid(id_str: str) -> ObjectId:
    """Convert a string to BSON ObjectId, raise ValueError if invalid."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError(f"'{id_str}' is not a valid ObjectId")


def _serialize_value(v: Any) -> Any:
    """Recursively convert a single value to a JSON-safe type."""
    if isinstance(v, ObjectId):
        return str(v)
    if isinstance(v, datetime):
        return v.isoformat()
    if isinstance(v, dict):
        return serialize_doc(v)
    if isinstance(v, list):
        return [_serialize_value(i) for i in v]
    return v


def serialize_doc(doc: dict) -> dict:
    """
    Convert a MongoDB document to a fully JSON-serialisable dict.
    Handles: ObjectId → str, datetime → ISO string, nested dicts/lists.
    """
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        key = "id" if k == "_id" else k
        result[key] = _serialize_value(v)
    return result


def serialize_docs(docs: list) -> list:
    """Serialize a list of MongoDB documents."""
    return [serialize_doc(d) for d in docs]
