# backend/app/schemas/sign.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class LandmarkItem(BaseModel):
    x: float
    y: float
    z: float
    visibility: Optional[float] = None

class FrameHands(BaseModel):
    leftHand: Optional[List[LandmarkItem]] = Field(None, description="21 landmarks of Left hand or null if not detected")
    rightHand: Optional[List[LandmarkItem]] = Field(None, description="21 landmarks of Right hand or null if not detected")

class SignRecordRequest(BaseModel):
    phrase: str = Field(..., description="The label phrase in upper snake case, e.g. CAN_I_CALL_SOMEONE")
    sequence: List[FrameHands] = Field(..., description="Temporal sequence of frames containing hands data")

class SignPredictRequest(BaseModel):
    sequence: List[FrameHands] = Field(..., description="Temporal sequence of hands data for inference")
