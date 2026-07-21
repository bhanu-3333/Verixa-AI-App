# backend/app/schemas/scheme.py
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class LocalizedText(BaseModel):
    en: str
    ta: str

class LocalizedList(BaseModel):
    en: List[str]
    ta: List[str]

class SchemeModel(BaseModel):
    id: str = Field(..., description="Unique scheme identifier")
    name: LocalizedText
    shortDescription: LocalizedText
    category: str = Field(..., description="Category: financial, education, employment, assistive_devices, healthcare, travel, social_welfare, certification")
    governmentLevel: str = Field(..., description="Level: central, state_tn")
    department: LocalizedText
    eligibility: LocalizedList
    benefits: LocalizedList
    documents: LocalizedList
    applicationSteps: LocalizedList
    applicableDisabilities: LocalizedList
    officialInfoUrl: str
    officialApplyUrl: Optional[str] = None
    sourceName: str
    lastVerifiedAt: str
    status: str = Field("Check official portal for current availability", description="Application or availability status")
    importantDates: Optional[LocalizedText] = None

class SchemeListResponse(BaseModel):
    status: str = "success"
    message: str
    data: List[SchemeModel]
    total: int

class SchemeDetailResponse(BaseModel):
    status: str = "success"
    message: str
    data: SchemeModel
