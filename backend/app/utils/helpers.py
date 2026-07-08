"""
Verixa AI — Shared Utility Helpers
"""

from bson import ObjectId
from typing import Any


def str_to_objectid(id_str: str) -> ObjectId:
    """Convert a string to BSON ObjectId, raise ValueError if invalid."""
    try:
        return ObjectId(id_str)
    except Exception:
        raise ValueError(f"'{id_str}' is not a valid ObjectId")


def serialize_doc(doc: dict) -> dict:
    """
    Convert a MongoDB document to a JSON-serialisable dict.
    Turns ObjectId fields into plain strings.
    """
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == "_id":
            result["id"] = str(v)
        elif isinstance(v, ObjectId):
            result[k] = str(v)
        else:
            result[k] = v
    return result


def serialize_docs(docs: list) -> list:
    """Serialize a list of MongoDB documents."""
    return [serialize_doc(d) for d in docs]
