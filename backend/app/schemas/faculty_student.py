from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, EmailStr

class FacultyCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    employee_id: Optional[str] = Field(None, alias="employeeId")
    designation: Optional[str] = None
    specialization: Optional[str] = None
    guide_quota: int = Field(5, alias="guideQuota", ge=0)
    roles: List[str] = Field(default_factory=lambda: ["guide"])
    department_id: Optional[UUID] = Field(None, alias="departmentId")

class FacultyResponse(BaseModel):
    id: UUID
    user_id: UUID = Field(..., serialization_alias="userId")
    email: str
    name: str
    employee_id: Optional[str] = Field(None, serialization_alias="employeeId")
    designation: Optional[str] = None
    specialization: Optional[str] = None
    guide_quota: int = Field(..., serialization_alias="guideQuota")
    is_active: bool = Field(..., serialization_alias="isActive")
    roles: List[str]

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class StudentCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    roll_no: str = Field(..., alias="rollNo")
    batch_id: UUID = Field(..., alias="batchId")
    section_id: UUID = Field(..., alias="sectionId")
    phone: Optional[str] = None
    department_id: Optional[UUID] = Field(None, alias="departmentId")

class StudentResponse(BaseModel):
    id: UUID
    user_id: UUID = Field(..., serialization_alias="userId")
    email: str
    name: str
    roll_no: str = Field(..., serialization_alias="rollNo")
    batch: Optional[str] = None
    section: Optional[str] = None
    is_active: bool = Field(..., serialization_alias="isActive")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
